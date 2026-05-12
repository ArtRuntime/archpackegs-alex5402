import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import CryptoJS from 'crypto-js';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || 'alex-aur-packages');
    
    const userCount = await db.collection('users').countDocuments();
    if (userCount > 0) {
      return NextResponse.json({ error: 'Signup is locked. Admin already exists.' }, { status: 403 });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    await db.collection('users').insertOne({
      username,
      password: hashedPassword,
      createdAt: new Date()
    });

    // Auto-login after signup
    const token = CryptoJS.AES.encrypt(username, process.env.DB_NAME || 'secret_key').toString();
    const response = NextResponse.json({ success: true });
    response.cookies.set('admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 });
  }
}
