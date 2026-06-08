import { contextBridge, ipcRenderer } from 'electron';

const windowControls = {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
  close: () => ipcRenderer.invoke('window:close'),
};

contextBridge.exposeInMainWorld('afterlightWindow', windowControls);
contextBridge.exposeInMainWorld('afterlightSystem', {
  platform: process.platform,
  versions: process.versions,
});
