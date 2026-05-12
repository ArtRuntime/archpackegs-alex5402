import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function GET(req: Request) {
  try {
    const session = cookies().get('admin_session');
    if (!session?.value) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || 'alex-aur-packages');
    
    const adminUser = await db.collection('users').findOne({});
    if (!adminUser) {
      return NextResponse.json({ success: false, error: 'Admin user not found' }, { status: 404 });
    }

    // Only return the masked key for security (last 8 characters)
    const apiKey = adminUser.webhookApiKey;
    const maskedKey = apiKey ? `************************${apiKey.slice(-8)}` : null;

    return NextResponse.json({ 
      success: true, 
      hasKey: !!apiKey,
      maskedKey,
      fullKey: apiKey
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch API key' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = cookies().get('admin_session');
    if (!session?.value) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || 'alex-aur-packages');
    
    // Generate a secure 32-byte (64-character hex) random token
    const newApiKey = crypto.randomBytes(32).toString('hex');

    // Update the admin user
    const adminUser = await db.collection('users').findOne({});
    if (!adminUser) {
      return NextResponse.json({ success: false, error: 'Admin user not found' }, { status: 404 });
    }

    await db.collection('users').updateOne(
      { _id: adminUser._id },
      { $set: { webhookApiKey: newApiKey } }
    );

    return NextResponse.json({ 
      success: true, 
      apiKey: newApiKey 
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to generate API key' }, { status: 500 });
  }
}
