import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.healthcomm.app',
  appName: 'HealthComm',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    Health: {
      ios: {
        backgroundDelivery: true,
        // Request authorization for HealthKit on app launch
        autoAuth: false
      }
    }
  }
};

export default config;
