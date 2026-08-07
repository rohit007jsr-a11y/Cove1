/**
 * WhatsApp-style Client-Side Caching Engine for Cove
 * Stores chat history, profile details, and contacts in IndexedDB / LocalStorage
 * to ensure instant initial rendering and seamless offline access.
 */

const CACHE_PREFIX = 'cove_app_cache_v1';

export interface CachedChatData {
  contactId: string;
  messages: any[];
  lastUpdated: number;
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
export function clearCoveCache() {
  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (err) {
    console.warn('Failed clearing Cove cache:', err);
  }
}
