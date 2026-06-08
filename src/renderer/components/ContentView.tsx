import type { Task, TaskScope } from '../../shared/types';
import { assetUrl } from '../lib/assets';
import { useTaskStore } from '../store/useTaskStore';
import { TaskListItem } from './TaskListItem';

interface ContentViewProps {
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
}

const titles: Record<TaskScope, string> = {
  inbox: 'Входящие',
  today: 'Сегодня',
  week: 'Неделя',
  category: 'Категория',
};

export const ContentView = ({ onAddTask, onEditTask }: ContentViewProps) => {
  const activeScope = useTaskStore((state) => state.activeScope);
  const activeCategoryId = useTaskStore((state) => state.activeCategoryId);
  const categories = useTaskStore((state) => state.categories);
  const error = useTaskStore((state) => state.error);
  const isLoading = useTaskStore((state) => state.isLoading);
  const tasks = useTaskStore((state) => state.tasks);
  const notes = useTaskStore((state) => state.notes);
  const updateNote = useTaskStore((state) => state.updateNote);

  const activeCategory = categories.find((category) => category.id === activeCategoryId);
  const title = activeScope === 'category' ? activeCategory?.title ?? titles.category : titles[activeScope];
  const visibleTasks = tasks.filter((task) => isTaskVisible(task, activeScope, activeCategoryId));
  const activeNote = notes.find((note) => {
    if (activeScope === 'category') {
      return note.scope === 'category' && note.categoryId === activeCategoryId;
    }

    return note.scope === activeScope && !note.categoryId;
  });
  const noteText = activeNote?.text ?? '';

  return (
    <main className="workspace">
      <div className="control-strip">
        <span>{isLoading ? 'Загрузка данных...' : 'Изменено 2ч назад'}</span>
        <div className="control-actions">
          <button type="button" aria-label="Поиск">
            <img src={assetUrl('search-icon.svg')} alt="" />
          </button>
          <button type="button" aria-label="Дополнительно">
            <img src={assetUrl('tochki-icon.svg')} alt="" />
          </button>
        </div>
      </div>

      <section className="task-panel" aria-labelledby="task-panel-title">
        <div className="task-panel-heading">
          <h1 id="task-panel-title">{title}</h1>
          {activeScope === 'category' ? (
            <button type="button" aria-label="Добавить в избранное">
              <img src={assetUrl('favorite-container-star.svg')} alt="" />
            </button>
          ) : null}
        </div>

        {error ? <div className="app-error">{error}</div> : null}

        <div className="task-list">
          {visibleTasks.map((task, index) => (
            <TaskListItem key={task.id} task={task} withSeparator={index > 0} onEditTask={onEditTask} />
          ))}
        </div>

        <button className="inline-add-task" type="button" onClick={onAddTask}>
          <img src={assetUrl('add-task-icon.svg')} alt="" />
          <span>Добавить задачу</span>
        </button>

        <label className="notes-field">
          <span>Заметки</span>
          <textarea
            value={noteText}
            onChange={(event) => void updateNote(activeScope, event.target.value, activeCategoryId)}
            placeholder="Напишите что-нибудь важное, чтобы не забыть."
          />
        </label>
      </section>
    </main>
  );
};

const isTaskVisible = (task: Task, activeScope: TaskScope, activeCategoryId: string) => {
  if (activeScope === 'category') {
    return task.categoryId === activeCategoryId;
  }

  return task.scope === activeScope;
};
