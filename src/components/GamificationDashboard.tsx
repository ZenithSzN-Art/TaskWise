"use client";

import { FC } from 'react';
import { useUserStats } from './UserStatsProvider';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Skeleton } from './ui/skeleton';
import { Trophy, Target, Flame, Star, TrendingUp, Calendar } from 'lucide-react';

export const GamificationDashboard: FC = () => {
  const { stats, motivationalQuote, loading } = useUserStats();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  if (!stats) return null;

  const progressToNextLevel = ((stats.totalPoints % 100) / 100) * 100;
  const pointsToNextLevel = 100 - (stats.totalPoints % 100);

  return (
    <div className="space-y-6">
      {/* Motivational Quote */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Star className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <p className="text-sm italic text-blue-800 dark:text-blue-200">
              "{motivationalQuote}"
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Level & Points */}
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Level & Points
            </CardTitle>
            <Trophy className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                Level {stats.level}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {stats.totalPoints} pts
              </span>
            </div>
            <Progress value={progressToNextLevel} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {pointsToNextLevel} points to next level
            </p>
          </CardContent>
        </Card>

        {/* Current Streak */}
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-800 dark:text-orange-200">
              Current Streak
            </CardTitle>
            <Flame className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {stats.currentStreak}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.currentStreak === 1 ? 'day' : 'days'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Best: {stats.longestStreak} {stats.longestStreak === 1 ? 'day' : 'days'}
            </p>
          </CardContent>
        </Card>

        {/* Today's Progress */}
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800 dark:text-green-200">
              Today's Tasks
            </CardTitle>
            <Target className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.tasksCompletedToday}
            </div>
            <p className="text-xs text-muted-foreground">
              completed today
            </p>
          </CardContent>
        </Card>

        {/* Total Achievement */}
        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-800 dark:text-purple-200">
              Total Completed
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.tasksCompletedTotal}
            </div>
            <p className="text-xs text-muted-foreground">
              tasks all time
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};