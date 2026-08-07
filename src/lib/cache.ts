import {
  idbSaveProfile,
  idbGetProfile,
  idbSaveSession,
  idbGetSession,
  idbClearAllStores,
  StoredProfile,
  StoredSessionMeta,
} from './idb';

/**
 * WhatsApp-style Client-Side Caching Engine for Cove
 * Stores chat history, profile details, and session metadata in IndexedDB & LocalStorage
 * to ensure instant initial rendering and seamless offline access.
 */

const CACHE_PREFIX = 'cove_app_cache_v1';

export interface CachedChatData {
  contactId: string;
  messages: any[];
  lastUpdated: number;
}

/**
 * Saves user profile to IndexedDB and LocalStorage for dual-tier fallback.
 */
export async function cacheUserProfile(user: any) {
  if (!user || !user.id) return;
  const profile: StoredProfile = {
    id: user.id,
    email: user.email || '',
    display_name: user.user_metadata?.full_name || user.user_metadata?.display_name,
    username: user.user_metadata?.username,
    about: user.user_metadata?.about,
    avatar_url: user.user_metadata?.avatar_url,
    user_metadata: user.user_metadata,
    updated_at: Date.now(),
  };

  try {
    // 1. IndexedDB async store
    await idbSaveProfile(profile);
    // 2. LocalStorage sync store for instant startup
    localStorage.setItem(`${CACHE_PREFIX}_profile_${user.id}`, JSON.stringify(profile));
  } catch (err) {
    console.warn('Failed caching user profile:', err);
  }
}

/**
 * Gets cached user profile from LocalStorage or IndexedDB
 */
export async function getCachedUserProfile(userId: string): Promise<StoredProfile | null> {
  try {
    // Sync fast read
    const raw = localStorage.getItem(`${CACHE_PREFIX}_profile_${userId}`);
    if (raw) {
      return JSON.parse(raw);
    }
    // Async IndexedDB read
    return await idbGetProfile(userId);
  } catch (err) {
    return null;
  }
}

/**
 * Caches active session metadata (tokens, offline timestamps, device state)
 */
export async function cacheSessionMetadata(user: any, sessionToken?: string) {
  if (!user || !user.id) return;
  const sessionData: StoredSessionMeta = {
    id: 'current_session',
    userId: user.id,
    email: user.email || '',
    lastActive: Date.now(),
    sessionToken: sessionToken || 'active_token',
    isOffline: !navigator.onLine,
    metadata: {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      platform: typeof navigator !== 'undefined' ? navigator.platform : '',
    },
  };

  try {
    await idbSaveSession(sessionData);
    localStorage.setItem(`${CACHE_PREFIX}_session`, JSON.stringify(sessionData));
  } catch (err) {
    console.warn('Failed caching session metadata:', err);
  }
}

/**
 * Gets cached session metadata from IndexedDB
 */
export async function getCachedSessionMetadata(): Promise<StoredSessionMeta | null> {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}_session`);
    if (raw) {
      return JSON.parse(raw);
    }
    return await idbGetSession('current_session');
  } catch (err) {
    return null;
  }
}

/**
 * Saves messages for a specific conversation locally.
 */
export function cacheConversationMessages(contactId: string, messages: any[]) {
  try {
    const key = `${CACHE_PREFIX}_chat_${contactId}`;
    const data: CachedChatData = {
      contactId,
      messages,
      lastUpdated: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn('Cache write failed:', err);
  }
}

/**
 * Retrieves cached messages for a specific conversation.
 */
export function getCachedConversationMessages(contactId: string): any[] | null {
  try {
    const key = `${CACHE_PREFIX}_chat_${contactId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data: CachedChatData = JSON.parse(raw);
    return data.messages || [];
  } catch (err) {
    console.warn('Cache read failed:', err);
    return null;
  }
}

/**
 * Saves all user contacts to local cache.
 */
export function cacheContactsList(userId: string, contacts: any[]) {
  try {
    const key = `${CACHE_PREFIX}_contacts_${userId}`;
    localStorage.setItem(key, JSON.stringify({
      contacts,
      lastUpdated: Date.now(),
    }));
  } catch (err) {
    console.warn('Contacts cache write failed:', err);
  }
}

/**
 * Retrieves cached contacts list.
 */
export function getCachedContactsList(userId: string): any[] | null {
  try {
    const key = `${CACHE_PREFIX}_contacts_${userId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.contacts || null;
  } catch (err) {
    console.warn('Contacts cache read failed:', err);
    return null;
  }
}

/**
 * Clear cache for sign-out or account deletion.
 */
export async function clearCoveCache() {
  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    await idbClearAllStores();
  } catch (err) {
    console.warn('Failed clearing Cove cache:', err);
  }
}

