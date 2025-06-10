"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthProvider';

interface UserStats {
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  tasksCompletedToday: number;
  level: number;
  tasksCompletedTotal: number;
  lastActivityDate: string;
}

interface UserStatsContextType {
  stats: UserStats | null;
  motivationalQuote: string;
  loading: boolean;
  refreshStats: () => Promise<void>;
}

const UserStatsContext = createContext<UserStatsContextType | undefined>(undefined);

export function useUserStats() {
  const context = useContext(UserStatsContext);
  if (context === undefined) {
    throw new Error('useUserStats must be used within a UserStatsProvider');
  }
  return context;
}

interface UserStatsProviderProps {
  children: ReactNode;
}

export function UserStatsProvider({ children }: UserStatsProviderProps) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [motivationalQuote, setMotivationalQuote] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchStats = async () => {
    if (!user) {
      setStats(null);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/user/stats', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user stats');
      }

      const data = await response.json();
      setStats(data.stats);
      setMotivationalQuote(data.motivationalQuote);
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  const refreshStats = async () => {
    await fetchStats();
  };

  return (
    <UserStatsContext.Provider
      value={{
        stats,
        motivationalQuote,
        loading,
        refreshStats,
      }}
    >
      {children}
    </UserStatsContext.Provider>
  );
}