export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 1 | 2 | 3; // 1: High, 2: Medium, 3: Low
  dueDate?: string | null; // ISO string for date
  order: number;
  createdAt: { seconds: number; nanoseconds: number };
  userId: string;
}

export interface AppUser {
  id: number;
  email: string;
  displayName?: string;
}
