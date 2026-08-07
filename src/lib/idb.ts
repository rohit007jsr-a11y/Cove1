/**
 * IndexedDB Database Utility for WhatsApp-style Offline-First Caching
 * Manages user profile data, session metadata, contacts, and message history.
 */

const DB_NAME = 'cove_offline_store';
const DB_VERSION = 1;

export interface StoredProfile {
  id: string;
  email: string;
  display_name?: string;
  username?: string;
  about?: string;
  avatar_url?: string;
  user_metadata?: any;
  updated_at: number;
}

export interface StoredSessionMeta {
  id: string; // e.g., 'current_session' or user.id
  userId: string;
  email: string;
  lastActive: number;
  sessionToken?: string;
  isOffline: boolean;
  metadata?: Record<string, any>;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this environment.'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;

      // Store 1: User Profiles
      if (!db.objectStoreNames.contains('user_profiles')) {
        db.createObjectStore('user_profiles', { keyPath: 'id' });
      }

      // Store 2: Session Metadata
      if (!db.objectStoreNames.contains('session_metadata')) {
        db.createObjectStore('session_metadata', { keyPath: 'id' });
      }

      // Store 3: Conversation Caches
      if (!db.objectStoreNames.contains('conversations')) {
        db.createObjectStore('conversations', { keyPath: 'contact_id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Store user profile in IndexedDB
 */
export async function idbSaveProfile(profile: StoredProfile): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('user_profiles', 'readwrite');
    const store = tx.objectStore('user_profiles');
    store.put({ ...profile, updated_at: Date.now() });
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('idbSaveProfile failed:', err);
  }
}

/**
 * Retrieve user profile from IndexedDB
 */
export async function idbGetProfile(id: string): Promise<StoredProfile | null> {
  try {
    const db = await openDB();
    const tx = db.transaction('user_profiles', 'readonly');
    const store = tx.objectStore('user_profiles');
    const request = store.get(id);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('idbGetProfile failed:', err);
    return null;
  }
}

/**
 * Store current session metadata in IndexedDB
 */
export async function idbSaveSession(session: StoredSessionMeta): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('session_metadata', 'readwrite');
    const store = tx.objectStore('session_metadata');
    store.put({ ...session, lastActive: Date.now() });
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('idbSaveSession failed:', err);
  }
}

/**
 * Retrieve current session metadata from IndexedDB
 */
export async function idbGetSession(id: string = 'current_session'): Promise<StoredSessionMeta | null> {
  try {
    const db = await openDB();
    const tx = db.transaction('session_metadata', 'readonly');
    const store = tx.objectStore('session_metadata');
    const request = store.get(id);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('idbGetSession failed:', err);
    return null;
  }
}

/**
 * Clear all IndexedDB stores on sign out or account deletion
 */
export async function idbClearAllStores(): Promise<void> {
  try {
    const db = await openDB();
    const storeNames = Array.from(db.objectStoreNames);
    const tx = db.transaction(storeNames, 'readwrite');
    storeNames.forEach((name) => {
      tx.objectStore(name).clear();
    });
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('idbClearAllStores failed:', err);
  }
}
