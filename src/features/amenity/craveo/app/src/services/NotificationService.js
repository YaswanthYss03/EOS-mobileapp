import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { Alert, Vibration, Platform, DeviceEventEmitter, AppState } from 'react-native';
import { authAPI } from './api';

// The backend (Restaurent_App/backend) does not expose a notifications CRUD API
// (no equivalent of the old Supabase `notifications` table/RPCs) — that was
// explicitly out of scope for the REST migration. Calls that relied on it are
// left as stubs that throw a clear error instead of hitting a database the app
// can no longer reach. Every call site below is already wrapped in a try/catch
// that logs and continues (this is a best-effort background alarm-polling
// feature, not something that should crash the app), so throwing here just
// means "no alarm this poll" rather than a silent no-op.
const notMigrated = (feature) => {
  throw new Error(
    `NotificationService.${feature} is not yet migrated to the backend API. This relied on a Supabase 'notifications' table/RPC that the new REST backend does not expose.`
  );
};

class NotificationService {
  constructor() {
    this.sound = null;
    this.alarmInterval = null;
    this.isAlarmActive = false;
    this.notificationListener = null;
    this.responseListener = null;
    this.appStateListener = null;
    this.currentUserId = null;
    this.setupNotifications();
    this.setupNotificationListeners();
    this.setupAppStateListener();
  }

  async setupNotifications() {
    // Request notification permissions first
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('❌ Notification permission not granted!');
      return false;
    }

    console.log('✅ Notification permissions granted');

    // Configure notification behavior for both foreground and background
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Configure notification channel for Android (high priority for alarms)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('alarm-channel', {
        name: 'Food Ready Alarms',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500, 200, 500],
        lightColor: '#FF4444',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        enableLights: true,
        bypassDnd: true, // Bypass Do Not Disturb
      });
    }

    // Set up background task registration for iOS
    if (Platform.OS === 'ios') {
      // Register background modes in app.json: "background-modes": ["background-processing", "remote-notification"]
      console.log('📱 iOS notification setup complete');
    }

    return true;
  }

  setupNotificationListeners() {
    // Listen for notifications when app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 Notification received:', notification);
      
      if (notification.request.content.data.type === 'alarm') {
        // Handle notification when app is in foreground
        const { notificationId, userId } = notification.request.content.data;
        console.log('📱 Alarm notification received in foreground');
      }
    });

    // Listen for notification responses (when user taps notification)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapped:', response);
      
      if (response.notification.request.content.data.type === 'alarm') {
        const { notificationId, userId } = response.notification.request.content.data;
        console.log('📱 User tapped alarm notification');
        
        // Mark as read when tapped
        this.markNotificationAsRead(notificationId, userId);
        
        // Stop any playing alarms
        this.stopAlarmSound();
        this.isAlarmActive = false;
      }
    });
  }

  setupAppStateListener() {
    this.appStateListener = AppState.addEventListener('change', (nextAppState) => {
      console.log('📱 App state changed to:', nextAppState);
      
      if (nextAppState === 'active' && this.currentUserId) {
        // App came to foreground, check for notifications immediately
        console.log('🔍 App became active, checking for alarms...');
        this.checkForAlarms(this.currentUserId);
      }
    });
  }

  async loadAlarmSound() {
    try {
      console.log('🔊 Loading alarm sound...');
      
      // You'll need to add your 5-second alarm sound file to assets/sounds/
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/alarm_tone.mp3'), // Add your alarm file here
        { 
          shouldPlay: false,
          isLooping: false,
          volume: 1.0
        }
      );
      
      this.sound = sound;
      console.log('✅ Alarm sound loaded successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to load alarm sound:', error);
      return false;
    }
  }

  async playAlarmSound() {
    try {
      if (!this.sound) {
        const loaded = await this.loadAlarmSound();
        if (!loaded) return false;
      }

      console.log('🔊 Playing alarm sound...');
      await this.sound.replayAsync();
      
      // Vibrate for 5 seconds (pattern: vibrate 500ms, pause 200ms, repeat)
      const pattern = [0, 500, 200, 500, 200, 500, 200, 500, 200, 500];
      Vibration.vibrate(pattern);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to play alarm sound:', error);
      return false;
    }
  }

  async stopAlarmSound() {
    try {
      if (this.sound) {
        await this.sound.stopAsync();
      }
      Vibration.cancel();
      console.log('🔇 Alarm sound stopped');
    } catch (error) {
      console.error('❌ Failed to stop alarm sound:', error);
    }
  }

  async checkForAlarms(userId) {
    try {
      console.log(`🔔 Checking for alarms for user ${userId}...`);
      
      // Get user from SecureStore
      const userStr = await SecureStore.getItemAsync('userData');
      if (!userStr) {
        console.log('❌ No user found in SecureStore');
        return;
      }
      
      const user = JSON.parse(userStr);
      console.log('👤 User data from storage:', { user_id: user.user_id, user_type: user.user_type });

      // Check current user_type from the backend instead of cached data. This
      // used to be a direct `supabase.from('user_table')` query; GET /auth/me
      // (via authAPI.getUserProfile) is the real equivalent for the currently
      // logged-in user (checkForAlarms is only ever polled for `this.currentUserId`,
      // i.e. the signed-in user, so "current user's own profile" is the right call).
      console.log('🔍 Checking current user_type from backend...');
      let currentUser;
      try {
        const profileResult = await authAPI.getUserProfile();
        if (!profileResult.success || !profileResult.data) {
          console.error('❌ Failed to fetch current user data:', profileResult.error);
          return;
        }
        currentUser = profileResult.data;
      } catch (profileError) {
        console.error('❌ Failed to fetch current user data:', profileError);
        return;
      }

      console.log('👤 Current user data from backend:', { user_id: currentUser.user_id, user_type: currentUser.user_type });

      // Only check alarms for Girls Hostellers (user_type = 3)
      if (currentUser.user_type !== 3) {
        console.log('👤 Not a Girls Hosteller (user_type !== 3), skipping alarm check');
        return;
      }

      console.log('✅ User is a Girls Hosteller, proceeding with alarm check...');

      // Fetching alarm notifications has no backend equivalent — the REST
      // backend does not expose a notifications table/API (out of scope for
      // this migration). This throws and is caught below, so a poll simply
      // logs "not migrated" and moves on instead of crashing anything.
      notMigrated('checkForAlarms notification fetch');
    } catch (error) {
      console.error('❌ Error checking for alarms:', error);
    }
  }

  async sendPushNotification(alarmData) {
    try {
      console.log('📱 Sending push notification...');
      
      // Send local notification that works even when app is closed/backgrounded
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🍽️ Your Food is Ready!',
          body: `${alarmData.message}\n\nTap to acknowledge and stop the alarm.`,
          sound: 'default',
          priority: Notifications.AndroidImportance.MAX,
          vibrate: [0, 500, 200, 500, 200, 500],
          badge: 1,
          data: {
            notificationId: alarmData.id,
            userId: alarmData.user_id,
            type: 'alarm',
            action: 'alarm_notification'
          },
        },
        trigger: {
          seconds: 2, // Slight delay to ensure it shows
          channelId: 'alarm-channel',
        },
      });

      console.log('✅ Push notification scheduled with ID:', notificationId);
      
      // Also try to send immediate notification for background scenarios
      await Notifications.presentNotificationAsync({
        title: '🍽️ Your Food is Ready!',
        body: alarmData.message,
        data: {
          notificationId: alarmData.id,
          userId: alarmData.user_id,
          type: 'alarm'
        },
      });

      console.log('✅ Immediate notification presented');
    } catch (error) {
      console.error('❌ Failed to send push notification:', error);
    }
  }

  async showAlarmNotification(alarmData) {
    if (this.isAlarmActive) {
      console.log('🔔 Alarm already active, ignoring new alarm');
      return;
    }

    this.isAlarmActive = true;
    const { data } = alarmData;
    const alarmConfig = typeof data === 'string' ? JSON.parse(data) : data;

    console.log('🚨 Showing alarm notification:', alarmData.message);

    // Send push notification for background/closed app scenarios
    await this.sendPushNotification(alarmData);

    // Play alarm sound immediately
    await this.playAlarmSound();

    // Try to show custom alarm modal first
    let customModalShown = false;
    
    try {
      DeviceEventEmitter.emit('showAlarmModal', {
        alarmData,
        onAcknowledge: async () => {
          console.log('✅ User acknowledged alarm');
          await this.stopAlarm(alarmData.id);
          await this.markNotificationAsRead(alarmData.id, alarmData.user_id);
          DeviceEventEmitter.emit('hideAlarmModal');
        },
        onSnooze: () => {
          console.log('😴 User snoozed alarm');
          this.snoozeAlarm(alarmData, alarmConfig);
          DeviceEventEmitter.emit('hideAlarmModal');
        },
        onDismiss: () => {
          this.scheduleRepeatAlarm(alarmData, alarmConfig);
          DeviceEventEmitter.emit('hideAlarmModal');
        }
      });
      customModalShown = true;
      console.log('📱 Custom alarm modal event emitted');
    } catch (error) {
      console.error('❌ Failed to show custom modal:', error);
    }

    // Only show fallback alert if custom modal failed or after delay
    setTimeout(() => {
      if (this.isAlarmActive && !customModalShown) {
        console.log('🔄 Showing fallback alert');
        Alert.alert(
          '🍽️ Your Food is Ready!',
          `${alarmData.message}\n\n⏰ Please collect your food from the canteen.`,
          [
            {
              text: '✅ I\'m Coming!',
              onPress: async () => {
                console.log('✅ User acknowledged alarm (fallback)');
                await this.stopAlarm(alarmData.id);
                await this.markNotificationAsRead(alarmData.id, alarmData.user_id);
              }
            },
            {
              text: '😴 Snooze (5 min)',
              onPress: () => {
                console.log('😴 User snoozed alarm (fallback)');
                this.snoozeAlarm(alarmData, alarmConfig);
              }
            }
          ],
          { cancelable: false }
        );
      }
    }, 3000); // 3 second delay to ensure custom modal has time to show

    // Auto-stop alarm after 5 seconds if no response
    setTimeout(async () => {
      if (this.isAlarmActive) {
        await this.stopAlarmSound();
        // Schedule repeat after 1 minute if not acknowledged
        this.scheduleRepeatAlarm(alarmData, alarmConfig);
      }
    }, 5000);
  }

  async stopAlarm(notificationId) {
    this.isAlarmActive = false;
    await this.stopAlarmSound();
    
    if (this.alarmInterval) {
      clearTimeout(this.alarmInterval);
      this.alarmInterval = null;
    }

    console.log(`🔇 Alarm ${notificationId} stopped`);
  }

  scheduleRepeatAlarm(alarmData, alarmConfig) {
    const { repeat_after = 60, repeat_count = 2 } = alarmConfig;
    
    // Check if we've already repeated enough times
    const currentRepeats = alarmConfig.current_repeats || 0;
    if (currentRepeats >= repeat_count - 1) {
      console.log('🔕 Maximum alarm repeats reached');
      this.isAlarmActive = false;
      return;
    }

    console.log(`⏰ Scheduling alarm repeat in ${repeat_after} seconds...`);

    this.alarmInterval = setTimeout(() => {
      alarmConfig.current_repeats = currentRepeats + 1;
      alarmData.data = alarmConfig;
      
      console.log(`🔄 Repeating alarm (${currentRepeats + 1}/${repeat_count})`);
      this.isAlarmActive = false; // Reset flag for repeat
      this.showAlarmNotification(alarmData);
    }, repeat_after * 1000);
  }

  snoozeAlarm(alarmData, alarmConfig) {
    this.stopAlarm(alarmData.id);
    
    // Snooze for 5 minutes
    console.log('😴 Snoozing alarm for 5 minutes...');
    this.alarmInterval = setTimeout(() => {
      this.isAlarmActive = false;
      this.showAlarmNotification(alarmData);
    }, 5 * 60 * 1000); // 5 minutes
  }

  async markNotificationAsRead(notificationId, userId) {
    try {
      console.log(`✅ Marking notification ${notificationId} as read for user ${userId}...`);

      // No backend equivalent for updating a notification's read state (the
      // REST backend does not expose a notifications table/API). Throws and is
      // caught below — the alarm sound/modal has already been dismissed
      // client-side by the time this runs, so a failed "mark as read" just
      // means the (never-fetched, see checkForAlarms) alarm can't be persisted
      // as acknowledged server-side. Not user-visible/blocking.
      notMigrated('markNotificationAsRead');
    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error);
    }
  }

  async startAlarmPolling(userId) {
    console.log('🔄 Starting alarm polling for user:', userId);
    this.currentUserId = userId;
    
    // Check for alarms immediately
    await this.checkForAlarms(userId);
    
    // Set up polling every 30 seconds
    this.pollingInterval = setInterval(async () => {
      console.log('🔍 Polling for alarms...');
      await this.checkForAlarms(userId);
    }, 30000); // 30 seconds
  }

  stopAlarmPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('🔇 Stopped alarm polling');
    }
  }

  // Clean up resources
  async cleanup() {
    await this.stopAlarmSound();
    this.stopAlarmPolling();
    
    if (this.alarmInterval) {
      clearTimeout(this.alarmInterval);
    }
    
    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
    }

    // Remove notification listeners
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }

    // Remove app state listener
    if (this.appStateListener) {
      this.appStateListener.remove();
    }

    this.currentUserId = null;
  }
}

export default new NotificationService();
