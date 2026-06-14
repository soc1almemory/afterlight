import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';

const runtimePackagePaths = [
  /^\/\.vite(\/|$)/,
  /^\/assets(\/|$)/,
  /^\/package\.json$/,
  /^\/node_modules$/,
  /^\/node_modules\/better-sqlite3(\/|$)/,
  /^\/node_modules\/bindings(\/|$)/,
  /^\/node_modules\/file-uri-to-path(\/|$)/,
];

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: 'assets/logo-main',
    ignore: (file) => {
      if (!file) {
        return false;
      }

      return !runtimePackagePaths.some((pattern) => pattern.test(file));
    },
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      name: 'afterlight',
      setupIcon: 'assets/logo-main.ico',
      iconUrl: 'https://raw.githubusercontent.com/soc1almemory/afterlight/main/assets/logo-main.ico',
    }),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      build: [
        {
          entry: 'src/main/main.ts',
          config: 'vite.main.config.ts',
        },
        {
          entry: 'src/main/preload.ts',
          config: 'vite.preload.config.ts',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
