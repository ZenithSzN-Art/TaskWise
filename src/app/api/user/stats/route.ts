import { NextRequest, NextResponse } from 'next/server';
import { UserStatsService } from '@/lib/database';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.userId;

    const stats = UserStatsService.getUserStats(userId);
    const quote = UserStatsService.getRandomQuote();

    return NextResponse.json({
      stats: {
        totalPoints: stats.total_points,
        currentStreak: stats.current_streak,
        longestStreak: stats.longest_streak,
        tasksCompletedToday: stats.tasks_completed_today,
        level: stats.level,
        tasksCompletedTotal: stats.tasks_completed_total,
        lastActivityDate: stats.last_activity_date,
      },
      motivationalQuote: quote,
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}