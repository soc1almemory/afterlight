import { app, autoUpdater, BrowserWindow } from 'electron';
import type { AppUpdateStatus } from '../shared/types';

const UPDATE_REPOSITORY = 'soc1almemory/afterlight';
const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const INITIAL_UPDATE_CHECK_DELAY_MS = 15_000;

let updateStatus: AppUpdateStatus = {
  currentVersion: app.getVersion(),
  status: 'idle',
};
let updateCheckInterval: NodeJS.Timeout | undefined;
let hasConfiguredAutoUpdater = false;
let isCheckingForUpdates = false;

export const getUpdateStatus = () => updateStatus;

export const configureAutoUpdates = (getMainWindow: () => BrowserWindow | null) => {
  if (hasConfiguredAutoUpdater) {
    return;
  }

  hasConfiguredAutoUpdater = true;

  if (!app.isPackaged || process.platform !== 'win32') {
    updateStatus = {
      currentVersion: app.getVersion(),
      status: 'unsupported',
    };
    return;
  }

  const updateFeedUrl = `https://update.electronjs.org/${UPDATE_REPOSITORY}/${process.platform}-${process.arch}/${app.getVersion()}`;
  autoUpdater.setFeedURL({ url: updateFeedUrl });

  const publishStatus = (status: Omit<AppUpdateStatus, 'currentVersion'>) => {
    updateStatus = {
      currentVersion: app.getVersion(),
      ...status,
    };
    getMainWindow()?.webContents.send('updates:status', updateStatus);
  };

  autoUpdater.on('checking-for-update', () => {
    isCheckingForUpdates = true;
    publishStatus({ status: 'checking' });
  });

  autoUpdater.on('update-available', () => {
    publishStatus({ status: 'available' });
  });

  autoUpdater.on('update-not-available', () => {
    isCheckingForUpdates = false;
    publishStatus({ status: 'not-available' });
  });

  autoUpdater.on('update-downloaded', (_event, _releaseNotes, releaseName, _releaseDate, updateUrl) => {
    isCheckingForUpdates = false;
    publishStatus({
      releaseName,
      status: 'downloaded',
      updateUrl,
    });
  });

  autoUpdater.on('error', (error) => {
    isCheckingForUpdates = false;
    publishStatus({
      error: error.message,
      status: 'error',
    });
  });

  const scheduleCheck = () => {
    void checkForUpdates();
  };

  setTimeout(scheduleCheck, INITIAL_UPDATE_CHECK_DELAY_MS);
  updateCheckInterval = setInterval(scheduleCheck, UPDATE_CHECK_INTERVAL_MS);
};

export const stopAutoUpdateChecks = () => {
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
    updateCheckInterval = undefined;
  }
};

export const checkForUpdates = async () => {
  if (!app.isPackaged || process.platform !== 'win32') {
    updateStatus = {
      currentVersion: app.getVersion(),
      status: 'unsupported',
    };
    return updateStatus;
  }

  if (isCheckingForUpdates) {
    return updateStatus;
  }

  try {
    autoUpdater.checkForUpdates();
  } catch (error) {
    updateStatus = {
      currentVersion: app.getVersion(),
      error: error instanceof Error ? error.message : 'Unable to check for updates.',
      status: 'error',
    };
  }

  return updateStatus;
};

export const installDownloadedUpdate = () => {
  autoUpdater.quitAndInstall();
};
