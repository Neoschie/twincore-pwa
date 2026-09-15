import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.twincore.app',
  appName: 'TwinCore',
  webDir: 'out',
  backgroundColor: '#0A0A0B',
  ios: {
    contentInset: 'automatic'
  }
};

export default config;
