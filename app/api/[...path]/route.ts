import { NextResponse } from 'next/server';

export async function GET() {
  return new NextResponse("This pacman mirror route has been moved to /x86_64 to comply with Arch Linux standards.", { status: 404 });
}
