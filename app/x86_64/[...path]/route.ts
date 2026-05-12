import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(req: Request, { params }: { params: { path: string[] } }) {
  const pathArray = params.path;
  const filename = pathArray[pathArray.length - 1];

  if (!filename) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  let masterRepo = 'ArtRuntime/alex-repo-packegs';

  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || 'alex-aur-packages');
    const adminUser = await db.collection('users').findOne({});
    if (adminUser && adminUser.masterRepo) {
      masterRepo = adminUser.masterRepo;
    }
  } catch (e) {
    console.error("Failed to fetch master repo from DB", e);
  }

  // Redirect directly to the 'latest' rolling release tag of the master alex-repo
  return NextResponse.redirect(`https://github.com/${masterRepo}/releases/download/latest/${filename}`, 302);
}
