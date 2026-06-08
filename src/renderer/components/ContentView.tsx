import { useEffect, useState } from 'react';
import type { DragEvent } from 'react';
import type { Task, TaskScope } from '../../shared/types';
import { assetUrl } from '../lib/assets';
import { useTaskStore } from '../store/useTaskStore';
import { TaskListItem } from './TaskListItem';

interface ContentViewProps {
  onAddTask: (dueDate?: string) => void;
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

const dayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const ContentView = ({ onAddTask, onEditTask }: ContentViewProps) => {
  const activeScope = useTaskStore((state) => state.activeScope);
  const activeCategoryId = useTaskStore((state) => state.activeCategoryId);
  const categories = useTaskStore((state) => state.categories);
  const error = useTaskStore((state) => state.error);
  const isLoading = useTaskStore((state) => state.isLoading);
  const tasks = useTaskStore((state) => state.tasks);
  const notes = useTaskStore((state) => state.notes);
  const updateNote = useTaskStore((state) => state.updateNote);
  const [refreshLabel, setRefreshLabel] = useState(getTodayRefreshLabel());

  useEffect(() => {
    const updateRefreshLabel = () => setRefreshLabel(getTodayRefreshLabel());
    updateRefreshLabel();
    const intervalId = window.setInterval(updateRefreshLabel, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

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
        <div className="control-status">
          <span>{isLoading ? 'Загрузка данных...' : 'Изменено 2ч назад'}</span>
          {activeScope === 'today' ? <span className="refresh-status">{refreshLabel}</span> : null}
        </div>
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
          <WeekTaskList groups={weekGroups} onAddTask={onAddTask} onEditTask={onEditTask} />
        ) : (
          <div className="task-list">
            {visibleTasks.map((task, index) => (
              <TaskListItem key={task.id} task={task} withSeparator={index > 0} onEditTask={onEditTask} />
            ))}
          </div>
        )}

        {activeScope !== 'week' ? (
          <button
            className="inline-add-task"
            type="button"
            onClick={() => onAddTask(activeScope === 'today' ? getTodayDate() : undefined)}
          >
            <img src={assetUrl('add-task-icon.svg')} alt="" />
            <span>Добавить задачу</span>
          </button>
        ) : null}

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

const WeekTaskList = ({
  groups,
  onAddTask,
  onEditTask,
}: {
  groups: WeekGroup[];
  onAddTask: (dueDate?: string) => void;
  onEditTask: (task: Task) => void;
}) => {
  const updateTask = useTaskStore((state) => state.updateTask);
  const today = getTodayDate();

  const moveTaskToDate = async (taskId: string, dueDate?: string) => {
    const task = useTaskStore.getState().tasks.find((item) => item.id === taskId);

    if (!task) {
      return;
    }

    await updateTask({
      id: task.id,
      title: task.title,
      description: task.description,
      dueDate,
      dueLabel: task.dueLabel,
      priority: task.priority,
      scope: 'week',
      categoryId: task.categoryId,
    });
  };

  const handleDrop = (event: DragEvent<HTMLElement>, dueDate?: string) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('text/plain');
    void moveTaskToDate(taskId, dueDate);
  };

  return (
    <div className="week-list">
      {groups.map((group) => {
        const isToday = group.date === today;

        return (
          <section
            className={isToday ? 'week-day today' : 'week-day'}
            key={group.date ?? 'without-date'}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(event, group.date)}
          >
            <div className="week-day-heading">
              {group.date ? <time>{formatShortDate(group.date)}</time> : <span className="date-pill neutral">Без даты</span>}
              <h2>{group.label}</h2>
              <button className="week-day-add" type="button" onClick={() => onAddTask(group.date)} aria-label="Добавить задачу">
                <img src={assetUrl('add-task-icon.svg')} alt="" />
              </button>
            </div>
            <div className="task-list compact">
              {group.tasks.length > 0 ? (
                group.tasks.map((task, index) => (
                  <TaskListItem key={task.id} task={task} withSeparator={index > 0} onEditTask={onEditTask} />
                ))
              ) : (
                <div className="empty-day">Перетащите задачу сюда</div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
};

const isTaskVisible = (task: Task, activeScope: TaskScope, activeCategoryId: string) => {
  if (activeScope === 'category') {
    return task.categoryId === activeCategoryId;
  }

  if (activeScope === 'today') {
    return task.dueDate === getTodayDate() || isActiveOverdueTask(task) || (task.scope === 'today' && task.status === 'active');
  }

  if (activeScope === 'week') {
    return isTaskInCurrentWeek(task) || task.scope === 'week';
  }

  return task.scope === activeScope;
};

const buildWeekGroups = (tasks: Task[]): WeekGroup[] => {
  const weekDates = getCurrentWeekDates();
  const withoutDateTasks = tasks.filter((task) => task.scope === 'week' && !task.dueDate);
  const groups: WeekGroup[] = [
    {
      label: 'Распределитель',
      tasks: withoutDateTasks,
    },
    ...weekDates.map((date, index) => ({
      date,
      label: dayLabels[index],
      tasks: tasks.filter((task) => task.dueDate === date),
    })),
  ];

  return groups;
};

const isTaskInCurrentWeek = (task: Task) => {
  if (!task.dueDate) {
    return false;
  }

  return getCurrentWeekDates().includes(task.dueDate);
};

const isActiveOverdueTask = (task: Task) =>
  task.status === 'active' && Boolean(task.dueDate && task.dueDate < getTodayDate());

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

const getTodayRefreshLabel = () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setHours(24, 0, 0, 0);
  const minutesLeft = Math.max(1, Math.ceil((tomorrow.getTime() - now.getTime()) / 60_000));
  const hoursLeft = Math.floor(minutesLeft / 60);
  const remainingMinutes = minutesLeft % 60;

  if (hoursLeft > 0 && remainingMinutes === 0) {
    return `Обновление через ${hoursLeft}ч`;
  }

  if (hoursLeft > 0) {
    return `Обновление через ${hoursLeft}ч ${remainingMinutes}м`;
  }

  return `Обновление через ${minutesLeft}м`;
};

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatShortDate = (dateValue: string) => {
  const [_year, month, day] = dateValue.split('-');
  return `${day}.${month}`;
};
