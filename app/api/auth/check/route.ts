import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || 'alex-aur-packages');
    const userCount = await db.collection('users').countDocuments();
    
    return NextResponse.json({ hasAdmin: userCount > 0 });
  } catch (error) {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }
}
