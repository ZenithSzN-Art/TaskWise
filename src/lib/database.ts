import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';

const dbPath = path.join(process.cwd(), 'taskwise.db');
const db = new Database(dbPath);

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Database schema
const initDB = () => {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tasks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      completed BOOLEAN DEFAULT FALSE,
      priority INTEGER DEFAULT 2,
      due_date TEXT,
      task_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // User stats table for gamification
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      total_points INTEGER DEFAULT 0,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      tasks_completed_today INTEGER DEFAULT 0,
      last_activity_date TEXT,
      level INTEGER DEFAULT 1,
      tasks_completed_total INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // Add completed_at column to existing tasks if not exists
  try {
    db.exec(`ALTER TABLE tasks ADD COLUMN completed_at DATETIME`);
  } catch (error) {
    // Column already exists, ignore error
  }

  console.log('Database initialized');
};

// User authentication functions
export class AuthService {
  static async createUser(email: string, password: string, displayName?: string) {
    const passwordHash = await bcrypt.hash(password, 10);
    
    try {
      const stmt = db.prepare(`
        INSERT INTO users (email, password_hash, display_name)
        VALUES (?, ?, ?)
      `);
      
      const result = stmt.run(email, passwordHash, displayName || null);
      
      // Initialize user stats
      UserStatsService.initializeUserStats(Number(result.lastInsertRowid));
      
      return { id: result.lastInsertRowid, email, displayName };
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('User with this email already exists');
      }
      throw error;
    }
  }

  static async authenticateUser(email: string, password: string) {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = stmt.get(email) as any;
    
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
      },
      token
    };
  }

  static verifyToken(token: string) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const stmt = db.prepare('SELECT id, email, display_name FROM users WHERE id = ?');
      const user = stmt.get(decoded.userId) as any;
      
      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
      };
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}

// Task management functions
export class TaskService {
  static getAllTasks(userId: number) {
    const stmt = db.prepare(`
      SELECT * FROM tasks 
      WHERE user_id = ? 
      ORDER BY task_order ASC, created_at DESC
    `);
    return stmt.all(userId);
  }

  static createTask(userId: number, taskData: {
    title: string;
    description?: string;
    priority?: number;
    dueDate?: string;
  }) {
    // Get the next order value
    const orderStmt = db.prepare('SELECT MAX(task_order) as max_order FROM tasks WHERE user_id = ?');
    const result = orderStmt.get(userId) as any;
    const nextOrder = (result?.max_order || 0) + 1;

    const stmt = db.prepare(`
      INSERT INTO tasks (user_id, title, description, priority, due_date, task_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const insertResult = stmt.run(
      userId,
      taskData.title,
      taskData.description || null,
      taskData.priority || 2,
      taskData.dueDate || null,
      nextOrder
    );

    return this.getTask(Number(insertResult.lastInsertRowid));
  }

  static getTask(taskId: number) {
    const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
    return stmt.get(taskId);
  }

  static updateTask(taskId: number, userId: number, updates: Partial<{
    title: string;
    description: string;
    completed: boolean;
    priority: number;
    dueDate: string;
  }>) {
    const setClause = Object.keys(updates)
      .map(key => {
        const dbKey = key === 'dueDate' ? 'due_date' : key;
        return `${dbKey} = ?`;
      })
      .join(', ');
    
    const values = Object.values(updates);
    
    const stmt = db.prepare(`
      UPDATE tasks 
      SET ${setClause}
      WHERE id = ? AND user_id = ?
    `);
    
    stmt.run(...values, taskId, userId);
    return this.getTask(taskId);
  }

  static deleteTask(taskId: number, userId: number) {
    const stmt = db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?');
    const result = stmt.run(taskId, userId);
    return result.changes > 0;
  }

  static reorderTasks(userId: number, taskOrders: { id: number; order: number }[]) {
    const stmt = db.prepare('UPDATE tasks SET task_order = ? WHERE id = ? AND user_id = ?');
    
    const transaction = db.transaction(() => {
      for (const { id, order } of taskOrders) {
        stmt.run(order, id, userId);
      }
    });
    
    transaction();
  }

  static markTaskCompleted(taskId: number, userId: number, completed: boolean) {
    const stmt = db.prepare(`
      UPDATE tasks 
      SET completed = ?, completed_at = ?
      WHERE id = ? AND user_id = ?
    `);
    
    const completedAt = completed ? new Date().toISOString() : null;
    stmt.run(completed, completedAt, taskId, userId);
    
    // Update user stats if task is being completed
    if (completed) {
      UserStatsService.onTaskCompleted(userId);
    }
    
    return this.getTask(taskId);
  }
}

// User stats service for gamification
export class UserStatsService {
  static initializeUserStats(userId: number) {
    const stmt = db.prepare(`
      INSERT INTO user_stats (user_id, last_activity_date)
      VALUES (?, ?)
    `);
    
    try {
      stmt.run(userId, new Date().toISOString().split('T')[0]);
    } catch (error) {
      // Stats already exist, ignore error
    }
  }

  static getUserStats(userId: number) {
    const stmt = db.prepare('SELECT * FROM user_stats WHERE user_id = ?');
    let stats = stmt.get(userId) as any;
    
    if (!stats) {
      this.initializeUserStats(userId);
      stats = stmt.get(userId);
    }
    
    return stats;
  }

  static onTaskCompleted(userId: number) {
    const today = new Date().toISOString().split('T')[0];
    const stats = this.getUserStats(userId);
    
    const transaction = db.transaction(() => {
      let newPoints = stats.total_points + this.getPointsForTask();
      let newStreak = stats.current_streak;
      let newLongestStreak = stats.longest_streak;
      let tasksToday = stats.tasks_completed_today;
      
      // Check if this is a new day
      if (stats.last_activity_date !== today) {
        // Check if streak continues (yesterday was last activity)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (stats.last_activity_date === yesterdayStr) {
          newStreak += 1;
        } else {
          newStreak = 1; // Reset streak
        }
        
        tasksToday = 1; // Reset daily count
      } else {
        tasksToday += 1;
      }
      
      // Update longest streak
      newLongestStreak = Math.max(newLongestStreak, newStreak);
      
      // Calculate level (every 100 points = 1 level)
      const newLevel = Math.floor(newPoints / 100) + 1;
      
      const updateStmt = db.prepare(`
        UPDATE user_stats SET
          total_points = ?,
          current_streak = ?,
          longest_streak = ?,
          tasks_completed_today = ?,
          last_activity_date = ?,
          level = ?,
          tasks_completed_total = tasks_completed_total + 1,
          updated_at = ?
        WHERE user_id = ?
      `);
      
      updateStmt.run(
        newPoints,
        newStreak,
        newLongestStreak,
        tasksToday,
        today,
        newLevel,
        new Date().toISOString(),
        userId
      );
    });
    
    transaction();
  }

  static getPointsForTask(): number {
    return 10; // Base points per task
  }

  static getMotivationalQuotes(): string[] {
    return [
      "The way to get started is to quit talking and begin doing. - Walt Disney",
      "Don't let yesterday take up too much of today. - Will Rogers",
      "You don't have to be great to get started, but you have to get started to be great. - Les Brown",
      "The secret of getting ahead is getting started. - Mark Twain",
      "It always seems impossible until it's done. - Nelson Mandela",
      "Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill",
      "The only way to do great work is to love what you do. - Steve Jobs",
      "Believe you can and you're halfway there. - Theodore Roosevelt",
      "Your limitation—it's only your imagination.",
      "Push yourself, because no one else is going to do it for you.",
      "Great things never come from comfort zones.",
      "Dream it. Wish it. Do it.",
      "Success doesn't just find you. You have to go out and get it.",
      "The harder you work for something, the greater you'll feel when you achieve it.",
      "Don't stop when you're tired. Stop when you're done."
    ];
  }

  static getRandomQuote(): string {
    const quotes = this.getMotivationalQuotes();
    return quotes[Math.floor(Math.random() * quotes.length)];
  }
}

// Initialize database on import
initDB();

export { db };