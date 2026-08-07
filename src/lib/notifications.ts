import { UserNotificationSettings, UserPushSubscription } from '../types';

// Helper: Convert VAPID public key from base64 string to Uint8Array for pushManager subscription
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Register the Service Worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[WebPush] Service Workers are not supported in this browser.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('[WebPush] Service Worker registered with scope:', registration.scope);
    return registration;
  } catch (err) {
    console.error('[WebPush] Service Worker registration failed:', err);
    return null;
  }
}

// Request permission for Web Push Notifications
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('[WebPush] This browser does not support notifications.');
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  console.log('[WebPush] Notification permission status:', permission);
  return permission;
}

// Subscribe user to Web Push notifications
export async function subscribeUserToPush(userId: string): Promise<UserPushSubscription | null> {
  try {
    const registration = await navigator.serviceWorker.ready;
    if (!registration) {
      console.warn('[WebPush] Service worker not ready for subscription.');
      return null;
    }

    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.warn('[WebPush] Notification permission was not granted.');
      return null;
    }

    // 1. Fetch VAPID public key from backend
    const keyRes = await fetch('/api/notifications/vapid-public-key');
    if (!keyRes.ok) {
      throw new Error('Failed to fetch VAPID public key from server');
    }
    const { publicKey } = await keyRes.json();
    if (!publicKey) {
      throw new Error('Received empty VAPID public key');
    }

    // 2. Subscribe using PushManager
    const applicationServerKey = urlBase64ToUint8Array(publicKey);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    // 3. Transform to our simple push subscription format
    const rawSub = subscription.toJSON();
    if (!rawSub.endpoint || !rawSub.keys?.p256dh || !rawSub.keys?.auth) {
      throw new Error('Subscription structure incomplete');
    }

    const userSub: UserPushSubscription = {
      endpoint: rawSub.endpoint,
      keys: {
        p256dh: rawSub.keys.p256dh,
        auth: rawSub.keys.auth,
      },
    };

    // 4. Send subscription to server
    const subscribeRes = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, subscription: userSub }),
    });

    if (!subscribeRes.ok) {
      throw new Error('Failed to register subscription on server');
    }

    console.log('[WebPush] Device subscription successfully registered on backend');
    return userSub;
  } catch (err) {
    console.error('[WebPush] Error subscribing to push notifications:', err);
    return null;
  }
}

// Check current subscription status on this device
export async function checkDeviceSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null;
  const registration = await navigator.serviceWorker.ready;
  if (!registration.pushManager) return null;
  return await registration.pushManager.getSubscription();
}

// Unsubscribe the user from Web Push
export async function unsubscribeUserFromPush(userId: string): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      console.log('[WebPush] No subscription found to unsubscribe.');
      return true;
    }

    // 1. Delete on server
    const unsubscribeRes = await fetch('/api/notifications/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, endpoint: subscription.endpoint }),
    });

    if (!unsubscribeRes.ok) {
      console.warn('[WebPush] Server-side unsubscribe failed. Proceeding with browser push manager unsubscribe.');
    }

    // 2. Unsubscribe browser PushManager
    const unsubscribed = await subscription.unsubscribe();
    console.log('[WebPush] Browser PushManager unsubscribed status:', unsubscribed);
    return unsubscribed;
  } catch (err) {
    console.error('[WebPush] Error unsubscribing from push notifications:', err);
    return false;
  }
}

// Fetch notification settings
export async function getNotificationSettings(userId: string): Promise<UserNotificationSettings | null> {
  try {
    const res = await fetch(`/api/notifications/settings?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    const data = await res.json();
    return data.settings;
  } catch (err) {
    console.error('[WebPush] Error getting settings:', err);
    return null;
  }
}

// Update notification settings
export async function updateNotificationSettings(
  userId: string,
  settings: Partial<UserNotificationSettings>
): Promise<UserNotificationSettings | null> {
  try {
    const res = await fetch('/api/notifications/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, settings }),
    });
    if (!res.ok) throw new Error('Failed to save settings');
    const data = await res.json();
    return data.settings;
  } catch (err) {
    console.error('[WebPush] Error saving settings:', err);
    return null;
  }
}

// Toggle mute/unmute on a single chat
export async function toggleChatMute(userId: string, chatId: string): Promise<{ mutedChats: string[]; isMuted: boolean } | null> {
  try {
    const res = await fetch('/api/notifications/mute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, chatId }),
    });
    if (!res.ok) throw new Error('Failed to toggle chat mute');
    return await res.json();
  } catch (err) {
    console.error('[WebPush] Error toggling chat mute:', err);
    return null;
  }
}
