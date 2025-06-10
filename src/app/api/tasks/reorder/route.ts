import { NextRequest, NextResponse } from 'next/server';
import { AuthService, TaskService } from '@/lib/database';

async function getAuthenticatedUser(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    throw new Error('Not authenticated');
  }
  return AuthService.verifyToken(token);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    const { taskOrders } = await request.json();
    
    TaskService.reorderTasks(user.id, taskOrders);
    return NextResponse.json({ message: 'Tasks reordered successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === 'Not authenticated' ? 401 : 400 }
    );
  }
}