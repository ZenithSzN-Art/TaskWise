import { NextRequest, NextResponse } from 'next/server';
import { AuthService, TaskService } from '@/lib/database';

async function getAuthenticatedUser(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    throw new Error('Not authenticated');
  }
  return AuthService.verifyToken(token);
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    const tasks = TaskService.getAllTasks(user.id);
    return NextResponse.json({ tasks });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 401 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    const taskData = await request.json();
    
    const task = TaskService.createTask(user.id, taskData);
    return NextResponse.json({ task }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === 'Not authenticated' ? 401 : 400 }
    );
  }
}