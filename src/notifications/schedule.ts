import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { PlannedNotification } from '@/domain/notifications';

/** Android channel used for every scheduled notification. Android 8+ requires one for
 * a notification to be displayed at all. */
const ANDROID_CHANNEL_ID = 'reminders';

// Without a foreground handler, Android/iOS drop notifications that fire while the app
// is open. This is I/O policy, not domain logic, so it stays here rather than in src/domain/.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Replaces all scheduled notifications with `planned`. Cancelling first keeps the OS queue
 * in sync when a slip changes what should fire, and makes the whole operation idempotent.
 * If permission is denied, this returns quietly — the app must stay fully usable either way.
 */
export async function syncNotifications(planned: PlannedNotification[]): Promise<void> {
  const current = await Notifications.getPermissionsAsync();
  let granted = current.granted;

  if (!granted) {
    const requested = await Notifications.requestPermissionsAsync();
    granted = requested.granted;
  }
  if (!granted) return;

  await ensureAndroidChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const notification of planned) {
    const secondsFromNow = Math.round((new Date(notification.fireAt).getTime() - Date.now()) / 1000);
    if (secondsFromNow <= 0) continue;

    await Notifications.scheduleNotificationAsync({
      identifier: notification.id,
      content: { title: notification.title, body: notification.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsFromNow,
        channelId: ANDROID_CHANNEL_ID,
      },
    });
  }
}
