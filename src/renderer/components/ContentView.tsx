import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, KeyboardEvent } from 'react';
import type { AppSettings, Task, TaskScope } from '../../shared/types';
import type { TranslationKey } from '../i18n';
import { translate, useTranslator } from '../i18n';
import { assetUrl } from '../lib/assets';
import { useTaskStore } from '../store/useTaskStore';
import { TaskListItem } from './TaskListItem';

interface ContentViewProps {
  onAddTask: (dueDate?: string) => void;
  onEditTask: (task: Task) => void;
  onMouseEnter?: () => void;
}

interface WeekGroup {
  date?: string;
  label: string;
  tasks: Task[];
}

const titleKeys: Record<TaskScope, TranslationKey> = {
  inbox: 'inbox',
  today: 'today',
  week: 'week',
  category: 'categories',
};

const dayLabels = {
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};

export const ContentView = ({ onAddTask, onEditTask, onMouseEnter }: ContentViewProps) => {
  const activeScope = useTaskStore((state) => state.activeScope);
  const activeCategoryId = useTaskStore((state) => state.activeCategoryId);
  const categories = useTaskStore((state) => state.categories);
  const error = useTaskStore((state) => state.error);
  const isLoading = useTaskStore((state) => state.isLoading);
  const tasks = useTaskStore((state) => state.tasks);
  const notes = useTaskStore((state) => state.notes);
  const settings = useTaskStore((state) => state.settings);
  const deleteCategory = useTaskStore((state) => state.deleteCategory);
  const deleteTasks = useTaskStore((state) => state.deleteTasks);
  const toggleCategoryFavorite = useTaskStore((state) => state.toggleCategoryFavorite);
  const updateNote = useTaskStore((state) => state.updateNote);
  const [clearConfirmationTaskIds, setClearConfirmationTaskIds] = useState<string[]>([]);
  const [deleteCategoryConfirmation, setDeleteCategoryConfirmation] = useState<{ id: string; title: string }>();
  const [isControlMenuOpen, setControlMenuOpen] = useState(false);
  const [refreshLabel, setRefreshLabel] = useState(getTodayRefreshLabel(settings.todayRefreshTime, settings.language));
  const [draftNoteText, setDraftNoteText] = useState('');
  const [timeTick, setTimeTick] = useState(Date.now());
  const t = useTranslator();
  const controlMenuRef = useRef<HTMLDivElement>(null);
  const notesTextareaRef = useRef<HTMLTextAreaElement>(null);
  const saveNoteTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const updateRefreshLabel = () => setRefreshLabel(getTodayRefreshLabel(settings.todayRefreshTime, settings.language));
    updateRefreshLabel();
    const intervalId = window.setInterval(updateRefreshLabel, 60_000);

    return () => window.clearInterval(intervalId);
  }, [settings.language, settings.todayRefreshTime]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setTimeTick(Date.now()), 30_000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!isControlMenuOpen) {
      return;
    }

    const handleMouseDown = (event: MouseEvent) => {
      if (!controlMenuRef.current?.contains(event.target as Node)) {
        setControlMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isControlMenuOpen]);

  const activeCategory = categories.find((category) => category.id === activeCategoryId);
  const title = activeScope === 'category' ? activeCategory?.title ?? t(titleKeys.category) : t(titleKeys[activeScope]);
  const visibleTasks = sortTasks(
    tasks.filter((task) => isTaskVisible(task, activeScope, activeCategoryId, settings)),
    settings,
    activeScope,
  );
  const weekGroups = activeScope === 'week' ? buildWeekGroups(tasks, settings) : [];
  const activeNote = notes.find((note) => {
    if (activeScope === 'category') {
      return note.scope === 'category' && note.categoryId === activeCategoryId;
    }

    return note.scope === activeScope && !note.categoryId;
  });
  const noteText = activeNote?.text ?? '';
  const lastModifiedLabel = getLastModifiedLabel(
    [
      activeCategory?.updatedAt,
      activeNote?.updatedAt,
      ...visibleTasks.map((task) => task.updatedAt),
      ...weekGroups.flatMap((group) => group.tasks.map((task) => task.updatedAt)),
    ],
    settings.language,
    timeTick,
  );
  const tasksToClear = activeScope === 'week' ? weekGroups.flatMap((group) => group.tasks) : visibleTasks;
  const addTaskIcon = settings.theme === 'dark' ? 'add-task-icon-dt.svg' : 'add-task-icon.svg';
  const clearConfirmCancelLabel = settings.language === 'en' ? 'Cancel' : 'Отмена';

  const handleClearPage = async () => {
    const taskIds = tasksToClear.map((task) => task.id);

    if (taskIds.length === 0) {
      setControlMenuOpen(false);
      return;
    }

    setControlMenuOpen(false);

    if (settings.confirmTaskDelete) {
      setClearConfirmationTaskIds(taskIds);
      return;
    }

    await deleteTasks(taskIds);
  };

  const handleConfirmClearPage = async () => {
    const taskIds = clearConfirmationTaskIds;
    setClearConfirmationTaskIds([]);
    await deleteTasks(taskIds);
  };

  const handleDeleteCategory = async () => {
    if (!activeCategory) {
      return;
    }

    setControlMenuOpen(false);

    if (settings.confirmCategoryDelete) {
      setDeleteCategoryConfirmation({ id: activeCategory.id, title: activeCategory.title });
      return;
    }

    await deleteCategory(activeCategory.id);
  };

  const handleConfirmDeleteCategory = async () => {
    const category = deleteCategoryConfirmation;

    if (!category) {
      return;
    }

    setDeleteCategoryConfirmation(undefined);
    await deleteCategory(category.id);
  };

  useEffect(() => {
    setDraftNoteText(noteText);
  }, [activeCategoryId, activeScope, noteText]);

  useEffect(() => {
    const editor = notesTextareaRef.current;

    if (!editor) {
      return;
    }

    const computedStyle = window.getComputedStyle(editor);
    const lineHeight = Number.parseFloat(computedStyle.lineHeight) || 22;
    const maxHeight = lineHeight * settings.notesLineLimit;

    editor.style.height = 'auto';
    editor.style.height = `${Math.min(editor.scrollHeight, maxHeight)}px`;
    editor.style.overflowY = editor.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [activeCategoryId, activeScope, draftNoteText, settings.notesLineLimit]);

  useEffect(() => () => {
    if (saveNoteTimeoutRef.current) {
      window.clearTimeout(saveNoteTimeoutRef.current);
    }
  }, []);

  const handleNoteChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const limitedText = limitNoteLines(event.target.value, settings.notesLineLimit);
    setDraftNoteText(limitedText);

    if (saveNoteTimeoutRef.current) {
      window.clearTimeout(saveNoteTimeoutRef.current);
    }

    saveNoteTimeoutRef.current = window.setTimeout(() => {
      void updateNote(activeScope, limitedText, activeCategoryId);
    }, settings.autosaveNotesIntervalSeconds * 1000);
  };

  const flushNote = () => {
    if (saveNoteTimeoutRef.current) {
      window.clearTimeout(saveNoteTimeoutRef.current);
      saveNoteTimeoutRef.current = undefined;
    }

    if (draftNoteText !== noteText) {
      void updateNote(activeScope, draftNoteText, activeCategoryId);
    }
  };

  const handleNoteKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const editor = event.currentTarget;

    if (
      event.key === 'Enter' &&
      wouldExceedNoteLineLimit(editor.value, editor.selectionStart, editor.selectionEnd, settings.notesLineLimit)
    ) {
      event.preventDefault();
    }
  };

  return (
    <main className="workspace" onMouseEnter={onMouseEnter}>
      <div className="control-strip">
        <div className="control-status">
          {isLoading || (settings.showLastModified && lastModifiedLabel) ? (
            <span>{isLoading ? t('loadingData') : lastModifiedLabel}</span>
          ) : null}
          {activeScope === 'today' ? <span className="refresh-status">{refreshLabel}</span> : null}
        </div>
        <div className="control-actions">
          {activeScope === 'category' && activeCategory ? (
            <button
              className="category-page-favorite-status"
              type="button"
              aria-label={activeCategory.isFavorite ? t('favoriteRemove') : t('favoriteAdd')}
              onClick={() => void toggleCategoryFavorite(activeCategory.id)}
            >
              <img
                className={
                  activeCategory.isFavorite
                    ? 'control-bar-star-icon preserve-icon-color'
                    : 'control-bar-star-icon'
                }
                src={assetUrl(activeCategory.isFavorite ? 'control-bar-star.svg' : 'control-bar-star-empty.svg')}
                alt=""
              />
            </button>
          ) : null}
          <div className="control-menu-wrapper" ref={controlMenuRef}>
            <button
              type="button"
              aria-label={t('pageActions')}
              aria-expanded={isControlMenuOpen}
              onClick={() => setControlMenuOpen((value) => !value)}
            >
              <img src={assetUrl('tochki-icon.svg')} alt="" />
            </button>
            {isControlMenuOpen ? (
              <div className="control-menu" role="menu">
                <button type="button" role="menuitem" onClick={() => void handleClearPage()}>
                  <img src={assetUrl('control-eraser-icon.svg')} alt="" />
                  <span>{t('clear')}</span>
                </button>
                {activeScope === 'category' && activeCategory ? (
                  <button className="danger" type="button" role="menuitem" onClick={() => void handleDeleteCategory()}>
                    <img className="preserve-icon-color" src={assetUrl('control-delete-icon.svg')} alt="" />
                    <span>{t('delete')}</span>
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <section
        className={`task-panel task-panel-${activeScope}`}
        key={`${activeScope}-${activeCategoryId}`}
        aria-labelledby="task-panel-title"
      >
        <div className="task-panel-heading">
          <h1 id="task-panel-title">{title}</h1>
        </div>

        {error ? <div className="app-error">{error}</div> : null}

        {activeScope === 'week' ? (
          <WeekTaskList groups={weekGroups} onAddTask={onAddTask} onEditTask={onEditTask} settings={settings} />
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
            onClick={() => onAddTask(activeScope === 'today' ? getTodayDate(settings.todayRefreshTime) : undefined)}
          >
            <img className="preserve-icon-color" src={assetUrl(addTaskIcon)} alt="" />
            <span>{t('addTask')}</span>
          </button>
        ) : null}

        <label className="notes-field">
          <span>{t('notes')}</span>
          <textarea
            ref={notesTextareaRef}
            value={draftNoteText}
            rows={1}
            onChange={handleNoteChange}
            onBlur={flushNote}
            onKeyDown={handleNoteKeyDown}
            placeholder={t('writeNote')}
          />
        </label>
      </section>
      {clearConfirmationTaskIds.length > 0 ? (
        <ConfirmDialog
          cancelLabel={clearConfirmCancelLabel}
          confirmLabel={t('clear')}
          message={t('clearCurrentSectionConfirm')}
          onCancel={() => setClearConfirmationTaskIds([])}
          onConfirm={() => void handleConfirmClearPage()}
          title={t('clear')}
        />
      ) : null}
      {deleteCategoryConfirmation ? (
        <ConfirmDialog
          cancelLabel={clearConfirmCancelLabel}
          confirmLabel={t('delete')}
          message={t('deleteCategoryConfirm', { title: deleteCategoryConfirmation.title })}
          onCancel={() => setDeleteCategoryConfirmation(undefined)}
          onConfirm={() => void handleConfirmDeleteCategory()}
          title={t('delete')}
        />
      ) : null}
    </main>
  );
};

const ConfirmDialog = ({
  cancelLabel,
  confirmLabel,
  message,
  onCancel,
  onConfirm,
  title,
}: {
  cancelLabel: string;
  confirmLabel: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}) => (
  <div className="dialog-overlay" role="presentation" onMouseDown={onCancel}>
    <section className="confirm-dialog" aria-label={message} onMouseDown={(event) => event.stopPropagation()}>
      <div className="dialog-heading">
        <h2>{title}</h2>
        <button type="button" aria-label={cancelLabel} onClick={onCancel}>
          <img src={assetUrl('popup-close-icon.svg')} alt="" />
        </button>
      </div>
      <p>{message}</p>
      <div className="dialog-actions">
        <button type="button" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button type="button" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </section>
  </div>
);

const WeekTaskList = ({
  groups,
  onAddTask,
  onEditTask,
  settings,
}: {
  groups: WeekGroup[];
  onAddTask: (dueDate?: string) => void;
  onEditTask: (task: Task) => void;
  settings: AppSettings;
}) => {
  const updateTask = useTaskStore((state) => state.updateTask);
  const today = getTodayDate(settings.todayRefreshTime);
  const addTaskIcon = settings.theme === 'dark' ? 'add-task-icon-dt.svg' : 'add-task-icon.svg';

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
        const isToday = settings.highlightTodayInWeek && group.date === today;

        return (
          <section
            className={isToday ? 'week-day today' : 'week-day'}
            key={group.date ?? 'without-date'}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(event, group.date)}
          >
            <div className="week-day-heading">
              {group.date ? <time>{formatShortDate(group.date)}</time> : <span className="date-pill neutral">{translate(settings.language, 'noDate')}</span>}
              <h2>{group.label}</h2>
              <button className="week-day-add" type="button" onClick={() => onAddTask(group.date)} aria-label={translate(settings.language, 'addTask')}>
                <img className="preserve-icon-color" src={assetUrl(addTaskIcon)} alt="" />
              </button>
            </div>
            <div className="task-list compact">
              {group.tasks.length > 0 ? (
                group.tasks.map((task, index) => (
                  <TaskListItem
                    key={task.id}
                    task={task}
                    showCategory
                    withSeparator={index > 0}
                    onEditTask={onEditTask}
                  />
                ))
              ) : (
                <div className="empty-day">{translate(settings.language, 'dragTaskHere')}</div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
};

const isTaskVisible = (task: Task, activeScope: TaskScope, activeCategoryId: string, settings: AppSettings) => {
  if (activeScope === 'category') {
    return task.categoryId === activeCategoryId;
  }

  if (activeScope === 'today') {
    const today = getTodayDate(settings.todayRefreshTime);
    return (
      (settings.includeTodayDueTasks && task.dueDate === today) ||
      isActiveOverdueTask(task, settings) ||
      (task.scope === 'today' && task.status === 'active')
    );
  }

  if (activeScope === 'week') {
    return task.dueDate ? isTaskInCurrentWeek(task) : task.scope === 'week';
  }

  return task.scope === activeScope;
};

const sortTasks = (tasks: Task[], settings: AppSettings, activeScope: TaskScope) => {
  const sortedTasks = [...tasks];

  if (activeScope === 'today' && settings.showTodayOverdueFirst) {
    sortedTasks.sort((first, second) => Number(isActiveOverdueTask(second, settings)) - Number(isActiveOverdueTask(first, settings)));
  }

  if (settings.taskSortMode === 'date') {
    sortedTasks.sort((first, second) => (first.dueDate ?? '9999-12-31').localeCompare(second.dueDate ?? '9999-12-31'));
  }

  if (settings.taskSortMode === 'priority') {
    sortedTasks.sort((first, second) => first.priority - second.priority);
  }

  if (activeScope === 'today' && settings.showTodayOverdueFirst) {
    sortedTasks.sort((first, second) => Number(isActiveOverdueTask(second, settings)) - Number(isActiveOverdueTask(first, settings)));
  }

  return sortedTasks;
};

const limitNoteLines = (value: string, maxLines: number) => {
  const lines = value.split('\n');

  if (lines.length <= maxLines) {
    return value;
  }

  const visibleLines = lines.slice(0, maxLines - 1);
  const overflowLine = lines.slice(maxLines - 1).join(' ');

  return [...visibleLines, overflowLine].join('\n');
};

const wouldExceedNoteLineLimit = (value: string, selectionStart: number, selectionEnd: number, maxLines: number) => {
  const nextValue = `${value.slice(0, selectionStart)}\n${value.slice(selectionEnd)}`;

  return nextValue.split('\n').length > maxLines;
};

const buildWeekGroups = (tasks: Task[], settings: AppSettings): WeekGroup[] => {
  const weekDates = orderWeekDates(getCurrentWeekDates(), settings.weekOrderMode, settings.todayRefreshTime);
  const withoutDateTasks = tasks.filter((task) => task.scope === 'week' && !task.dueDate);
  const labels = dayLabels[settings.language];
  const dateGroups: WeekGroup[] = weekDates.map((date) => ({
    date,
    label: labels[getWeekdayIndex(date)],
    tasks: sortTasks(tasks.filter((task) => task.dueDate === date), settings, 'week'),
  }));

  if (!settings.showWeekNoDate) {
    return dateGroups;
  }

  return [
    {
      label: settings.language === 'en' ? 'Distributor' : 'Распределитель',
      tasks: sortTasks(withoutDateTasks, settings, 'week'),
    },
    ...dateGroups,
  ];
};

const isTaskInCurrentWeek = (task: Task) => {
  if (!task.dueDate) {
    return false;
  }

  return getCurrentWeekDates().includes(task.dueDate);
};

const isActiveOverdueTask = (task: Task, settings: AppSettings) =>
  task.status === 'active' && Boolean(task.dueDate && task.dueDate < getTodayDate(settings.todayRefreshTime));

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

const orderWeekDates = (weekDates: string[], mode: AppSettings['weekOrderMode'], todayRefreshTime?: string) => {
  if (mode !== 'today') {
    return weekDates;
  }

  const todayIndex = weekDates.indexOf(getTodayDate(todayRefreshTime));
  return todayIndex < 0 ? weekDates : [...weekDates.slice(todayIndex), ...weekDates.slice(0, todayIndex)];
};

const getWeekdayIndex = (dateValue: string) => {
  const date = new Date(`${dateValue}T00:00:00`);
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
};

const getTodayDate = (refreshTime?: string) => {
  const date = new Date();

  if (refreshTime) {
    const [hours, minutes] = refreshTime.split(':').map((part) => Number.parseInt(part, 10));
    const refreshMoment = new Date(date);
    refreshMoment.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);

    if (date.getTime() < refreshMoment.getTime()) {
      date.setDate(date.getDate() - 1);
    }
  }

  return toDateInputValue(date);
};

const getTodayRefreshLabel = (refreshTime: string, language: AppSettings['language']) => {
  const now = new Date();
  const [hours, minutes] = refreshTime.split(':').map((part) => Number.parseInt(part, 10));
  const nextRefresh = new Date(now);
  nextRefresh.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);

  if (nextRefresh.getTime() <= now.getTime()) {
    nextRefresh.setDate(nextRefresh.getDate() + 1);
  }

  const minutesLeft = Math.max(1, Math.ceil((nextRefresh.getTime() - now.getTime()) / 60_000));
  const hoursLeft = Math.floor(minutesLeft / 60);
  const remainingMinutes = minutesLeft % 60;

  if (hoursLeft > 0 && remainingMinutes === 0) {
    return language === 'en' ? `Refresh in ${hoursLeft}h` : `Обновление через ${hoursLeft}ч`;
  }

  if (hoursLeft > 0) {
    return language === 'en'
      ? `Refresh in ${hoursLeft}h ${remainingMinutes}m`
      : `Обновление через ${hoursLeft}ч ${remainingMinutes}м`;
  }

  return language === 'en' ? `Refresh in ${minutesLeft}m` : `Обновление через ${minutesLeft}м`;
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

const getLastModifiedLabel = (
  values: Array<string | undefined>,
  language: AppSettings['language'],
  timeTick: number,
) => {
  const latestTime = values
    .map((value) => parseDateTime(value))
    .filter((value): value is number => typeof value === 'number')
    .sort((first, second) => second - first)[0];

  if (!latestTime) {
    return undefined;
  }

  const diffSeconds = Math.max(0, Math.floor((timeTick - latestTime) / 1000));

  if (diffSeconds < 60) {
    return translate(language, 'updatedJustNow');
  }

  const diffMinutes = Math.floor(diffSeconds / 60);

  if (diffMinutes === 1) {
    return translate(language, 'updatedMinuteAgo');
  }

  if (diffMinutes < 60) {
    return translate(language, 'updatedMinutesAgo', { value: diffMinutes });
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return translate(language, 'updatedHoursAgo', { value: diffHours });
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return translate(language, 'updatedDaysAgo', { value: diffDays });
  }

  return translate(language, 'updatedMonthsAgo', { value: Math.floor(diffDays / 30) });
};

const parseDateTime = (value: string | undefined) => {
  if (!value) {
    return undefined;
  }

  const date = new Date(toDateTimeInput(value));
  return Number.isNaN(date.getTime()) ? undefined : date.getTime();
};

const toDateTimeInput = (value: string) => {
  if (value.includes('T')) {
    return value;
  }

  return `${value.replace(' ', 'T')}Z`;
};
