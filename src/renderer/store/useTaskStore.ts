import { create } from 'zustand';
import type { Category, Note, Task, TaskScope } from '../../shared/types';
import { categories as seedCategories, notes as seedNotes, tasks as seedTasks } from '../data/seed';

interface TaskState {
  activeScope: TaskScope;
  activeCategoryId: string;
  categories: Category[];
  notes: Note[];
  tasks: Task[];
  setScope: (scope: TaskScope) => void;
  setActiveCategory: (categoryId: string) => void;
  toggleTask: (taskId: string) => void;
  addTask: (title: string) => void;
  updateNote: (scope: TaskScope, text: string) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  activeScope: 'inbox',
  activeCategoryId: 'study',
  categories: seedCategories,
  notes: seedNotes,
  tasks: seedTasks,
  setScope: (scope) => set({ activeScope: scope }),
  setActiveCategory: (categoryId) => set({ activeScope: 'category', activeCategoryId: categoryId }),
  toggleTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? { ...task, status: task.status === 'completed' ? 'active' : 'completed' }
          : task,
      ),
    })),
  addTask: (title) =>
    set((state) => ({
      tasks: [
        {
          id: crypto.randomUUID(),
          title,
          priority: 4,
          status: 'active',
          scope: state.activeScope,
          categoryId: state.activeScope === 'category' ? state.activeCategoryId : undefined,
        },
        ...state.tasks,
      ],
    })),
  updateNote: (scope, text) =>
    set((state) => {
      const existing = state.notes.some((note) => note.scope === scope);

      if (!existing) {
        return {
          notes: [...state.notes, { id: crypto.randomUUID(), scope, text }],
        };
      }

      return {
        notes: state.notes.map((note) => (note.scope === scope ? { ...note, text } : note)),
      };
    }),
}));
