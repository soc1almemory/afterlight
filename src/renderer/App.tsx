import { useEffect, useMemo, useState } from 'react';
import type { Category, Task } from '../shared/types';
import { CategoryDialog } from './components/CategoryDialog';
import { ContentView } from './components/ContentView';
import { SearchDialog } from './components/SearchDialog';
import { Sidebar } from './components/Sidebar';
import { TaskDialog } from './components/TaskDialog';
import { TitleBar } from './components/TitleBar';
import { useTaskStore } from './store/useTaskStore';

export const App = () => {
  const [isTaskDialogOpen, setTaskDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>();
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [initialTaskDate, setInitialTaskDate] = useState<string | undefined>();
  const [isSearchOpen, setSearchOpen] = useState(false);
  const activeScope = useTaskStore((state) => state.activeScope);
  const hydrate = useTaskStore((state) => state.hydrate);

  const pageClass = useMemo(() => {
    if (activeScope === 'today') return 'page-today';
    if (activeScope === 'week') return 'page-week';
    if (activeScope === 'category') return 'page-category-page';
    return 'page-inbox';
  }, [activeScope]);

  useEffect(() => {
    document.body.className = pageClass;
  }, [pageClass]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const openCreateDialog = (dueDate?: string) => {
    setEditingTask(undefined);
    setInitialTaskDate(dueDate);
    setTaskDialogOpen(true);
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setInitialTaskDate(undefined);
    setTaskDialogOpen(true);
  };

  const closeDialog = () => {
    setTaskDialogOpen(false);
    setEditingTask(undefined);
    setInitialTaskDate(undefined);
  };

  const openCreateCategoryDialog = () => {
    setEditingCategory(undefined);
    setCategoryDialogOpen(true);
  };

  const openEditCategoryDialog = (category: Category) => {
    setEditingCategory(category);
    setCategoryDialogOpen(true);
  };

  const closeCategoryDialog = () => {
    setCategoryDialogOpen(false);
    setEditingCategory(undefined);
  };

  return (
    <div className="afterlight-app">
      <TitleBar />
      <Sidebar
        onAddCategory={openCreateCategoryDialog}
        onAddTask={() => openCreateDialog()}
        onEditCategory={openEditCategoryDialog}
      />
      <ContentView onAddTask={openCreateDialog} onEditTask={openEditDialog} onOpenSearch={() => setSearchOpen(true)} />
      <TaskDialog isOpen={isTaskDialogOpen} task={editingTask} initialDueDate={initialTaskDate} onClose={closeDialog} />
      <CategoryDialog isOpen={isCategoryDialogOpen} category={editingCategory} onClose={closeCategoryDialog} />
      <SearchDialog isOpen={isSearchOpen} onClose={() => setSearchOpen(false)} onEditTask={openEditDialog} />
    </div>
  );
};
