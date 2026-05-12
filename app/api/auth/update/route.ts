import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import CryptoJS from 'crypto-js';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { currentPassword, newUsername, newPassword } = await req.json();

    if (!currentPassword) {
      return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
    }

    // Get current session token to identify the user
    const cookieStore = cookies();
    const token = cookieStore.get('admin_session')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUsername = CryptoJS.AES.decrypt(token, process.env.DB_NAME || 'secret_key').toString(CryptoJS.enc.Utf8);
    if (!currentUsername) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || 'alex-aur-packages');
    
    // Verify user
    const user = await db.collection('users').findOne({ username: currentUsername });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify current password
    const isMatch = bcrypt.compareSync(currentPassword, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: 'Incorrect current password' }, { status: 401 });
    }

    // Prepare updates
    const updates: any = {};
    if (newUsername && newUsername.trim() !== '') {
      updates.username = newUsername.trim();
    }
    if (newPassword && newPassword.trim() !== '') {
      const salt = bcrypt.genSaltSync(10);
      updates.password = bcrypt.hashSync(newPassword.trim(), salt);
    }

    if (Object.keys(updates).length > 0) {
      await db.collection('users').updateOne(
        { _id: user._id },
        { $set: updates }
      );
    } else {
      return NextResponse.json({ error: 'No changes provided' }, { status: 400 });
    }

    const response = NextResponse.json({ success: true, message: 'Credentials updated successfully' });

    // If username changed, generate a new token and update the cookie
    if (updates.username && updates.username !== currentUsername) {
      const newToken = CryptoJS.AES.encrypt(updates.username, process.env.DB_NAME || 'secret_key').toString();
      response.cookies.set('admin_session', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      });
    }

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update credentials' }, { status: 500 });
  }
}
