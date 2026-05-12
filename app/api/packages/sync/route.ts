import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(req: Request) {
  try {
    const { packageId } = await req.json();

    if (!packageId) {
      return NextResponse.json({ success: false, error: 'Package ID is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || 'alex-aur-packages');
    
    // Find the package
    const pkg = await db.collection('packages').findOne({ _id: new ObjectId(packageId) });
    
    if (!pkg) {
      return NextResponse.json({ success: false, error: 'Package not found' }, { status: 404 });
    }

    if (!pkg.githubRepo) {
      return NextResponse.json({ success: false, error: 'No Target GitHub Repo configured for this package' }, { status: 400 });
    }

    // Fetch latest release from GitHub API
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
    
    // Remove 'v' prefix if it exists
    let newVersion = releaseData.tag_name;
    if (newVersion.startsWith('v')) {
      newVersion = newVersion.substring(1);
    }

    // Extract asset metadata from GitHub API
    let assetsMap = new Map();
    (releaseData.assets || []).forEach((asset: any) => {
      assetsMap.set(asset.name, asset.size);
    });

    // Always parse the markdown table as a fallback for any individual missing files
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

    // Update the package in MongoDB
    await db.collection('packages').updateOne(
      { _id: new ObjectId(packageId) },
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
      data: {
        version: newVersion,
        status: 'active',
        lastBuilt: releaseData.published_at,
        assets: assets
      }
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error during sync' }, { status: 500 });
  }
}
