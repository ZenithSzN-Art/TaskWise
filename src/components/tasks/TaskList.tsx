"use client";

import type { FC, DragEvent } from 'react';
import { useEffect, useState, useMemo } from 'react';
import type { Task } from '@/lib/types';
import { TaskItem } from './TaskItem';
import { AddTaskForm } from './AddTaskForm';
import { TaskFilters, type FilterStatus, type SortOption } from './TaskFilters';
import { Skeleton } from '@/components/ui/skeleton';
import { PackageOpen } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/components/AuthProvider';

interface DatabaseTask extends Omit<Task, 'id' | 'userId' | 'createdAt'> {
  id: number;
  user_id: number;
  task_order: number;
  due_date: string | null;
  created_at: string;
}

export const TaskList: FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortOption, setSortOption] = useState<SortOption>('order');
  const { toast } = useToast();
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const { user } = useAuth();

  // Convert database task to frontend Task format
  const convertTask = (dbTask: DatabaseTask): Task => ({
    id: dbTask.id.toString(),
    title: dbTask.title,
    description: dbTask.description,
    completed: dbTask.completed,
    priority: dbTask.priority as 1 | 2 | 3,
    dueDate: dbTask.due_date,
    order: dbTask.task_order,
    createdAt: { seconds: Math.floor(new Date(dbTask.created_at).getTime() / 1000), nanoseconds: 0 } as any,
    userId: dbTask.user_id.toString(),
  });

  // Fetch tasks from API
  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      
      const data = await response.json();
      const convertedTasks = data.tasks.map(convertTask);
      setTasks(convertedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({ title: "Error", description: "Could not fetch tasks.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  const handleTaskAdd = async (taskData: {
    title: string;
    description?: string;
    priority: 1 | 2 | 3;
    dueDate?: string | null;
  }) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority,
          dueDate: taskData.dueDate,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      // Refresh tasks list
      await fetchTasks();
    } catch (error) {
      console.error('Error adding task:', error);
      toast({ title: "Error", description: "Could not add task.", variant: "destructive" });
    }
  };

  const handleToggleComplete = async (taskId: string, completed: boolean) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ completed }),
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      // Update local state immediately
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, completed } : task
      ));
    } catch (error) {
      console.error('Error updating task:', error);
      toast({ title: "Error", description: "Could not update task.", variant: "destructive" });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      // Remove from local state
      setTasks(prev => prev.filter(task => task.id !== taskId));
      toast({ title: "Task Deleted", description: "The task has been removed." });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({ title: "Error", description: "Could not delete task.", variant: "destructive" });
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'dueDate'>>) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      // Update local state
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      ));
      toast({ title: "Task Updated", description: "Your changes have been saved." });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({ title: "Error", description: "Could not update task.", variant: "destructive" });
    }
  };

  const onDragStart = (e: DragEvent<HTMLDivElement>, taskId: string) => {
    setDraggedItemId(taskId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", taskId);
  };

  const onDragEnd = (e: DragEvent<HTMLDivElement>) => {
    setDraggedItemId(null);
  };

  const onDragOver = async (e: DragEvent<HTMLDivElement>, targetTaskId: string) => {
    e.preventDefault();
    if (!draggedItemId || draggedItemId === targetTaskId) return;

    const currentTasks = [...tasks];
    const draggedItemIndex = currentTasks.findIndex(t => t.id === draggedItemId);
    const targetItemIndex = currentTasks.findIndex(t => t.id === targetTaskId);

    if (draggedItemIndex === -1 || targetItemIndex === -1) return;

    const draggedItem = currentTasks.splice(draggedItemIndex, 1)[0];
    currentTasks.splice(targetItemIndex, 0, draggedItem);

    // Update local state immediately
    const reorderedTasks = currentTasks.map((task, index) => ({ ...task, order: index }));
    setTasks(reorderedTasks);

    // Update server
    try {
      const taskOrders = reorderedTasks.map((task, index) => ({
        id: parseInt(task.id),
        order: index,
      }));

      const response = await fetch('/api/tasks/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ taskOrders }),
      });

      if (!response.ok) {
        throw new Error('Failed to reorder tasks');
      }
    } catch (error) {
      console.error('Error reordering tasks:', error);
      toast({ title: "Error", description: "Could not save new task order.", variant: "destructive" });
      // Revert to original order on error
      await fetchTasks();
    }
  };

  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];

    if (filterStatus === 'active') {
      result = result.filter(task => !task.completed);
    } else if (filterStatus === 'completed') {
      result = result.filter(task => task.completed);
    }

    if (sortOption === 'priority') {
      result.sort((a, b) => a.priority - b.priority || a.order - b.order);
    } else if (sortOption === 'dueDate') {
      result.sort((a, b) => {
        const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        if (dateA === dateB) return a.order - b.order;
        return dateA - dateB;
      });
    } else {
      result.sort((a, b) => a.order - b.order);
    }
    return result;
  }, [tasks, filterStatus, sortOption]);

  const draggableProps = sortOption === 'order' 
    ? { onDragStart, onDragEnd, onDragOver } 
    : {};

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <h2 className="text-3xl font-headline font-semibold">Your Tasks</h2>
      </div>
      
      <AddTaskForm onTaskAdd={handleTaskAdd} className="mb-8" />
      <TaskFilters
        filterStatus={filterStatus}
        sortOption={sortOption}
        onFilterChange={setFilterStatus}
        onSortChange={setSortOption}
      />
      {filteredAndSortedTasks.length === 0 ? (
        <div className="text-center py-10 bg-card rounded-lg shadow">
          <PackageOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-xl font-semibold text-muted-foreground">
            {filterStatus === 'all' ? 'No tasks here!' : 'No tasks match your filters.'}
          </p>
          <p className="text-muted-foreground">
            {filterStatus === 'all' ? 'Add a new task to get started.' : 'Try adjusting your filters or add more tasks.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredAndSortedTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggleComplete={handleToggleComplete}
              onDelete={handleDeleteTask}
              onUpdate={handleUpdateTask}
              isDragging={draggedItemId === task.id}
              {...draggableProps}
            />
          ))}
        </div>
      )}
    </div>
  );
};