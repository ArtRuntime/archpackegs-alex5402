import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Missing or invalid Authorization header' }, { status: 401 });
    }

    const providedKey = authHeader.substring(7);

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || 'alex-aur-packages');

    // Authenticate using the admin user's API key
    const adminUser = await db.collection('users').findOne({});
    if (!adminUser || !adminUser.webhookApiKey || adminUser.webhookApiKey !== providedKey) {
      return NextResponse.json({ success: false, error: 'Invalid API Key' }, { status: 401 });
    }

    const masterRepo = adminUser.masterRepo || 'ArtRuntime/alex-repo-packegs';

    // === Core alex-repo Sync Logic ===
    const ghResponse = await fetch(`https://api.github.com/repos/${masterRepo}/releases/tags/latest`, {
      headers: {
        'User-Agent': 'Custom-Arch-Mirror',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!ghResponse.ok) {
      return NextResponse.json({ success: false, error: `Failed to contact GitHub API for ${masterRepo}.` }, { status: 500 });
    }

    const releaseData = await ghResponse.json();

    // 1. Fetch versions.json
    const versionsAsset = (releaseData.assets || []).find((a: any) => a.name === 'versions.json');
    let versions: Record<string, string> = {};
    let fallbackAssets: Record<string, number> = {};
    
    if (versionsAsset) {
      const vRes = await fetch(versionsAsset.browser_download_url);
      if (vRes.ok) {
        const parsed = await vRes.json();
        fallbackAssets = parsed.assets || {};
        delete parsed.assets;
        versions = parsed;
      }
    }

    // 2. Map all assets from GitHub API
    const ghAssets = releaseData.assets || [];

    // 3. Extract Database Files
    const dbFileNames = ['alex-repo.db', 'alex-repo.db.tar.gz', 'alex-repo.files', 'alex-repo.files.tar.gz'];
    const dbAssets = dbFileNames.map(name => {
      const ghAsset = ghAssets.find((a: any) => a.name === name);
      const size = ghAsset ? ghAsset.size : (fallbackAssets[name] || 0);
      return { name, size };
    }).filter(a => a.size > 0);

    // 4. Upsert every package into the database
    let syncedCount = 0;
    for (const [pkgName, pkgVersion] of Object.entries(versions)) {
      
      const pkgAssets = ghAssets
        .filter((a: any) => a.name.startsWith(pkgName) && a.name.includes('.pkg.tar.zst'))
        .map((a: any) => ({ name: a.name, size: a.size }));

      if (pkgAssets.length === 0) {
        const pkgFileName = `${pkgName}-${pkgVersion}-1-x86_64.pkg.tar.zst`;
        const sigFileName = `${pkgFileName}.sig`;
        
        if (fallbackAssets[pkgFileName]) {
          pkgAssets.push({ name: pkgFileName, size: fallbackAssets[pkgFileName] });
        }
        if (fallbackAssets[sigFileName]) {
          pkgAssets.push({ name: sigFileName, size: fallbackAssets[sigFileName] });
        }
      }

      const combinedAssets = [...pkgAssets, ...dbAssets];

      await db.collection('packages').updateOne(
        { name: pkgName },
        { 
          $set: { 
            name: pkgName,
            version: pkgVersion, 
            status: 'active',
            lastBuilt: releaseData.published_at,
            assets: combinedAssets
          } 
        },
        { upsert: true }
      );
      syncedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${syncedCount} packages from the alex-repo.`
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error during webhook sync' }, { status: 500 });
  }
}
