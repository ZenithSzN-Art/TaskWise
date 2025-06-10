"use client";

import type { FC } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Filter, ArrowDownUp, CheckCircle, ListTodo } from 'lucide-react';

export type FilterStatus = 'all' | 'active' | 'completed';
export type SortOption = 'order' | 'priority' | 'dueDate';

interface TaskFiltersProps {
  filterStatus: FilterStatus;
  sortOption: SortOption;
  onFilterChange: (status: FilterStatus) => void;
  onSortChange: (option: SortOption) => void;
}

export const TaskFilters: FC<TaskFiltersProps> = ({
  filterStatus,
  sortOption,
  onFilterChange,
  onSortChange,
}) => {
  return (
    <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-card rounded-lg shadow">
      <div className="flex items-center gap-4">
        <Filter className="h-5 w-5 text-muted-foreground" />
        <div className="flex items-center gap-2">
          <Button
            variant={filterStatus === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onFilterChange('all')}
            aria-pressed={filterStatus === 'all'}
          >
            <ListTodo className="mr-2 h-4 w-4" /> All
          </Button>
          <Button
            variant={filterStatus === 'active' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onFilterChange('active')}
            aria-pressed={filterStatus === 'active'}
          >
            Active
          </Button>
          <Button
            variant={filterStatus === 'completed' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onFilterChange('completed')}
            aria-pressed={filterStatus === 'completed'}
          >
            <CheckCircle className="mr-2 h-4 w-4" /> Completed
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ArrowDownUp className="h-5 w-5 text-muted-foreground" />
        <Label htmlFor="sort-select" className="sr-only">Sort by</Label>
        <Select value={sortOption} onValueChange={(value) => onSortChange(value as SortOption)}>
          <SelectTrigger id="sort-select" className="w-[180px]">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="order">Custom Order</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="dueDate">Due Date</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
