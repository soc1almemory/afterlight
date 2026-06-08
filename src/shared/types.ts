export type TaskPriority = 1 | 2 | 3 | 4;

export type TaskStatus = 'active' | 'completed';

export type TaskScope = 'inbox' | 'today' | 'week' | 'category';

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  dueLabel?: string;
  priority: TaskPriority;
  status: TaskStatus;
  scope: TaskScope;
  categoryId?: string;
  isExpired?: boolean;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  dueDate?: string;
  dueLabel?: string;
  priority?: TaskPriority;
  scope: TaskScope;
  categoryId?: string;
}

export interface UpdateTaskInput {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  dueLabel?: string;
  priority: TaskPriority;
  scope?: TaskScope;
  categoryId?: string;
}

export interface Category {
  id: string;
  title: string;
  color: string;
  isFavorite: boolean;
}

export interface CreateCategoryInput {
  title: string;
  color: string;
  isFavorite?: boolean;
}

export interface UpdateCategoryInput {
  id: string;
  title: string;
  color: string;
  isFavorite: boolean;
}

export interface Note {
  id: string;
  scope: TaskScope;
  text: string;
  categoryId?: string;
}

export interface AppData {
  categories: Category[];
  notes: Note[];
  tasks: Task[];
}
