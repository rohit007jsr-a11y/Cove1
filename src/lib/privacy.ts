import { UserPrivacySettings } from '../types';

// Fetch privacy settings for a user
export async function getPrivacySettings(userId: string): Promise<UserPrivacySettings> {
  try {
    const res = await fetch(`/api/privacy/settings?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error('Failed to fetch privacy settings');
    const data = await res.json();
    return data.settings;
  } catch (err) {
    console.error('[Privacy] Error getting settings:', err);
    // Local storage fallback for offline support
    const cached = localStorage.getItem(`cove_privacy_${userId}`);
    if (cached) {
      return JSON.parse(cached);
    }
    return {
      userId,
      profilePhotoVisibility: 'everyone',
      aboutVisibility: 'everyone',
      lastSeenVisibility: 'everyone',
      statusVisibility: 'everyone',
      blockedUsers: [],
    };
  }
}

// Update privacy settings for a user
export async function updatePrivacySettings(
  userId: string,
  settings: Partial<UserPrivacySettings>
): Promise<UserPrivacySettings | null> {
  try {
    const res = await fetch('/api/privacy/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, settings }),
    });
    if (!res.ok) throw new Error('Failed to save privacy settings');
    const data = await res.json();
    
    // Save locally for offline fallback
    localStorage.setItem(`cove_privacy_${userId}`, JSON.stringify(data.settings));
    return data.settings;
  } catch (err) {
    console.error('[Privacy] Error saving settings:', err);
    
    // Local fallback save
    const cached = localStorage.getItem(`cove_privacy_${userId}`);
    const current = cached ? JSON.parse(cached) : {
      userId,
      profilePhotoVisibility: 'everyone',
      aboutVisibility: 'everyone',
      lastSeenVisibility: 'everyone',
      statusVisibility: 'everyone',
      blockedUsers: [],
    };
    const updated = { ...current, ...settings };
    localStorage.setItem(`cove_privacy_${userId}`, JSON.stringify(updated));
    return updated;
  }
}

// Block or unblock a user
export async function toggleBlockUser(
  userId: string,
  targetUserId: string
): Promise<{ blockedUsers: string[]; isBlocked: boolean } | null> {
  try {
    const res = await fetch('/api/privacy/block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, targetUserId }),
    });
    if (!res.ok) throw new Error('Failed to toggle user block status');
    const data = await res.json();
    
    // Update cached settings block list
    const cached = localStorage.getItem(`cove_privacy_${userId}`);
    if (cached) {
      const current = JSON.parse(cached);
      current.blockedUsers = data.blockedUsers;
      localStorage.setItem(`cove_privacy_${userId}`, JSON.stringify(current));
    }
    
    return { blockedUsers: data.blockedUsers, isBlocked: data.isBlocked };
  } catch (err) {
    console.error('[Privacy] Error toggling block:', err);
    
    // Fallback block/unblock list toggle locally
    const cached = localStorage.getItem(`cove_privacy_${userId}`);
    const current = cached ? JSON.parse(cached) : {
      userId,
      profilePhotoVisibility: 'everyone',
      aboutVisibility: 'everyone',
      lastSeenVisibility: 'everyone',
      statusVisibility: 'everyone',
      blockedUsers: [],
    };
    
    const blockedList = current.blockedUsers || [];
    const index = blockedList.indexOf(targetUserId);
    let isBlocked = false;
    if (index > -1) {
      blockedList.splice(index, 1);
    } else {
      blockedList.push(targetUserId);
      isBlocked = true;
    }
    current.blockedUsers = blockedList;
    localStorage.setItem(`cove_privacy_${userId}`, JSON.stringify(current));
    
    return { blockedUsers: blockedList, isBlocked };
  }
}
