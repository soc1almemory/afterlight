import type { Task, TaskScope } from '../../shared/types';
import { assetUrl } from '../lib/assets';
import { useTaskStore } from '../store/useTaskStore';
import { TaskListItem } from './TaskListItem';

interface ContentViewProps {
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
}

interface WeekGroup {
  date?: string;
  label: string;
  tasks: Task[];
}

const titles: Record<TaskScope, string> = {
  inbox: 'Входящие',
  today: 'Сегодня',
  week: 'Неделя',
  category: 'Категория',
};

const dayLabels = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

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
  const weekGroups = activeScope === 'week' ? buildWeekGroups(tasks) : [];
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

        {activeScope === 'week' ? (
          <WeekTaskList groups={weekGroups} onEditTask={onEditTask} />
        ) : (
          <div className="task-list">
            {visibleTasks.map((task, index) => (
              <TaskListItem key={task.id} task={task} withSeparator={index > 0} onEditTask={onEditTask} />
            ))}
          </div>
        )}

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

const WeekTaskList = ({ groups, onEditTask }: { groups: WeekGroup[]; onEditTask: (task: Task) => void }) => (
  <div className="week-list">
    {groups.map((group) => (
      <section className="week-day" key={group.date ?? 'without-date'}>
        <div className="week-day-heading">
          <h2>{group.label}</h2>
          {group.date ? <time>{formatDateLabel(group.date)}</time> : null}
        </div>
        <div className="task-list compact">
          {group.tasks.length > 0 ? (
            group.tasks.map((task, index) => (
              <TaskListItem key={task.id} task={task} withSeparator={index > 0} onEditTask={onEditTask} />
            ))
          ) : (
            <div className="empty-day">Нет задач</div>
          )}
        </div>
      </section>
    ))}
  </div>
);

const isTaskVisible = (task: Task, activeScope: TaskScope, activeCategoryId: string) => {
  if (activeScope === 'category') {
    return task.categoryId === activeCategoryId;
  }

  if (activeScope === 'today') {
    return task.dueDate === getTodayDate() || task.scope === 'today';
  }

  if (activeScope === 'week') {
    return isTaskInCurrentWeek(task) || task.scope === 'week';
  }

  return task.scope === activeScope;
};

const buildWeekGroups = (tasks: Task[]): WeekGroup[] => {
  const weekDates = getCurrentWeekDates();
  const groups: WeekGroup[] = weekDates.map((date, index) => ({
    date,
    label: dayLabels[index],
    tasks: tasks.filter((task) => task.dueDate === date),
  }));

  const withoutDateTasks = tasks.filter((task) => task.scope === 'week' && !task.dueDate);

  if (withoutDateTasks.length > 0) {
    groups.push({
      label: 'Без даты',
      tasks: withoutDateTasks,
    });
  }

  return groups;
};

const isTaskInCurrentWeek = (task: Task) => {
  if (!task.dueDate) {
    return false;
  }

  return getCurrentWeekDates().includes(task.dueDate);
};

const getCurrentWeekDates = () => {
  const today = new Date();
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(today.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_item, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return toDateInputValue(date);
  });
};

const getTodayDate = () => toDateInputValue(new Date());

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (dateValue: string) => {
  const [year, month, day] = dateValue.split('-');
  return `${day}.${month}.${year}`;
};
