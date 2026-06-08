export type TaskPriority = 1 | 2 | 3 | 4;

export type TaskStatus = 'active' | 'completed';

export type TaskScope = 'inbox' | 'today' | 'week' | 'category';

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueLabel?: string;
  priority: TaskPriority;
  status: TaskStatus;
  scope: TaskScope;
  categoryId?: string;
  isExpired?: boolean;
}

export interface Category {
  id: string;
  title: string;
  color: string;
  isFavorite: boolean;
}

export interface Note {
  id: string;
  scope: TaskScope;
  text: string;
}
