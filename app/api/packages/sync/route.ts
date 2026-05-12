import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const session = cookies().get('admin_session');
    if (!session?.value) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || 'alex-aur-packages');

    const adminUser = await db.collection('users').findOne({});
    const masterRepo = adminUser?.masterRepo || 'ArtRuntime/alex-repo-packegs';

    // === Core alex-repo Sync Logic ===
    const ghResponse = await fetch(`https://api.github.com/repos/${masterRepo}/releases/tags/latest`, {
      headers: {
        'User-Agent': 'Custom-Arch-Mirror',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!ghResponse.ok) {
      if (ghResponse.status === 404) {
        // No latest release yet - just return an empty success state
        return NextResponse.json({ success: true, message: 'No release found yet. Waiting for first build.', data: [] });
      }
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
        delete parsed.assets; // Remove so we don't iterate over it as a package
        versions = parsed;
      }
    }

    // 2. Map all assets from GitHub Release API
    const ghAssets = releaseData.assets || [];
    
    // 3. Extract Database Files so we can attach them to every package
    const dbFileNames = ['alex-repo.db', 'alex-repo.db.tar.gz', 'alex-repo.files', 'alex-repo.files.tar.gz'];
    const dbAssets = dbFileNames.map(name => {
      const ghAsset = ghAssets.find((a: any) => a.name === name);
      // Fallback to versions.json size if GitHub API misses it
      const size = ghAsset ? ghAsset.size : (fallbackAssets[name] || 0);
      return { name, size };
    }).filter(a => a.size > 0);

    // 4. Upsert every package into the database
    let syncedCount = 0;
    for (const [pkgName, pkgVersion] of Object.entries(versions)) {
      
      // Find package specific assets (the .zst and .sig)
      const pkgAssets = ghAssets
        .filter((a: any) => a.name.startsWith(pkgName) && a.name.includes('.pkg.tar.zst'))
        .map((a: any) => ({ name: a.name, size: a.size }));

      // If GitHub API missed the package files, fallback to versions.json
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

      // Combine package assets with database assets
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

    // Fetch the updated list of packages to return to the frontend
    const updatedPackages = await db.collection('packages').find({}).toArray();

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${syncedCount} packages!`,
      data: updatedPackages
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error during sync' }, { status: 500 });
  }
}
