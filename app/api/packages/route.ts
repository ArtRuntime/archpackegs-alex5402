import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || 'alex-aur-packages');
    const packages = await db.collection('packages').find({}).toArray();
    return NextResponse.json({ success: true, data: packages });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Database connection failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, githubRepo } = body;
    
    if (!name) {
      return NextResponse.json({ success: false, error: 'Package name is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || 'alex-aur-packages');
    
    const existing = await db.collection('packages').findOne({ name });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Package already exists' }, { status: 400 });
    }

    const newPackage = {
      name,
      githubRepo: githubRepo || '',
      status: 'pending', // pending, active, failed
      version: '0.0.0',
      createdAt: new Date(),
    };

    await db.collection('packages').insertOne(newPackage);
    
    // Note: GitHub Action trigger logic goes here once the repository structure is finalized.
    
    return NextResponse.json({ success: true, data: newPackage }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create package' }, { status: 500 });
  }
}
