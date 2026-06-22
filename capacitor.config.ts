import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ke.go.embu.mediprocure.procurbosse',
  appName: 'ProcurBosse',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: [
      'https://yvjfehnzbzjliizjvuhq.supabase.co',
      'https://procurbosse.edgeone.app',
    ],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0a2558',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#0a2558',
    },
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0a2558',
    allowsLinkPreview: true,
    scrollEnabled: true,
  },
  android: {
    backgroundColor: '#0a2558',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
