import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shieldai.app',
  appName: 'ShieldAI',
  webDir: 'dist',
  plugins: {
    PrivacyScreen: {
      enable: true,
    }
  }
};

export default config;
