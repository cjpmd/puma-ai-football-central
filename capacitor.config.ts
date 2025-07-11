
import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'app.lovable.5d10e51a846140f2a89960ebdbbef2fc',
  appName: 'puma-ai-football-central',
  webDir: 'dist',
  server: {
    url: 'https://5d10e51a-8461-40f2-a899-60ebdbbef2fc.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
