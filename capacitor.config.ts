
import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'app.lovable.5d10e51a846140f2a89960ebdbbef2fc',
  appName: 'puma-ai-football-central',
  webDir: 'dist',
  // Only use server.url for development with hot reload
  // Remove this for production native builds
  ...(process.env.NODE_ENV === 'development' && {
    server: {
      url: 'https://5d10e51a-8461-40f2-a899-60ebdbbef2fc.lovableproject.com?forceHideBadge=true',
      cleartext: true
    }
  }),
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
      // iOS specific configurations
      ios: {
        sound: 'default',
        badge: true,
        alert: true,
        clearBadgeOnLaunch: true
      },
      // Android specific configurations  
      android: {
        channelId: 'availability_requests',
        channelName: 'Team Availability Requests',
        channelDescription: 'Notifications for team event availability requests',
        importance: 4, // IMPORTANCE_HIGH
        visibility: 1, // VISIBILITY_PUBLIC
        sound: 'default',
        lights: true,
        vibration: true
      }
    },
    App: {
      handleDeepLinks: true
    }
  }
};

export default config;
