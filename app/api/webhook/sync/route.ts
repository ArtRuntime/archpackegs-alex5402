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

    // Get the githubRepo from the request body
    let githubRepo = '';
    try {
      const body = await req.json();
      githubRepo = body.githubRepo;
    } catch (e) {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!githubRepo) {
      return NextResponse.json({ success: false, error: 'githubRepo is required in the request body' }, { status: 400 });
    }

    // Find the package linked to this repo
    const pkg = await db.collection('packages').findOne({ githubRepo: githubRepo });
    if (!pkg) {
      return NextResponse.json({ success: false, error: `No tracked package found for repository: ${githubRepo}` }, { status: 404 });
    }

    // === Core Sync Logic (Replicated from /api/packages/sync) ===
    const ghResponse = await fetch(`https://api.github.com/repos/${pkg.githubRepo}/releases/latest`, {
      headers: {
        'User-Agent': 'Custom-Arch-Mirror',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!ghResponse.ok) {
      if (ghResponse.status === 404) {
        return NextResponse.json({ success: false, error: 'No releases found on the target GitHub repository.' }, { status: 404 });
      }
      return NextResponse.json({ success: false, error: 'Failed to contact GitHub API.' }, { status: 500 });
    }

    const releaseData = await ghResponse.json();
    
    let newVersion = releaseData.tag_name;
    if (newVersion.startsWith('v')) {
      newVersion = newVersion.substring(1);
    }

    let assetsMap = new Map();
    (releaseData.assets || []).forEach((asset: any) => {
      assetsMap.set(asset.name, asset.size);
    });

    if (releaseData.body) {
      const bodyText = releaseData.body;
      const regex = /\|\s*`([^`]+)`\s*\|\s*(\d+)\s*\|\s*`[^`]+`\s*\|/g;
      let match;
      while ((match = regex.exec(bodyText)) !== null) {
        const name = match[1];
        const size = parseInt(match[2], 10);
        if (!assetsMap.has(name)) {
          assetsMap.set(name, size);
        }
      }
    }

    const assets = Array.from(assetsMap.entries()).map(([name, size]) => ({ name, size }));

    // Update the database
    await db.collection('packages').updateOne(
      { _id: pkg._id },
      { 
        $set: { 
          version: newVersion, 
          status: 'active',
          lastBuilt: releaseData.published_at,
          assets: assets
        } 
      }
    );

    return NextResponse.json({ 
      success: true, 
      message: `Successfully synced ${pkg.name} to version ${newVersion}`
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error during webhook sync' }, { status: 500 });
  }
}
