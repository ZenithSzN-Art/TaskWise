"use client";

import type { FC, DragEvent } from 'react';
import { useState } from 'react';
import type { Task } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { GripVertical, Edit3, Trash2, CalendarDays, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
// EditModal (simplified inline for now, or could be a separate component)
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";


interface TaskItemProps {
  task: Task;
  onToggleComplete: (taskId: string, completed: boolean) => void;
  onDelete: (taskId: string) => void;
  onUpdate: (taskId: string, updates: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'dueDate'>>) => void;
  isDragging?: boolean;
  onDragStart?: (e: DragEvent<HTMLDivElement>, taskId: string) => void;
  onDragEnd?: (e: DragEvent<HTMLDivElement>) => void;
  onDragOver?: (e: DragEvent<HTMLDivElement>, taskId:string) => void;
}

const priorityMap: { [key in Task['priority']]: { label: string; color: string } } = {
  1: { label: 'High', color: 'bg-red-500' },
  2: { label: 'Medium', color: 'bg-yellow-500' },
  3: { label: 'Low', color: 'bg-green-500' },
};

export const TaskItem: FC<TaskItemProps> = ({
  task,
  onToggleComplete,
  onDelete,
  onUpdate,
  isDragging,
  onDragStart,
  onDragEnd,
  onDragOver,
}) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || '');

  const handleUpdate = () => {
    onUpdate(task.id, { title: editTitle, description: editDescription });
    setIsEditDialogOpen(false);
  };
  
  const cardClasses = cn(
    "mb-4 shadow-md hover:shadow-lg transition-shadow duration-200",
    task.completed && "opacity-60 bg-muted/50",
    isDragging && "opacity-50 ring-2 ring-primary scale-105"
  );

  return (
    <Card 
      draggable 
      onDragStart={(e) => onDragStart?.(e, task.id)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOver?.(e, task.id)}
      className={cardClasses}
      data-task-id={task.id}
    >
      <CardHeader className="flex flex-row items-start gap-4 p-4">
        <div className="flex items-center h-full pt-1 cursor-grab" aria-label="Drag to reorder">
           <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex items-center space-x-3 flex-grow">
          <Checkbox
            id={`task-${task.id}`}
            checked={task.completed}
            onCheckedChange={(checked) => onToggleComplete(task.id, !!checked)}
            aria-labelledby={`task-title-${task.id}`}
          />
          <div className="flex-grow">
            <CardTitle id={`task-title-${task.id}`} className={cn("text-lg font-headline", task.completed && "line-through")}>
              {task.title}
            </CardTitle>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Edit task">
                <Edit3 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-headline">Edit Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="edit-title">Title</Label>
                  <Input id="edit-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea id="edit-description" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                </div>
                {/* Simplified: Priority and Due Date editing can be added here */}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleUpdate}>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" aria-label="Delete task">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="font-headline">Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the task "{task.title}".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(task.id)} className="bg-destructive hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      {(task.description || task.dueDate || task.priority) && (
        <CardContent className="p-4 pt-0 pl-12">
          {task.description && (
            <CardDescription className={cn(task.completed && "line-through")}>
              {task.description}
            </CardDescription>
          )}
          <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
            {task.dueDate && (
              <div className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                <span>{format(parseISO(task.dueDate), 'MMM d, yyyy')}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              <Badge variant="outline" className={cn(priorityMap[task.priority].color, "text-white")}>
                {priorityMap[task.priority].label} Priority
              </Badge>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
