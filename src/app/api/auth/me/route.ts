import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const user = AuthService.verifyToken(token);
    return NextResponse.json({ user });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    );
  }
}