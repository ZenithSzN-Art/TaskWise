# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with Turbopack on port 9002
- `npm run build` - Build the Next.js application for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint for code linting
- `npm run typecheck` - Run TypeScript type checking without emitting files

## Architecture Overview

This is a task management application ("TaskWise") built with Next.js 15 and SQLite, following a traditional MVC architecture pattern.

### Core Technologies
- **Next.js 15** with TypeScript and Turbopack for development
- **SQLite** with better-sqlite3 for local database storage
- **JWT Authentication** with bcrypt password hashing
- **Tailwind CSS** with shadcn/ui components for styling
- **Radix UI** primitives for accessible components

### MVC Architecture Pattern

**Model Layer** (`src/lib/database.ts`):
- SQLite database with Users and Tasks tables
- `AuthService` class for user authentication operations
- `TaskService` class for CRUD operations on tasks
- Password hashing with bcrypt
- JWT token generation and verification

**Controller Layer** (API Routes):
- `src/app/api/auth/*` - Authentication endpoints (login, register, logout, me)
- `src/app/api/tasks/*` - Task management endpoints (CRUD operations)
- HTTP-only cookie-based authentication
- Proper error handling and validation

**View Layer** (React Components):
- `src/components/AuthProvider.tsx` - Authentication context and state management
- `src/components/auth/*` - Login and registration forms with validation
- `src/components/tasks/TaskList.tsx` - Complete task management interface
- `src/components/Header.tsx` - Application header with user menu and logout

**Component Structure**:
- UI components follow shadcn/ui patterns in `src/components/ui/`
- Authentication components in `src/components/auth/`
- Task-specific components in `src/components/tasks/`
- Core application providers and layout components

**Data Models**:
- User model: id, email, password_hash, display_name, created_at
- Task model: id, user_id, title, description, completed, priority, due_date, task_order, created_at
- Priority system (1=High, 2=Medium, 3=Low)
- Foreign key relationships between users and tasks

### Database Schema

```sql
-- Users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table  
CREATE TABLE tasks (
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
);
```

### Environment Configuration

Optional variables:
- `JWT_SECRET` - Secret key for JWT token signing (defaults to development key)

### Build Configuration

- TypeScript and ESLint errors are ignored during builds (see next.config.ts)
- Image optimization configured for placehold.co domain
- Path aliases: `@/*` maps to `./src/*`