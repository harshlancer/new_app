import notifee, { AndroidImportance } from '@notifee/react-native';

export const NotificationService = {
  initialize: async () => {
    // Request permissions (required for iOS, recommended for Android 13+)
    await notifee.requestPermission();
  },

  showUpdateNotification: async (title, body) => {
    // Create a generic channel
    const channelId = await notifee.createChannel({
      id: 'default_updates',
      name: 'Standard Updates',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });

    // Display notification
    await notifee.displayNotification({
      title,
      body,
      android: {
        channelId,
        smallIcon: 'ic_roomflow',
        sound: 'default',
        pressAction: {
          id: 'default',
        },
      },
    });
  },

  showUrgentNotification: async (title, body) => {
    // Create high-importance channel for urgent tasks
    const channelId = await notifee.createChannel({
      id: 'urgent_tasks',
      name: 'Urgent Tasks',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });

    await notifee.displayNotification({
      title,
      body,
      android: {
        channelId,
        color: '#ef4444',
        smallIcon: 'ic_roomflow',
        sound: 'default',
        pressAction: {
          id: 'urgent',
        },
      },
    });
  }
};
