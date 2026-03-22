/**
 * Push Notifications Service
 *
 * - Requests permission and gets the Expo push token
 * - Stores token in Supabase profiles table
 * - Provides helpers to schedule local notifications
 */

let Notifications: any = null;
let Device: any = null;
try { Notifications = require('expo-notifications'); } catch {}
try { Device = require('expo-device'); } catch {}

import { Platform } from 'react-native';

// ── Setup ─────────────────────────────────────────────────────────────────

/** Call once at app startup (e.g., in _layout.tsx) */
export function setupNotificationHandler(): void {
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/** Request permission and return Expo push token (or null) */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Notifications || !Device) return null;

  if (!Device.isDevice) {
    console.log('Push notifications only work on physical devices');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#A855F7',
    });
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    })).data;
    return token;
  } catch (e) {
    console.warn('Failed to get push token:', e);
    return null;
  }
}

// ── Local Notifications ───────────────────────────────────────────────────

/** Schedule a "Character misses you" re-engagement notification */
export async function scheduleReEngageNotification(
  characterName: string,
  characterEmoji: string,
  delaySeconds = 86400, // 24 hours
): Promise<void> {
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${characterEmoji} ${characterName} misses you!`,
      body: `Come back and chat — ${characterName} has something to tell you 💜`,
      sound: true,
      data: { type: 're_engage' },
    },
    trigger: { seconds: delaySeconds },
  });
}

/** Schedule a streak reminder notification */
export async function scheduleStreakReminder(streakCount: number): Promise<void> {
  if (!Notifications) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🔥 Don't break your ${streakCount}-day streak!`,
      body: "You haven't chatted today. Keep the streak alive! 💪",
      sound: true,
      data: { type: 'streak_reminder' },
    },
    trigger: { seconds: 50400 }, // 14 hours after last open
  });
}

/** Send an immediate local notification (e.g., for new DM when in background) */
export async function sendLocalNotification(title: string, body: string, data?: object): Promise<void> {
  if (!Notifications) return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true, data: data || {} },
    trigger: null, // immediate
  });
}

/** Cancel all scheduled notifications */
export async function cancelAllNotifications(): Promise<void> {
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
