import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import { assetUrl } from '../lib/assets';
import { useTaskStore } from '../store/useTaskStore';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsPage =
  | 'account'
  | 'main'
  | 'language'
  | 'theme'
  | 'sidebar'
  | 'reminders'
  | 'notifications'
  | 'telegram'
  | 'backups';

const settingsItems: Array<{ id: SettingsPage; icon: string; label: string }> = [
  { id: 'account', icon: 'settings-account-icon.svg', label: 'Аккаунт' },
  { id: 'main', icon: 'settings-main-icon.svg', label: 'Основное' },
  { id: 'language', icon: 'settings-language-icon.svg', label: 'Язык' },
  { id: 'theme', icon: 'settigns-theme-icon.svg', label: 'Тема' },
  { id: 'sidebar', icon: 'settigns-sidebar-icon.svg', label: 'Боковая панель' },
  { id: 'reminders', icon: 'settings-reminders-icon.svg', label: 'Напоминания' },
  { id: 'notifications', icon: 'settings-notifications-icon.svg', label: 'Уведомления' },
  { id: 'telegram', icon: 'settigns-telegram-icon.svg', label: 'Интеграция Telegram' },
  { id: 'backups', icon: 'settigns-copies-icon.svg', label: 'Резервные копии' },
];

export const SettingsDialog = ({ isOpen, onClose }: SettingsDialogProps) => {
  const [activePage, setActivePage] = useState<SettingsPage>('account');

  useEffect(() => {
    if (isOpen) {
      setActivePage('account');
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const activeItem = settingsItems.find((item) => item.id === activePage);

  return (
    <div className="settings-overlay" role="presentation" onMouseDown={onClose}>
      <section className="settings-dialog" aria-label="Настройки" onMouseDown={(event) => event.stopPropagation()}>
        <aside className="settings-nav">
          <h2>Настройки</h2>
          <nav aria-label="Разделы настроек">
            {settingsItems.map((item) => (
              <button
                className={activePage === item.id ? 'settings-nav-item active' : 'settings-nav-item'}
                key={item.id}
                type="button"
                onClick={() => setActivePage(item.id)}
              >
                <img src={assetUrl(item.icon)} alt="" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="settings-content">
          <button className="settings-close-button" type="button" aria-label="Закрыть настройки" onClick={onClose}>
            <img src={assetUrl('settings-close-icon.svg')} alt="" />
          </button>
          {activePage === 'account' ? <AccountSettings onAfterReset={onClose} /> : null}
          {activePage === 'main' ? <MainSettings /> : null}
          {activePage !== 'account' && activePage !== 'main' ? (
            <SettingsPlaceholder title={activeItem?.label ?? 'Раздел'} />
          ) : null}
        </main>
      </section>
    </div>
  );
};

const MainSettings = () => {
  const settings = useTaskStore((state) => state.settings);
  const updateSettings = useTaskStore((state) => state.updateSettings);

  return (
    <div className="settings-page main-settings-page">
      <SettingsGroup title="Запуск и восстановление">
        <SettingsSelect
          label="Стартовый раздел"
          value={settings.startSection}
          options={[
            ['inbox', 'Входящие'],
            ['today', 'Сегодня'],
            ['week', 'Неделя'],
            ['last', 'Последний открытый'],
          ]}
          onChange={(startSection) => void updateSettings({ startSection })}
        />
        <SettingsToggle
          checked={settings.restoreTabs}
          label="Восстанавливать открытые вкладки после запуска"
          onChange={(restoreTabs) => void updateSettings({ restoreTabs })}
        />
        <SettingsSelect
          label="Режим окна при запуске"
          value={settings.openMode}
          options={[
            ['normal', 'Обычный'],
            ['fullscreen', 'Полноэкранный'],
          ]}
          onChange={(openMode) => void updateSettings({ openMode })}
        />
      </SettingsGroup>

      <SettingsGroup title="Страница Сегодня">
        <SettingsTime
          label="Время ежедневного обновления списка"
          value={settings.todayRefreshTime}
          onChange={(todayRefreshTime) => void updateSettings({ todayRefreshTime })}
        />
        <SettingsToggle
          checked={settings.showTodayOverdueFirst}
          label="Показывать просроченные задачи сверху"
          onChange={(showTodayOverdueFirst) => void updateSettings({ showTodayOverdueFirst })}
        />
        <SettingsToggle
          checked={settings.includeTodayDueTasks}
          label="Автоматически добавлять задачи с сегодняшней датой в Сегодня"
          onChange={(includeTodayDueTasks) => void updateSettings({ includeTodayDueTasks })}
        />
      </SettingsGroup>

      <SettingsGroup title="Задачи">
        <SettingsSelect
          label="Сортировка задач"
          value={settings.taskSortMode}
          options={[
            ['date', 'По дате'],
            ['priority', 'По приоритету'],
            ['manual', 'Вручную'],
            ['created', 'По созданию'],
          ]}
          onChange={(taskSortMode) => void updateSettings({ taskSortMode })}
        />
        <SettingsToggle
          checked={settings.confirmTaskDelete}
          label="Подтверждать удаление задач"
          onChange={(confirmTaskDelete) => void updateSettings({ confirmTaskDelete })}
        />
      </SettingsGroup>

      <SettingsGroup title="Неделя">
        <SettingsSelect
          label="Порядок дней"
          value={settings.weekOrderMode}
          options={[
            ['monday', 'Понедельник всегда сверху'],
            ['today', 'Сегодняшний день сверху'],
          ]}
          onChange={(weekOrderMode) => void updateSettings({ weekOrderMode })}
        />
        <SettingsToggle
          checked={settings.showWeekNoDate}
          label="Показывать распределитель Без даты"
          onChange={(showWeekNoDate) => void updateSettings({ showWeekNoDate })}
        />
        <SettingsToggle
          checked={settings.highlightTodayInWeek}
          label="Подсвечивать текущий день"
          onChange={(highlightTodayInWeek) => void updateSettings({ highlightTodayInWeek })}
        />
      </SettingsGroup>

      <SettingsGroup title="Категории">
        <SettingsSelect
          label="Сортировка категорий"
          value={settings.categorySortMode}
          options={[
            ['created', 'По созданию'],
            ['alphabetical', 'По алфавиту'],
            ['manual', 'Вручную'],
            ['favorites', 'Избранные сверху'],
          ]}
          onChange={(categorySortMode) => void updateSettings({ categorySortMode })}
        />
        <SettingsToggle
          checked={settings.showCategoryCounts}
          label="Показывать счётчики задач у категорий"
          onChange={(showCategoryCounts) => void updateSettings({ showCategoryCounts })}
        />
        <SettingsToggle
          checked={settings.countCompletedTasks}
          label="Считать выполненные задачи в счётчиках"
          onChange={(countCompletedTasks) => void updateSettings({ countCompletedTasks })}
        />
        <SettingsToggle
          checked={settings.confirmCategoryDelete}
          label="Подтверждать удаление категории"
          onChange={(confirmCategoryDelete) => void updateSettings({ confirmCategoryDelete })}
        />
      </SettingsGroup>

      <SettingsGroup title="Заметки">
        <SettingsNumber
          label="Лимит строк заметок"
          min={5}
          max={200}
          value={settings.notesLineLimit}
          onChange={(notesLineLimit) => void updateSettings({ notesLineLimit })}
        />
      </SettingsGroup>

      <SettingsGroup title="Интерфейс">
        <SettingsToggle
          checked={settings.showSidebarCounts}
          label="Показывать счётчики в sidebar"
          onChange={(showSidebarCounts) => void updateSettings({ showSidebarCounts })}
        />
        <div className="settings-threshold-grid">
          <SettingsNumber
            label="Жёлтый счётчик от"
            min={1}
            max={999}
            value={settings.counterMediumAt}
            onChange={(counterMediumAt) => void updateSettings({ counterMediumAt })}
          />
          <SettingsNumber
            label="Тёмно-жёлтый от"
            min={1}
            max={999}
            value={settings.counterHighAt}
            onChange={(counterHighAt) => void updateSettings({ counterHighAt })}
          />
          <SettingsNumber
            label="Красный от"
            min={1}
            max={999}
            value={settings.counterCriticalAt}
            onChange={(counterCriticalAt) => void updateSettings({ counterCriticalAt })}
          />
        </div>
        <SettingsToggle
          checked={settings.showTabBar}
          label="Включить tab-bar"
          onChange={(showTabBar) => void updateSettings({ showTabBar })}
        />
        <SettingsToggle
          checked={settings.showLastModified}
          label="Показывать Изменено N минут назад"
          onChange={(showLastModified) => void updateSettings({ showLastModified })}
        />
      </SettingsGroup>

      <SettingsGroup title="Автосохранение и данные">
        <SettingsNumber
          label="Интервал автосохранения заметок, сек."
          min={1}
          max={30}
          value={settings.autosaveNotesIntervalSeconds}
          onChange={(autosaveNotesIntervalSeconds) => void updateSettings({ autosaveNotesIntervalSeconds })}
        />
      </SettingsGroup>
    </div>
  );
};

const AccountSettings = ({ onAfterReset }: { onAfterReset: () => void }) => {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const profile = useTaskStore((state) => state.profile);
  const resetProfile = useTaskStore((state) => state.resetProfile);
  const updateProfile = useTaskStore((state) => state.updateProfile);
  const updateWorkspace = useTaskStore((state) => state.updateWorkspace);
  const workspace = useTaskStore((state) => state.workspace);
  const [avatarDataUrl, setAvatarDataUrl] = useState(profile.avatarDataUrl);
  const [email, setEmail] = useState(profile.email ?? '');
  const [name, setName] = useState(profile.name);
  const [password, setPassword] = useState('');
  const [workspaceTitle, setWorkspaceTitle] = useState(workspace.title);
  const [isConfirmingReset, setConfirmingReset] = useState(false);
  const canSave = Boolean(name.trim() && workspaceTitle.trim() && email.trim());

  useEffect(() => {
    setAvatarDataUrl(profile.avatarDataUrl);
    setEmail(profile.email ?? '');
    setName(profile.name);
    setPassword('');
    setConfirmingReset(false);
  }, [profile]);

  useEffect(() => {
    setWorkspaceTitle(workspace.title);
  }, [workspace]);

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        setAvatarDataUrl(reader.result);
      }
    });
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSave) {
      return;
    }

    void updateProfile({
      ...profile,
      avatarDataUrl,
      email,
      isSetupComplete: true,
      name,
      password: password || undefined,
    });
    void updateWorkspace({ ...workspace, title: workspaceTitle });
  };

  const handleReset = async () => {
    await resetProfile();
    onAfterReset();
  };

  return (
    <div className="settings-page">
      <form className="settings-form" onSubmit={handleSubmit}>
        <section className="settings-section">
          <h3>Профиль</h3>
          <div className="settings-divider" />
          <div className="profile-settings">
            <div className="profile-avatar-block">
              <img className="profile-avatar" src={avatarDataUrl ?? assetUrl('default-avatar-light.png')} alt="" />
              <input
                ref={avatarInputRef}
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="visually-hidden"
                type="file"
                onChange={handleAvatarChange}
              />
              <button className="outline-accent-button" type="button" onClick={() => avatarInputRef.current?.click()}>
                Загрузить фото
              </button>
            </div>
            <div className="settings-field-stack">
              <label className="settings-field">
                <span>Введите имя</span>
                <input value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <label className="settings-field">
                <span>Название пространства</span>
                <input value={workspaceTitle} onChange={(event) => setWorkspaceTitle(event.target.value)} />
              </label>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h3>Безопасность</h3>
          <div className="settings-divider" />
          <div className="settings-field-stack wide">
            <label className="settings-field">
              <span>Email</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="settings-field">
              <span>Новый пароль</span>
              <input
                value={password}
                type="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Оставьте пустым, чтобы не менять"
              />
            </label>
          </div>
          <div className="settings-save-row">
            <button className="settings-save-button" type="submit" disabled={!canSave}>
              Сохранить изменения
            </button>
          </div>
          <div className="settings-divider" />
          {isConfirmingReset ? (
            <div className="settings-action danger confirm">
              <div>
                <h4>Подтвердите удаление аккаунта</h4>
                <p>Профиль, задачи, категории и заметки текущего рабочего пространства будут сброшены.</p>
              </div>
              <div className="settings-confirm-actions">
                <button type="button" onClick={() => setConfirmingReset(false)}>
                  Отмена
                </button>
                <button type="button" onClick={() => void handleReset()}>
                  Подтвердить
                </button>
              </div>
            </div>
          ) : (
            <SettingsAction
              danger
              title="Удаление аккаунта"
              description="Сбросить профиль и все данные текущего рабочего пространства."
              action="Удалить аккаунт"
              onAction={() => setConfirmingReset(true)}
            />
          )}
        </section>
      </form>
    </div>
  );
};

const SettingsAction = ({
  action,
  danger = false,
  description,
  onAction,
  title,
}: {
  action: string;
  danger?: boolean;
  description: string;
  onAction?: () => void;
  title: string;
}) => (
  <div className={danger ? 'settings-action danger' : 'settings-action'}>
    <div>
      <h4>{title}</h4>
      <p>{description}</p>
    </div>
    <button type="button" onClick={onAction}>
      {action}
    </button>
  </div>
);

const SettingsGroup = ({ children, title }: { children: ReactNode; title: string }) => (
  <section className="settings-section">
    <h3>{title}</h3>
    <div className="settings-divider" />
    <div className="settings-options-list">{children}</div>
  </section>
);

const SettingsToggle = ({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) => (
  <label className="settings-toggle-row">
    <span>{label}</span>
    <input checked={checked} type="checkbox" onChange={(event) => onChange(event.target.checked)} />
  </label>
);

const SettingsSelect = <T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: Array<[T, string]>;
  value: T;
}) => (
  <label className="settings-field settings-option-field">
    <span>{label}</span>
    <select value={value} onChange={(event) => onChange(event.target.value as T)}>
      {options.map(([optionValue, optionLabel]) => (
        <option key={optionValue} value={optionValue}>
          {optionLabel}
        </option>
      ))}
    </select>
  </label>
);

const SettingsTime = ({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) => (
  <label className="settings-field settings-option-field">
    <span>{label}</span>
    <input type="time" value={value} onChange={(event) => onChange(event.target.value)} />
  </label>
);

const SettingsNumber = ({
  label,
  max,
  min,
  onChange,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  value: number;
}) => (
  <label className="settings-field settings-option-field">
    <span>{label}</span>
    <input
      max={max}
      min={min}
      type="number"
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  </label>
);

const SettingsPlaceholder = ({ title }: { title: string }) => (
  <div className="settings-page">
    <section className="settings-section">
      <h3>{title}</h3>
      <div className="settings-divider" />
      <div className="settings-placeholder">
        <p>Раздел подготовлен. Наполнение и поведение будут добавлены на следующем этапе.</p>
      </div>
    </section>
  </div>
);
