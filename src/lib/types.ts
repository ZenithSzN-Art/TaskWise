import type { Timestamp } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 1 | 2 | 3; // 1: High, 2: Medium, 3: Low
  dueDate?: string | null; // ISO string for date
  order: number;
  createdAt: Timestamp;
  userId: string;
}

export type AppUser = FirebaseUser;
