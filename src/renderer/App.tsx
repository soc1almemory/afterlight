import { useEffect, useMemo, useState } from 'react';
import { AddTaskDialog } from './components/AddTaskDialog';
import { ContentView } from './components/ContentView';
import { Sidebar } from './components/Sidebar';
import { TitleBar } from './components/TitleBar';
import { useTaskStore } from './store/useTaskStore';

export const App = () => {
  const [isAddTaskOpen, setAddTaskOpen] = useState(false);
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

  return (
    <div className="afterlight-app">
      <TitleBar />
      <Sidebar onAddTask={() => setAddTaskOpen(true)} />
      <ContentView onAddTask={() => setAddTaskOpen(true)} />
      <AddTaskDialog isOpen={isAddTaskOpen} onClose={() => setAddTaskOpen(false)} />
    </div>
  );
};
