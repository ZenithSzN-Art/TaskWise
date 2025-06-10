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
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

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
}

// Initialize database on import
initDB();

export { db };