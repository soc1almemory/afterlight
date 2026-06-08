/// <reference types="vite/client" />

interface AfterlightWindowControls {
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<void>;
  close: () => Promise<void>;
}

interface AfterlightSystemInfo {
  platform: NodeJS.Platform;
  versions: NodeJS.ProcessVersions;
}

interface Window {
  afterlightWindow?: AfterlightWindowControls;
  afterlightSystem?: AfterlightSystemInfo;
}
