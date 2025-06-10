import { NextRequest, NextResponse } from 'next/server';
import { AuthService, TaskService } from '@/lib/database';

async function getAuthenticatedUser(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    throw new Error('Not authenticated');
  }
  return AuthService.verifyToken(token);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request);
    const taskId = parseInt(params.id);
    const updates = await request.json();
    
    // If updating completion status, use the special method that triggers stats
    if ('completed' in updates) {
      const task = TaskService.markTaskCompleted(taskId, user.id, updates.completed);
      return NextResponse.json({ task });
    } else {
      const task = TaskService.updateTask(taskId, user.id, updates);
      return NextResponse.json({ task });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === 'Not authenticated' ? 401 : 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request);
    const taskId = parseInt(params.id);
    
    const deleted = TaskService.deleteTask(taskId, user.id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Task deleted' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === 'Not authenticated' ? 401 : 400 }
    );
  }
}