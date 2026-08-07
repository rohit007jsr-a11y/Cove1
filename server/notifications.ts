import webpush from 'web-push';
import fs from 'fs';
import path from 'path';
import { UserPushSubscription, UserNotificationSettings } from '../src/types';

// VAPID Keys Setup
const VAPID_KEYS_FILE = path.join(process.cwd(), '.vapid-keys.json');
let publicKey = process.env.VAPID_PUBLIC_KEY || '';
let privateKey = process.env.VAPID_PRIVATE_KEY || '';

if (!publicKey || !privateKey) {
  if (fs.existsSync(VAPID_KEYS_FILE)) {
    try {
      const saved = JSON.parse(fs.readFileSync(VAPID_KEYS_FILE, 'utf8'));
      publicKey = saved.publicKey;
      privateKey = saved.privateKey;
      console.log('[WebPush] Loaded existing VAPID keys from storage');
    } catch (err) {
      console.error('[WebPush] Error reading saved VAPID keys:', err);
    }
  }

  if (!publicKey || !privateKey) {
    try {
      const keys = webpush.generateVAPIDKeys();
      publicKey = keys.publicKey;
      privateKey = keys.privateKey;
      fs.writeFileSync(VAPID_KEYS_FILE, JSON.stringify({ publicKey, privateKey }), 'utf8');
      console.log('[WebPush] Generated and saved stable VAPID keys');
    } catch (err) {
      console.error('[WebPush] Error generating VAPID keys:', err);
      // Fallback hardcoded keys to ensure service never fails to start
      publicKey = 'BEl62_6N_6K76uLgKx8_D1G0vO15vFhWbI0T0-D0O0f0e0d0c0b0a0_9_8_7_6_5_4_3_2_1';
      privateKey = 'fallback-private-key-not-secure';
    }
  }
}

try {
  webpush.setVapidDetails(
    'mailto:rohit007jsr@gmail.com',
    publicKey,
    privateKey
  );
  console.log('[WebPush] VAPID configuration complete');
} catch (err) {
  console.error('[WebPush] setVapidDetails error:', err);
}

// In-Memory Storage for Subscriptions & Settings
const subscriptionsMap = new Map<string, Set<UserPushSubscription>>();
const settingsMap = new Map<string, UserNotificationSettings>();

export function getPublicKey(): string {
  return publicKey;
}

export function getSubscriptions(userId: string): UserPushSubscription[] {
  const subs = subscriptionsMap.get(userId);
  return subs ? Array.from(subs) : [];
}

export function addSubscription(userId: string, sub: UserPushSubscription) {
  if (!subscriptionsMap.has(userId)) {
    subscriptionsMap.set(userId, new Set());
  }
  const set = subscriptionsMap.get(userId)!;
  // Prevent duplicate endpoints
  const existing = Array.from(set).find((s) => s.endpoint === sub.endpoint);
  if (existing) {
    set.delete(existing);
  }
  set.add(sub);
  console.log(`[WebPush] Subscription registered for user ${userId}. Total devices: ${set.size}`);
}

export function removeSubscription(userId: string, endpoint: string) {
  const set = subscriptionsMap.get(userId);
  if (set) {
    const found = Array.from(set).find((s) => s.endpoint === endpoint);
    if (found) {
      set.delete(found);
      console.log(`[WebPush] Subscription removed for user ${userId}. Devices remaining: ${set.size}`);
    }
  }
}

export function getSettings(userId: string): UserNotificationSettings {
  if (!settingsMap.has(userId)) {
    settingsMap.set(userId, {
      userId,
      globalMute: false,
      showPreviews: true,
      soundEnabled: true,
      statusUpdatesEnabled: true,
      mutedChats: [],
    });
  }
  return settingsMap.get(userId)!;
}

export function updateSettings(userId: string, updates: Partial<UserNotificationSettings>): UserNotificationSettings {
  const current = getSettings(userId);
  const updated = { ...current, ...updates };
  settingsMap.set(userId, updated);
  console.log(`[WebPush] Updated notification settings for user ${userId}`, updated);
  return updated;
}

export function toggleMuteChat(userId: string, chatId: string): { mutedChats: string[]; isMuted: boolean } {
  const settings = getSettings(userId);
  const index = settings.mutedChats.indexOf(chatId);
  let isMuted = false;
  if (index > -1) {
    settings.mutedChats.splice(index, 1);
  } else {
    settings.mutedChats.push(chatId);
    isMuted = true;
  }
  settingsMap.set(userId, settings);
  console.log(`[WebPush] User ${userId} toggled mute on chat ${chatId}: ${isMuted}`);
  return { mutedChats: settings.mutedChats, isMuted };
}

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  payload: any = {}
) {
  const settings = getSettings(userId);
  if (settings.globalMute) {
    console.log(`[WebPush] Skipping push to ${userId} because global mute is enabled`);
    return;
  }

  // Check if this chat is muted
  if (payload.chatId && settings.mutedChats.includes(payload.chatId)) {
    console.log(`[WebPush] Skipping push to ${userId} because chat ${payload.chatId} is muted`);
    return;
  }

  // Handle privacy (hide message content)
  const finalTitle = title;
  const finalBody = settings.showPreviews ? body : 'New message received';

  const subs = getSubscriptions(userId);
  if (subs.length === 0) {
    return;
  }

  console.log(`[WebPush] Attempting to send push to ${userId} across ${subs.length} devices`);
  const notificationPayload = JSON.stringify({
    title: finalTitle,
    body: finalBody,
    ...payload,
  });

  const promises = subs.map((sub) => {
    return webpush.sendNotification(sub, notificationPayload).catch((err) => {
      // Clean up dead/expired subscriptions
      if (err.statusCode === 410 || err.statusCode === 404) {
        console.warn(`[WebPush] Expired subscription found for ${userId}, removing`);
        removeSubscription(userId, sub.endpoint);
      } else {
        console.error('[WebPush] Error sending push notification:', err);
      }
    });
  });

  await Promise.all(promises);
}

export async function broadcastPushNotification(
  userIds: string[],
  title: string,
  body: string,
  payload: any = {}
) {
  const promises = userIds.map((userId) => sendPushNotification(userId, title, body, payload));
  await Promise.all(promises);
}

export async function broadcastStatusUpdatePush(
  ownerId: string,
  ownerName: string
) {
  const promises: Promise<any>[] = [];
  subscriptionsMap.forEach((_, targetUserId) => {
    if (targetUserId !== ownerId) {
      const settings = getSettings(targetUserId);
      if (settings.statusUpdatesEnabled && !settings.globalMute) {
        promises.push(
          sendPushNotification(
            targetUserId,
            'Status Update',
            `${ownerName} posted a new status update`,
            {
              type: 'status_update',
              ownerId,
            }
          ).catch((err) => console.error('[StatusPush] Error:', err))
        );
      }
    }
  });
  await Promise.all(promises);
}

