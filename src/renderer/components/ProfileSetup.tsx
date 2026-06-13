import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { LanguageCode } from '../../shared/types';
import { assetUrl } from '../lib/assets';
import { useTaskStore } from '../store/useTaskStore';

const setupCopy = {
  ru: {
    close: 'Закрыть',
    email: 'Email',
    heading: 'Настройте профиль',
    loading: 'Сохранение...',
    maximize: 'Развернуть',
    minimize: 'Свернуть',
    name: 'Имя пользователя',
    password: 'Пароль',
    passwordPlaceholder: 'Введите пароль',
    start: 'Начать работу',
    subheading: 'Создайте локальный профиль и рабочее пространство для задач.',
    language: 'Язык интерфейса',
    upload: 'Загрузить аватар',
    deleteAvatar: 'Удалить аватар',
    workspace: 'Рабочее пространство',
    workspacePlaceholder: 'Личное пространство',
  },
  en: {
    close: 'Close',
    email: 'Email',
    heading: 'Set up your profile',
    loading: 'Saving...',
    maximize: 'Maximize',
    minimize: 'Minimize',
    name: 'Username',
    password: 'Password',
    passwordPlaceholder: 'Enter password',
    start: 'Start working',
    subheading: 'Create a local profile and workspace for your tasks.',
    language: 'Interface language',
    upload: 'Upload avatar',
    deleteAvatar: 'Remove avatar',
    workspace: 'Workspace',
    workspacePlaceholder: 'Personal workspace',
  },
} as const;

export const ProfileSetup = () => {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const completeProfileSetup = useTaskStore((state) => state.completeProfileSetup);
  const error = useTaskStore((state) => state.error);
  const settings = useTaskStore((state) => state.settings);
  const updateSettings = useTaskStore((state) => state.updateSettings);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | undefined>();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [workspaceTitle, setWorkspaceTitle] = useState('');
  const [isSaving, setSaving] = useState(false);
  const controls = window.afterlightWindow;
  const canSubmit = Boolean(name.trim() && workspaceTitle.trim() && email.trim() && password.trim());
  const copy = setupCopy[settings.language];
  const defaultAvatar = assetUrl(settings.theme === 'dark' ? 'default-avatar-dark.png' : 'default-avatar-light.png');
  const handleLanguageChange = (language: LanguageCode) => {
    if (language !== settings.language) {
      void updateSettings({ language });
    }
  };

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    setSaving(true);
    try {
      await completeProfileSetup({
        avatarDataUrl,
        email,
        name,
        password,
        workspaceTitle,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="setup-shell">
      <header className="setup-titlebar">
        <div className="setup-brand">
          <img className="preserve-icon-color" src={assetUrl('afterlight-icon.svg')} alt="" />
          <span>Afterlight</span>
        </div>
        <div className="drag-region" />
        <div className="window-actions">
          <button type="button" aria-label={copy.minimize} onClick={() => void controls?.minimize()}>
            <img src={assetUrl('Minimize.svg')} alt="" />
          </button>
          <button type="button" aria-label={copy.maximize} onClick={() => void controls?.toggleMaximize()}>
            <img src={assetUrl('Maximize.svg')} alt="" />
          </button>
          <button type="button" aria-label={copy.close} onClick={() => void controls?.close()}>
            <img src={assetUrl('Close.svg')} alt="" />
          </button>
        </div>
      </header>

      <main className="setup-workspace">
        <form className="setup-panel" onSubmit={handleSubmit}>
          <div className="setup-heading">
            <h1>{copy.heading}</h1>
            <p>{copy.subheading}</p>
          </div>

          <div className="setup-avatar-block">
            <div className="setup-avatar-shell">
              <img
                className="setup-avatar"
                src={avatarDataUrl ?? defaultAvatar}
                alt=""
              />
              <button
                className="delete-avatar-button"
                type="button"
                aria-label={copy.deleteAvatar}
                disabled={!avatarDataUrl}
                onClick={() => setAvatarDataUrl(undefined)}
              >
                <img src={assetUrl('settings-delete-avatar-icon.svg')} alt="" />
              </button>
            </div>
            <input
              ref={avatarInputRef}
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="visually-hidden"
              type="file"
              onChange={handleAvatarChange}
            />
            <button className="outline-accent-button" type="button" onClick={() => avatarInputRef.current?.click()}>
              {copy.upload}
            </button>
          </div>

          <div className="setup-fields">
            <label className="form-field">
              <span>{copy.name}</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Username" />
            </label>
            <label className="form-field">
              <span>{copy.workspace}</span>
              <input
                value={workspaceTitle}
                onChange={(event) => setWorkspaceTitle(event.target.value)}
                placeholder={copy.workspacePlaceholder}
              />
            </label>
            <label className="form-field">
              <span>{copy.email}</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="username@gmail.com" />
            </label>
            <label className="form-field">
              <span>{copy.password}</span>
              <input
                value={password}
                type="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder={copy.passwordPlaceholder}
              />
            </label>
          </div>

          {error ? <div className="app-error">{error}</div> : null}

          <button className="setup-submit" type="submit" disabled={!canSubmit || isSaving}>
            {isSaving ? copy.loading : copy.start}
          </button>

          <fieldset className="setup-language">
            <legend>{copy.language}</legend>
            <div className="category-icon-mode">
              <button
                className={settings.language === 'ru' ? 'active' : ''}
                type="button"
                onClick={() => handleLanguageChange('ru')}
              >
                Русский
              </button>
              <button
                className={settings.language === 'en' ? 'active' : ''}
                type="button"
                onClick={() => handleLanguageChange('en')}
              >
                English
              </button>
            </div>
          </fieldset>
        </form>
      </main>
    </div>
  );
};
