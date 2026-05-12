import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(req: Request, { params }: { params: { path: string[] } }) {
  const pathArray = params.path;
  const filename = pathArray[pathArray.length - 1];

  if (!filename) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  // Hardcoded central database location for now (from android-studio-alex builder)
  if (filename.startsWith('alex-repo.db') || filename.startsWith('alex-repo.files')) {
    return NextResponse.redirect(`https://github.com/ArtRuntime/android-studio-alex/releases/latest/download/${filename}`, 302);
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || 'alex-aur-packages');
    
    // Dynamically find which package this file belongs to
    const packages = await db.collection('packages').find({ status: 'active' }).toArray();
    
    for (const pkg of packages) {
      if (filename.startsWith(pkg.name + '-')) {
        const version = pkg.version;
        // Redirect to the exact release on the target GitHub repo!
        return NextResponse.redirect(`https://github.com/${pkg.githubRepo}/releases/download/v${version}/${filename}`, 302);
      }
    }
  } catch (e) {
    console.error("Failed to query DB for package routing");
  }

  // Generic fallback if not recognized
  return new NextResponse("Package router could not determine the source repository.", { status: 404 });
}
