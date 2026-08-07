/**
 * IndexedDB Database Utility for WhatsApp-style Offline-First Caching
 * Manages user profile data, session metadata, contacts, message history, and offline sync queue.
 */

import { Message, ChatSummary, Group } from '../types';

const DB_NAME = 'cove_offline_store';
const DB_VERSION = 3;

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

      // Store 3: Conversation Summaries
      if (!db.objectStoreNames.contains('conversations')) {
        db.createObjectStore('conversations', { keyPath: 'contact_id' });
      }

      // Store 4: Message History
      if (!db.objectStoreNames.contains('messages')) {
        const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
        msgStore.createIndex('conversation_id', 'conversation_id', { unique: false });
        msgStore.createIndex('created_at', 'created_at', { unique: false });
        msgStore.createIndex('status', 'status', { unique: false });
      }

      // Store 5: Pending Offline Message Queue
      if (!db.objectStoreNames.contains('pending_sync')) {
        db.createObjectStore('pending_sync', { keyPath: 'id' });
      }

      // Store 6: Groups
      if (!db.objectStoreNames.contains('groups')) {
        db.createObjectStore('groups', { keyPath: 'id' });
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
 * Save or update a single message in IndexedDB
 */
export async function idbSaveMessage(message: Message): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('messages', 'readwrite');
    const store = tx.objectStore('messages');
    store.put(message);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('idbSaveMessage failed:', err);
  }
}

/**
 * Save array of messages to IndexedDB
 */
export async function idbSaveMessagesBulk(messages: Message[]): Promise<void> {
  if (!messages || messages.length === 0) return;
  try {
    const db = await openDB();
    const tx = db.transaction('messages', 'readwrite');
    const store = tx.objectStore('messages');
    messages.forEach((msg) => store.put(msg));
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('idbSaveMessagesBulk failed:', err);
  }
}

/**
 * Retrieve all messages for a specific conversation ID sorted by time
 */
export async function idbGetMessagesByConversation(conversationId: string): Promise<Message[]> {
  try {
    const db = await openDB();
    const tx = db.transaction('messages', 'readonly');
    const store = tx.objectStore('messages');
    const index = store.index('conversation_id');
    const request = index.getAll(conversationId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const msgs: Message[] = request.result || [];
        msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        resolve(msgs);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('idbGetMessagesByConversation failed:', err);
    return [];
  }
}

/**
 * Save message to pending sync queue (for offline mode)
 */
export async function idbSavePendingMessage(message: Message): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('pending_sync', 'readwrite');
    const store = tx.objectStore('pending_sync');
    store.put(message);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('idbSavePendingMessage failed:', err);
  }
}

/**
 * Retrieve all pending sync messages
 */
export async function idbGetPendingSyncMessages(): Promise<Message[]> {
  try {
    const db = await openDB();
    const tx = db.transaction('pending_sync', 'readonly');
    const store = tx.objectStore('pending_sync');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('idbGetPendingSyncMessages failed:', err);
    return [];
  }
}

/**
 * Remove a message from the pending sync queue after successful upload
 */
export async function idbRemovePendingMessage(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('pending_sync', 'readwrite');
    const store = tx.objectStore('pending_sync');
    store.delete(id);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('idbRemovePendingMessage failed:', err);
  }
}

/**
 * Save Chat Summary
 */
export async function idbSaveChatSummary(chat: ChatSummary): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('conversations', 'readwrite');
    const store = tx.objectStore('conversations');
    store.put(chat);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('idbSaveChatSummary failed:', err);
  }
}

/**
 * Retrieve all Chat Summaries
 */
export async function idbGetChatSummaries(): Promise<ChatSummary[]> {
  try {
    const db = await openDB();
    const tx = db.transaction('conversations', 'readonly');
    const store = tx.objectStore('conversations');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('idbGetChatSummaries failed:', err);
    return [];
  }
}

/**
 * Save or update a Group in IndexedDB
 */
export async function idbSaveGroup(group: Group): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('groups', 'readwrite');
    const store = tx.objectStore('groups');
    store.put(group);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('idbSaveGroup failed:', err);
  }
}

/**
 * Get all Groups from IndexedDB
 */
export async function idbGetGroups(): Promise<Group[]> {
  try {
    const db = await openDB();
    const tx = db.transaction('groups', 'readonly');
    const store = tx.objectStore('groups');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('idbGetGroups failed:', err);
    return [];
  }
}

/**
 * Get a single Group by ID
 */
export async function idbGetGroupById(groupId: string): Promise<Group | null> {
  try {
    const db = await openDB();
    const tx = db.transaction('groups', 'readonly');
    const store = tx.objectStore('groups');
    const request = store.get(groupId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('idbGetGroupById failed:', err);
    return null;
  }
}

/**
 * Delete a Group from IndexedDB
 */
export async function idbDeleteGroup(groupId: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('groups', 'readwrite');
    const store = tx.objectStore('groups');
    store.delete(groupId);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('idbDeleteGroup failed:', err);
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
