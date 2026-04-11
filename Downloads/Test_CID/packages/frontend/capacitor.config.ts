import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.electra.app',
  appName: 'Electra',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    // Allow calling http:// API hosts from the https WebView (set VITE_BACKEND_URL to your server).
    allowMixedContent: true,
  },
};

export default config;
