import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Settings,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  Mail,
  User,
  LogOut,
  Check,
  Lock,
  Calendar,
  Sparkles,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Shield,
  Users,
  Smartphone,
  Upload,
  UserPlus,
  Plus,
  Info,
  Camera,
  Edit2,
  Smartphone as PhoneIcon,
  MessageSquare,
  Ban,
  Trash,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile, UserNotificationSettings, UserPrivacySettings, PrivacyValue, SyncedContact, Profile } from '../types';
import {
  subscribeUserToPush,
  unsubscribeUserFromPush,
  getNotificationSettings,
  updateNotificationSettings,
  checkDeviceSubscription,
} from '../lib/notifications';
import { getPrivacySettings, updatePrivacySettings, toggleBlockUser } from '../lib/privacy';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onSignOut: () => void;
  showToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
  onOpenChatWithProfile?: (profile: Profile) => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=250&q=80',
];

const PRESET_STATUSES = [
  'Available',
  'At work',
  'In a meeting',
  'At the gym',
  'Sleeping',
  'Urgent calls only',
  'Coding on Cove 🚀',
];

const DEMO_PROFILES: Profile[] = [
  {
    id: '11111111-1111-4111-a111-111111111111',
    email: 'alex@cove.app',
    display_name: 'Alex Morgan',
    username: 'alex_morgan',
    about: 'At work 💻 | Cove messaging',
    phone_number: '+15550192',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
  },
  {
    id: '22222222-2222-4222-a222-222222222222',
    email: 'maya@cove.app',
    display_name: 'Maya Lin',
    username: 'maya_lin',
    about: 'Available ✨',
    phone_number: '+15550143',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
  },
  {
    id: '33333333-3333-4333-a333-333333333333',
    email: 'jordan@cove.app',
    display_name: 'Jordan Vance',
    username: 'jordan_v',
    about: 'Coding on Cove 🚀',
    phone_number: '+15550187',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80',
  },
];

type SettingsTab = 'profile' | 'privacy' | 'notifications' | 'contacts' | 'account';

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  onSignOut,
  showToast,
  onOpenChatWithProfile,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // Account settings states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Notification settings states
  const [loadingNotifs, setLoadingNotifs] = useState(true);
  const [notifSettings, setNotifSettings] = useState<UserNotificationSettings | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Privacy settings states
  const [loadingPrivacy, setLoadingPrivacy] = useState(true);
  const [privacySettings, setPrivacySettings] = useState<UserPrivacySettings | null>(null);
  const [blockedProfiles, setBlockedProfiles] = useState<Profile[]>([]);
  const [blockSearchQuery, setBlockSearchQuery] = useState('');
  const [showBlockSelector, setShowBlockSelector] = useState(false);

  // Profile fields editing states
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [aboutText, setAboutText] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [editingField, setEditingField] = useState<'name' | 'username' | 'about' | 'phone' | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [customAvatarInput, setCustomAvatarInput] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Contacts Sync states
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [syncedContacts, setSyncedContacts] = useState<SyncedContact[]>([]);
  const [isDraggingCSV, setIsDraggingCSV] = useState(false);

  // Initial Load
  useEffect(() => {
    if (isOpen && user.id) {
      // 1. Load notification settings
      const loadNotificationPreferences = async () => {
        setLoadingNotifs(true);
        try {
          const data = await getNotificationSettings(user.id);
          if (data) setNotifSettings(data);
          const activeSub = await checkDeviceSubscription();
          setIsSubscribed(!!activeSub);
        } catch (err) {
          console.error('[WebPush] Error inside modal:', err);
        } finally {
          setLoadingNotifs(false);
        }
      };

      // 2. Load privacy settings & blocked profiles
      const loadPrivacyPreferences = async () => {
        setLoadingPrivacy(true);
        try {
          const data = await getPrivacySettings(user.id);
          if (data) {
            setPrivacySettings(data);
            // Fetch profiles of blocked users
            await fetchBlockedUserProfiles(data.blockedUsers);
          }
        } catch (err) {
          console.error('[Privacy] Error inside modal:', err);
        } finally {
          setLoadingPrivacy(false);
        }
      };

      // 3. Load user profile details
      const meta = user.user_metadata || {};
      setDisplayName(meta.full_name || user.email?.split('@')[0] || 'Cove User');
      setUsername(meta.username || '');
      setAboutText(meta.about || 'Hey there! I am using Cove.');
      setPhoneNumber(meta.phone_number || '');
      setAvatarUrl(meta.avatar_url || '');

      // 4. Load synced contacts from local storage
      const storedContacts = localStorage.getItem(`cove_synced_contacts_${user.id}`);
      if (storedContacts) {
        try {
          setSyncedContacts(JSON.parse(storedContacts));
        } catch (e) {
          console.error('Error loading synced contacts:', e);
        }
      } else {
        // Hydrate with some default demo contacts for a premium visual feel if empty
        const initialDemos: SyncedContact[] = DEMO_PROFILES.map((dp, i) => ({
          id: `demo-sync-${i}`,
          name: dp.display_name || '',
          phone: dp.phone_number || '',
          email: dp.email,
          mappedUserId: dp.id,
          isRegistered: true,
          avatarUrl: dp.avatar_url || null,
          about: dp.about || null,
          source: 'csv_import'
        }));
        setSyncedContacts(initialDemos);
        localStorage.setItem(`cove_synced_contacts_${user.id}`, JSON.stringify(initialDemos));
      }

      loadNotificationPreferences();
      loadPrivacyPreferences();
    }
  }, [isOpen, user.id]);

  const fetchBlockedUserProfiles = async (blockedIds: string[]) => {
    if (!blockedIds || blockedIds.length === 0) {
      setBlockedProfiles([]);
      return;
    }

    try {
      // Fetch matching profiles from Supabase
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, display_name, username, avatar_url, about')
        .in('id', blockedIds);

      if (!error && data) {
        // Merge with DEMO_PROFILES if some IDs match
        const merged = data.map((d: any) => ({
          id: d.id,
          email: d.email,
          display_name: d.display_name,
          username: d.username,
          avatar_url: d.avatar_url,
          about: d.about,
        }));
        setBlockedProfiles(merged);
      } else {
        // Fallback or offline matching using DEMO_PROFILES
        const fallbacks = DEMO_PROFILES.filter((dp) => blockedIds.includes(dp.id));
        setBlockedProfiles(fallbacks);
      }
    } catch (err) {
      // Local fallback lookup
      const fallbacks = DEMO_PROFILES.filter((dp) => blockedIds.includes(dp.id));
      setBlockedProfiles(fallbacks);
    }
  };

  // Profile Save handler
  const handleSaveProfileField = async (field: 'name' | 'username' | 'about' | 'phone') => {
    setSavingProfile(true);
    try {
      const updates: any = {};
      if (field === 'name') updates.full_name = displayName.trim();
      if (field === 'username') updates.username = username.trim().toLowerCase().replace(/^@/, '');
      if (field === 'about') updates.about = aboutText.trim();
      if (field === 'phone') updates.phone_number = phoneNumber.trim();

      const newMetadata = {
        ...(user.user_metadata || {}),
        ...updates,
      };

      // 1. Update Supabase Auth metadata
      const { error: authErr } = await supabase.auth.updateUser({
        data: newMetadata,
      });

      if (authErr) console.warn('Auth meta save notice:', authErr.message);

      // 2. Upsert Profiles DB table
      try {
        await supabase.from('profiles').upsert([
          {
            id: user.id,
            email: user.email,
            display_name: field === 'name' ? updates.full_name : displayName,
            username: field === 'username' ? updates.username : username,
            about: field === 'about' ? updates.about : aboutText,
            avatar_url: avatarUrl,
            phone_number: field === 'phone' ? updates.phone_number : phoneNumber,
          },
        ], { onConflict: 'id' });
      } catch (dbErr) {
        console.warn('Profiles upsert notice:', dbErr);
      }

      // Save to localStorage fallback
      localStorage.setItem(`cove_profile_${user.id}`, JSON.stringify(newMetadata));

      showToast('success', 'Profile Updated', `Successfully updated your ${field}.`);
      setEditingField(null);
    } catch (err: any) {
      showToast('error', 'Update Failed', err.message || 'Could not save profile change.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSelectAvatar = async (url: string) => {
    setAvatarUrl(url);
    setShowAvatarPicker(false);
    try {
      const newMetadata = {
        ...(user.user_metadata || {}),
        avatar_url: url,
      };

      await supabase.auth.updateUser({ data: newMetadata });
      await supabase.from('profiles').upsert([{ id: user.id, email: user.email, avatar_url: url }], { onConflict: 'id' });
      localStorage.setItem(`cove_profile_${user.id}`, JSON.stringify(newMetadata));
      showToast('success', 'Avatar Changed', 'Your profile image has been successfully updated.');
    } catch (e) {
      console.warn('Avatar update fallback:', e);
    }
  };

  // Privacy setting Toggles
  const handleUpdatePrivacySetting = async (key: keyof UserPrivacySettings, value: PrivacyValue) => {
    if (!privacySettings) return;
    const updated = await updatePrivacySettings(user.id, { [key]: value });
    if (updated) {
      setPrivacySettings(updated);
      showToast('success', 'Privacy Updated', 'Your settings are synchronized.');
    }
  };

  const handleToggleBlock = async (targetId: string) => {
    const result = await toggleBlockUser(user.id, targetId);
    if (result) {
      if (privacySettings) {
        setPrivacySettings({ ...privacySettings, blockedUsers: result.blockedUsers });
      }
      await fetchBlockedUserProfiles(result.blockedUsers);
      showToast('info', result.isBlocked ? 'User Blocked' : 'User Unblocked', result.isBlocked ? 'This contact can no longer message or view your status.' : 'This contact is now unblocked.');
    }
  };

  // Contacts synchronization & manual importing
  const mapAndAddContacts = async (newContacts: Partial<SyncedContact>[]) => {
    let allProfiles: any[] = [];
    try {
      const { data } = await supabase.from('profiles').select('id, email, display_name, avatar_url, about, phone_number');
      if (data) allProfiles = data;
    } catch (err) {
      console.log('Error fetching profiles for mapping, using fallbacks:', err);
    }

    // Combine with demo profiles
    const combinedProfiles = [...allProfiles];
    DEMO_PROFILES.forEach(dp => {
      if (!combinedProfiles.some(p => p.id === dp.id || p.email === dp.email)) {
        combinedProfiles.push(dp);
      }
    });

    const processed: SyncedContact[] = newContacts.map(nc => {
      // Match by email or phone
      const match = combinedProfiles.find(p => {
        const emailMatch = nc.email && p.email && p.email.toLowerCase() === nc.email.toLowerCase();
        const phoneMatch = nc.phone && p.phone_number && p.phone_number.replace(/\D/g, '') === nc.phone.replace(/\D/g, '');
        return emailMatch || phoneMatch;
      });

      return {
        id: nc.id || `contact-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        name: nc.name || 'Unnamed Contact',
        phone: nc.phone || '',
        email: nc.email || '',
        mappedUserId: match ? match.id : null,
        isRegistered: !!match,
        avatarUrl: match ? (match.avatar_url || null) : null,
        about: match ? (match.about || null) : null,
        source: nc.source || 'manual'
      };
    });

    const updatedList = [...processed, ...syncedContacts];
    // Deduplicate
    const uniqueList: SyncedContact[] = [];
    const seenKeys = new Set<string>();
    updatedList.forEach(c => {
      const key = `${c.email || 'no-email'}_${c.phone || 'no-phone'}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueList.push(c);
      }
    });

    setSyncedContacts(uniqueList);
    localStorage.setItem(`cove_synced_contacts_${user.id}`, JSON.stringify(uniqueList));
    showToast('success', 'Contacts Synced', `Processed ${processed.length} contacts and mapped ${processed.filter(c => c.isRegistered).length} active app users.`);
  };

  const handleAddManualContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || (!manualPhone.trim() && !manualEmail.trim())) {
      showToast('error', 'Incomplete Form', 'Please enter a name and at least a phone number or email.');
      return;
    }

    const newContact: Partial<SyncedContact> = {
      id: `contact-manual-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: manualName.trim(),
      phone: manualPhone.trim(),
      email: manualEmail.trim(),
      source: 'manual'
    };

    mapAndAddContacts([newContact]);
    setManualName('');
    setManualPhone('');
    setManualEmail('');
  };

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    parseCSVFile(file);
  };

  const parseCSVFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/);
      const parsed: Partial<SyncedContact>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
        if (cols.length < 1) continue;

        const name = cols[0] || 'Unknown';
        const phone = cols[1] || '';
        const email = cols[2] || '';

        parsed.push({
          id: `contact-csv-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
          name,
          phone,
          email,
          source: 'csv_import'
        });
      }

      await mapAndAddContacts(parsed);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingCSV(true);
  };

  const handleDragLeave = () => {
    setIsDraggingCSV(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingCSV(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      parseCSVFile(file);
    } else {
      showToast('error', 'Invalid File Type', 'Please drop a valid .csv contact file.');
    }
  };

  const handleClearContact = (id: string) => {
    const filtered = syncedContacts.filter(c => c.id !== id);
    setSyncedContacts(filtered);
    localStorage.setItem(`cove_synced_contacts_${user.id}`, JSON.stringify(filtered));
    showToast('info', 'Contact Removed', 'Synced contact deleted from settings.');
  };

  // Notification Toggles
  const handleToggleGlobalMute = async () => {
    if (!notifSettings) return;
    const nextVal = !notifSettings.globalMute;
    const updated = await updateNotificationSettings(user.id, { globalMute: nextVal });
    if (updated) {
      setNotifSettings(updated);
      showToast('success', nextVal ? 'Notifications Muted' : 'Notifications Restored', nextVal ? 'All push notifications are paused.' : 'Notification alerts are restored.');
    }
  };

  const handleTogglePreviews = async () => {
    if (!notifSettings) return;
    const nextVal = !notifSettings.showPreviews;
    const updated = await updateNotificationSettings(user.id, { showPreviews: nextVal });
    if (updated) {
      setNotifSettings(updated);
      showToast('success', 'Previews Updated', nextVal ? 'Message contents will show up.' : 'Notifications will hide message details.');
    }
  };

  const handleToggleSound = async () => {
    if (!notifSettings) return;
    const nextVal = !notifSettings.soundEnabled;
    const updated = await updateNotificationSettings(user.id, { soundEnabled: nextVal });
    if (updated) {
      setNotifSettings(updated);
      showToast('success', 'Sound Settings Updated', nextVal ? 'Notification sounds enabled.' : 'Notification sounds muted.');
    }
  };

  const handleToggleStatusUpdates = async () => {
    if (!notifSettings) return;
    const nextVal = !notifSettings.statusUpdatesEnabled;
    const updated = await updateNotificationSettings(user.id, { statusUpdatesEnabled: nextVal });
    if (updated) {
      setNotifSettings(updated);
      showToast('success', 'Status Notifications Updated', nextVal ? 'You will be notified of status updates.' : 'Status alerts muted.');
    }
  };

  const handleTogglePushSubscription = async () => {
    if (isSubscribed) {
      const ok = await unsubscribeUserFromPush(user.id);
      if (ok) {
        setIsSubscribed(false);
        showToast('info', 'Push Notifications Disabled', 'Background push alerts are deactivated.');
      } else {
        showToast('error', 'Unsubscribe Failed', 'Could not deactivate push subscription.');
      }
    } else {
      const sub = await subscribeUserToPush(user.id);
      if (sub) {
        setIsSubscribed(true);
        showToast('success', 'Push Notifications Enabled', 'Registered device for background notifications.');
      } else {
        showToast('error', 'Subscription Failed', 'Please grant notification permissions in your browser.');
      }
    }
  };

  const handleAccountDelete = async () => {
    if (confirmInput.trim().toUpperCase() !== 'DELETE') {
      showToast('error', 'Confirmation Failed', 'Please type DELETE in capital letters.');
      return;
    }

    setIsDeleting(true);
    try {
      await supabase.from('profiles').delete().eq('id', user.id);
      localStorage.clear();
      await supabase.auth.signOut();
      showToast('success', 'Account Deleted', 'Your account has been permanently removed.');
      onSignOut();
      onClose();
    } catch (err: any) {
      showToast('error', 'Deletion Error', err.message || 'Failed to delete account.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row h-[85vh] md:h-[75vh]"
        >
          
          {/* LEFT SIDEBAR: Nav Tabs */}
          <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 p-4 shrink-0 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Header inside settings */}
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
                <div className="p-2 bg-sky-500/10 text-sky-600 rounded-xl border border-sky-500/20">
                  <Settings className="w-5 h-5 animate-spin-slow" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 tracking-tight">Cove Settings</h3>
                  <p className="text-[10px] text-slate-500">Customize WhatsApp‑like features</p>
                </div>
              </div>

              {/* Navigation Pills */}
              <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 scrollbar-none">
                <button
                  onClick={() => { setActiveTab('profile'); setEditingField(null); }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all whitespace-nowrap shrink-0 ${
                    activeTab === 'profile'
                      ? 'bg-sky-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Edit Profile</span>
                </button>

                <button
                  onClick={() => { setActiveTab('privacy'); setEditingField(null); }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all whitespace-nowrap shrink-0 ${
                    activeTab === 'privacy'
                      ? 'bg-sky-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>Privacy Settings</span>
                </button>

                <button
                  onClick={() => { setActiveTab('notifications'); setEditingField(null); }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all whitespace-nowrap shrink-0 ${
                    activeTab === 'notifications'
                      ? 'bg-sky-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  <span>Notifications</span>
                </button>

                <button
                  onClick={() => { setActiveTab('contacts'); setEditingField(null); }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all whitespace-nowrap shrink-0 ${
                    activeTab === 'contacts'
                      ? 'bg-sky-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Import Contacts</span>
                </button>

                <button
                  onClick={() => { setActiveTab('account'); setEditingField(null); }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all whitespace-nowrap shrink-0 ${
                    activeTab === 'account'
                      ? 'bg-sky-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>Account & Delete</span>
                </button>
              </nav>
            </div>

            {/* Bottom Account details card */}
            <div className="hidden md:block pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2.5 p-1.5 rounded-2xl bg-slate-100 border border-slate-200/50">
                <div className="w-8 h-8 rounded-full bg-sky-500 text-white font-bold text-xs flex items-center justify-center shrink-0 border border-white">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Me" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    displayName.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="overflow-hidden">
                  <p className="text-[11px] font-bold text-slate-900 truncate">{displayName}</p>
                  <p className="text-[9px] font-mono text-slate-500 truncate">{user.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT VIEWPORT: Tab Contents */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {/* Topbar/Close Header */}
            <div className="px-6 py-4 border-b border-slate-150 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-slate-900 text-base capitalize tracking-tight flex items-center gap-2">
                  {activeTab === 'profile' && <User className="w-5 h-5 text-sky-500" />}
                  {activeTab === 'privacy' && <Shield className="w-5 h-5 text-sky-500" />}
                  {activeTab === 'notifications' && <Bell className="w-5 h-5 text-sky-500" />}
                  {activeTab === 'contacts' && <Users className="w-5 h-5 text-sky-500" />}
                  {activeTab === 'account' && <Lock className="w-5 h-5 text-sky-500" />}
                  {activeTab === 'profile' && 'Your Profile Details'}
                  {activeTab === 'privacy' && 'Who can see my details'}
                  {activeTab === 'notifications' && 'Notification Settings'}
                  {activeTab === 'contacts' && 'Contact Sync & Mapping'}
                  {activeTab === 'account' && 'Account & Security Settings'}
                </h4>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Inner Content Scroller */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-5"
                >
                  
                  {/* TAB 1: PROFILE EDITING */}
                  {activeTab === 'profile' && (
                    <div className="space-y-5">
                      {/* Avatar Hero */}
                      <div className="flex flex-col items-center justify-center space-y-2 py-3 bg-slate-50 border border-slate-200/75 rounded-3xl relative">
                        <div className="relative group">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={displayName}
                              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md ring-2 ring-sky-500/10"
                            />
                          ) : (
                            <div className="w-24 h-24 rounded-full bg-sky-500 text-white font-bold text-3xl flex items-center justify-center shadow-md border-4 border-white ring-2 ring-sky-500/10">
                              {displayName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <button
                            onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                            className="absolute bottom-0 right-0 p-2 bg-sky-500 hover:bg-sky-600 text-white rounded-full shadow-lg border border-white transition-transform active:scale-95"
                          >
                            <Camera className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Change Profile Picture</span>

                        <AnimatePresence>
                          {showAvatarPicker && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute top-full mt-2 bg-white border border-slate-200 rounded-2xl p-3 shadow-xl z-20 space-y-2.5 max-w-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Select Preset Avatar</span>
                                <button onClick={() => setShowAvatarPicker(false)} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
                              </div>
                              <div className="grid grid-cols-6 gap-1.5">
                                {PRESET_AVATARS.map((url, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => handleSelectAvatar(url)}
                                    className={`relative rounded-full overflow-hidden border-2 transition-all ${
                                      avatarUrl === url ? 'border-sky-500 scale-105' : 'border-transparent'
                                    }`}
                                  >
                                    <img src={url} alt={`Preset ${idx}`} className="w-8 h-8 object-cover" />
                                  </button>
                                ))}
                              </div>
                              <div className="pt-2 border-t border-slate-100 flex gap-1.5">
                                <input
                                  type="url"
                                  placeholder="Or paste URL (https://...)"
                                  value={customAvatarInput}
                                  onChange={(e) => setCustomAvatarInput(e.target.value)}
                                  className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] focus:outline-none"
                                />
                                <button
                                  onClick={() => {
                                    if (customAvatarInput.trim()) {
                                      handleSelectAvatar(customAvatarInput.trim());
                                      setCustomAvatarInput('');
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-sky-500 text-white rounded-xl text-[11px] font-bold"
                                >
                                  Set
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Profile Inputs */}
                      <div className="bg-slate-50/40 border border-slate-150 rounded-2xl p-4 space-y-4">
                        {/* Display Name */}
                        <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-sky-500" /> Display Name
                            </span>
                            {editingField === 'name' ? (
                              <div className="flex items-center gap-2 mt-1.5">
                                <input
                                  type="text"
                                  value={displayName}
                                  onChange={(e) => setDisplayName(e.target.value)}
                                  className="flex-1 max-w-sm px-3 py-1.5 bg-white border border-sky-500 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500/20"
                                />
                                <button onClick={() => handleSaveProfileField('name')} className="p-1.5 bg-emerald-500 text-white rounded-lg"><Check className="w-3.5 h-3.5" /></button>
                                <button onClick={() => setEditingField(null)} className="p-1.5 bg-slate-200 text-slate-600 rounded-lg"><X className="w-3.5 h-3.5" /></button>
                              </div>
                            ) : (
                              <p className="text-xs font-bold text-slate-800 mt-1">{displayName}</p>
                            )}
                          </div>
                          {editingField !== 'name' && (
                            <button onClick={() => setEditingField('name')} className="p-1 text-sky-600 hover:bg-sky-50 rounded-lg text-xs font-bold flex items-center gap-1"><Edit2 className="w-3.5 h-3.5" /> Edit</button>
                          )}
                        </div>

                        {/* Username */}
                        <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-sky-500" /> Username / ID
                            </span>
                            {editingField === 'username' ? (
                              <div className="flex items-center gap-2 mt-1.5">
                                <div className="relative flex-1 max-w-sm">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-600 font-mono font-bold text-xs">@</span>
                                  <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                                    className="w-full pl-6 pr-3 py-1.5 bg-white border border-sky-500 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-sky-500/20"
                                  />
                                </div>
                                <button onClick={() => handleSaveProfileField('username')} className="p-1.5 bg-emerald-500 text-white rounded-lg"><Check className="w-3.5 h-3.5" /></button>
                                <button onClick={() => setEditingField(null)} className="p-1.5 bg-slate-200 text-slate-600 rounded-lg"><X className="w-3.5 h-3.5" /></button>
                              </div>
                            ) : (
                              <p className="text-xs font-mono font-extrabold text-sky-600 mt-1">@{username || 'not_set'}</p>
                            )}
                          </div>
                          {editingField !== 'username' && (
                            <button onClick={() => setEditingField('username')} className="p-1 text-sky-600 hover:bg-sky-50 rounded-lg text-xs font-bold flex items-center gap-1"><Edit2 className="w-3.5 h-3.5" /> Edit</button>
                          )}
                        </div>

                        {/* Phone Number */}
                        <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Smartphone className="w-3.5 h-3.5 text-sky-500" /> Phone Number
                            </span>
                            {editingField === 'phone' ? (
                              <div className="flex items-center gap-2 mt-1.5">
                                <input
                                  type="text"
                                  placeholder="+1 (555) 0199"
                                  value={phoneNumber}
                                  onChange={(e) => setPhoneNumber(e.target.value)}
                                  className="flex-1 max-w-sm px-3 py-1.5 bg-white border border-sky-500 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500/20"
                                />
                                <button onClick={() => handleSaveProfileField('phone')} className="p-1.5 bg-emerald-500 text-white rounded-lg"><Check className="w-3.5 h-3.5" /></button>
                                <button onClick={() => setEditingField(null)} className="p-1.5 bg-slate-200 text-slate-600 rounded-lg"><X className="w-3.5 h-3.5" /></button>
                              </div>
                            ) : (
                              <p className="text-xs font-bold text-slate-800 mt-1">{phoneNumber || 'Add your phone number'}</p>
                            )}
                          </div>
                          {editingField !== 'phone' && (
                            <button onClick={() => setEditingField('phone')} className="p-1 text-sky-600 hover:bg-sky-50 rounded-lg text-xs font-bold flex items-center gap-1"><Edit2 className="w-3.5 h-3.5" /> Edit</button>
                          )}
                        </div>

                        {/* About/Status Text */}
                        <div className="pb-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 text-sky-500" /> About Status Text
                          </span>
                          {editingField === 'about' ? (
                            <div className="space-y-2 mt-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={aboutText}
                                  onChange={(e) => setAboutText(e.target.value)}
                                  className="flex-1 px-3 py-1.5 bg-white border border-sky-500 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-sky-500/20"
                                />
                                <button onClick={() => handleSaveProfileField('about')} className="p-1.5 bg-emerald-500 text-white rounded-lg"><Check className="w-3.5 h-3.5" /></button>
                                <button onClick={() => setEditingField(null)} className="p-1.5 bg-slate-200 text-slate-600 rounded-lg"><X className="w-3.5 h-3.5" /></button>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {PRESET_STATUSES.map((preset) => (
                                  <button
                                    key={preset}
                                    onClick={() => { setAboutText(preset); }}
                                    className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-600 hover:bg-sky-50"
                                  >
                                    {preset}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2 mt-1">
                              <p className="text-xs font-medium text-slate-800 leading-relaxed">{aboutText}</p>
                              <button onClick={() => setEditingField('about')} className="p-1 text-sky-600 hover:bg-sky-50 rounded-lg text-xs font-bold flex items-center gap-1"><Edit2 className="w-3.5 h-3.5" /> Edit</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: PRIVACY SETTINGS */}
                  {activeTab === 'privacy' && (
                    <div className="space-y-5">
                      <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl">
                        <h5 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-3">Who Can See My Details</h5>
                        
                        <div className="space-y-4">
                          {/* Last Seen Visibility */}
                          <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100">
                            <div>
                              <h6 className="text-xs font-bold text-slate-900">Last Seen & Online status</h6>
                              <p className="text-[10px] text-slate-500 mt-0.5">Control who can view when you were last online.</p>
                            </div>
                            <select
                              value={privacySettings?.lastSeenVisibility || 'everyone'}
                              onChange={(e) => handleUpdatePrivacySetting('lastSeenVisibility', e.target.value as PrivacyValue)}
                              className="px-2 py-1 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                            >
                              <option value="everyone">Everyone</option>
                              <option value="contacts">My Contacts</option>
                              <option value="nobody">Nobody</option>
                            </select>
                          </div>

                          {/* Profile Photo Visibility */}
                          <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100">
                            <div>
                              <h6 className="text-xs font-bold text-slate-900">Profile Photo</h6>
                              <p className="text-[10px] text-slate-500 mt-0.5">Who can view your profile picture.</p>
                            </div>
                            <select
                              value={privacySettings?.profilePhotoVisibility || 'everyone'}
                              onChange={(e) => handleUpdatePrivacySetting('profilePhotoVisibility', e.target.value as PrivacyValue)}
                              className="px-2 py-1 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                            >
                              <option value="everyone">Everyone</option>
                              <option value="contacts">My Contacts</option>
                              <option value="nobody">Nobody</option>
                            </select>
                          </div>

                          {/* About Status Visibility */}
                          <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100">
                            <div>
                              <h6 className="text-xs font-bold text-slate-900">About/Status Text</h6>
                              <p className="text-[10px] text-slate-500 mt-0.5">Who can view your custom "About" messages.</p>
                            </div>
                            <select
                              value={privacySettings?.aboutVisibility || 'everyone'}
                              onChange={(e) => handleUpdatePrivacySetting('aboutVisibility', e.target.value as PrivacyValue)}
                              className="px-2 py-1 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                            >
                              <option value="everyone">Everyone</option>
                              <option value="contacts">My Contacts</option>
                              <option value="nobody">Nobody</option>
                            </select>
                          </div>

                          {/* Story Status updates Visibility */}
                          <div className="flex items-center justify-between gap-4 py-2">
                            <div>
                              <h6 className="text-xs font-bold text-slate-900">Story/Status Updates</h6>
                              <p className="text-[10px] text-slate-500 mt-0.5">Who receives notifications when you upload status stories.</p>
                            </div>
                            <select
                              value={privacySettings?.statusVisibility || 'everyone'}
                              onChange={(e) => handleUpdatePrivacySetting('statusVisibility', e.target.value as PrivacyValue)}
                              className="px-2 py-1 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                            >
                              <option value="everyone">Everyone</option>
                              <option value="contacts">My Contacts</option>
                              <option value="nobody">Nobody</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Blocked Users Section */}
                      <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl">
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div>
                            <h5 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1">
                              <Ban className="w-3.5 h-3.5 text-rose-500" /> Blocked Contacts List
                            </h5>
                            <p className="text-[10px] text-slate-500 mt-0.5">Blocked contacts cannot call, text, or view your online metadata.</p>
                          </div>
                          
                          <button
                            onClick={() => setShowBlockSelector(!showBlockSelector)}
                            className="px-2.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow-2xs"
                          >
                            <Plus className="w-3 h-3" /> Block Contact
                          </button>
                        </div>

                        {/* Block Picker Popover */}
                        {showBlockSelector && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3 bg-white border border-slate-200 rounded-xl mb-3 space-y-2"
                          >
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Select Contact to Block:</span>
                            <div className="max-h-40 overflow-y-auto space-y-1">
                              {syncedContacts.filter(c => c.mappedUserId && !privacySettings?.blockedUsers.includes(c.mappedUserId)).map((contact) => (
                                <button
                                  key={contact.id}
                                  onClick={() => {
                                    if (contact.mappedUserId) {
                                      handleToggleBlock(contact.mappedUserId);
                                      setShowBlockSelector(false);
                                    }
                                  }}
                                  className="w-full text-left p-1.5 rounded-lg hover:bg-slate-50 flex items-center justify-between text-xs font-semibold"
                                >
                                  <span>{contact.name} ({contact.email})</span>
                                  <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Select</span>
                                </button>
                              ))}
                              {syncedContacts.filter(c => c.mappedUserId && !privacySettings?.blockedUsers.includes(c.mappedUserId)).length === 0 && (
                                <p className="text-[11px] text-slate-400 italic p-1">No connectable active app users to block.</p>
                              )}
                            </div>
                          </motion.div>
                        )}

                        {/* List of blocked profiles */}
                        <div className="space-y-1.5">
                          {blockedProfiles.map((p) => (
                            <div key={p.id} className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-2 shadow-2xs">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0">
                                  {p.avatar_url ? (
                                    <img src={p.avatar_url} alt="Blocked" className="w-full h-full rounded-full object-cover" />
                                  ) : (
                                    p.display_name?.slice(0, 2).toUpperCase()
                                  )}
                                </div>
                                <div className="overflow-hidden">
                                  <h6 className="text-xs font-bold text-slate-900 truncate">{p.display_name}</h6>
                                  <p className="text-[9px] text-slate-500 font-mono truncate">{p.email}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleToggleBlock(p.id)}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-lg"
                              >
                                Unblock
                              </button>
                            </div>
                          ))}
                          {blockedProfiles.length === 0 && (
                            <div className="p-4 bg-white border border-slate-200 rounded-xl text-center text-xs text-slate-400 italic">
                              You have not blocked any contacts.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: NOTIFICATIONS PREFERENCES */}
                  {activeTab === 'notifications' && (
                    <div className="space-y-4">
                      {loadingNotifs ? (
                        <div className="p-6 bg-slate-50 rounded-2xl flex items-center justify-center text-xs text-slate-500 gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-sky-500" />
                          <span>Syncing notification preferences...</span>
                        </div>
                      ) : (
                        <div className="bg-slate-50 border border-slate-150 rounded-2xl overflow-hidden divide-y divide-slate-150">
                          {/* Device push toggle */}
                          <div className="p-4 flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <h5 className="font-bold text-xs text-slate-900">Background Device Push Notifications</h5>
                              <p className="text-[10px] text-slate-500 mt-0.5">Register browser token to receive offline chat alerts.</p>
                            </div>
                            <button
                              onClick={handleTogglePushSubscription}
                              className={`w-10 h-5.5 flex items-center rounded-full p-0.5 transition-colors ${
                                isSubscribed ? 'bg-sky-500 justify-end' : 'bg-slate-300 justify-start'
                              }`}
                            >
                              <div className="w-4.5 h-4.5 bg-white rounded-full shadow-xs" />
                            </button>
                          </div>

                          {/* Global mute */}
                          <div className="p-4 flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <h5 className="font-bold text-xs text-slate-900">Global Do-Not-Disturb Mute</h5>
                              <p className="text-[10px] text-slate-500 mt-0.5">Mute all alert noises, toasts, and pushes instantly.</p>
                            </div>
                            <button
                              onClick={handleToggleGlobalMute}
                              className={`w-10 h-5.5 flex items-center rounded-full p-0.5 transition-colors ${
                                notifSettings?.globalMute ? 'bg-sky-500 justify-end' : 'bg-slate-300 justify-start'
                              }`}
                            >
                              <div className="w-4.5 h-4.5 bg-white rounded-full shadow-xs" />
                            </button>
                          </div>

                          {/* Show message previews */}
                          <div className="p-4 flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <h5 className="font-bold text-xs text-slate-900">Show Message Details & Previews</h5>
                              <p className="text-[10px] text-slate-500 mt-0.5">Hide content details inside background banner notices if turned off.</p>
                            </div>
                            <button
                              onClick={handleTogglePreviews}
                              disabled={notifSettings?.globalMute}
                              className={`w-10 h-5.5 flex items-center rounded-full p-0.5 transition-colors ${
                                notifSettings?.showPreviews && !notifSettings?.globalMute ? 'bg-sky-500 justify-end' : 'bg-slate-300 justify-start'
                              }`}
                            >
                              <div className="w-4.5 h-4.5 bg-white rounded-full shadow-xs" />
                            </button>
                          </div>

                          {/* Sound alerts */}
                          <div className="p-4 flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <h5 className="font-bold text-xs text-slate-900">Play Ring/Chime Sound Alerts</h5>
                              <p className="text-[10px] text-slate-500 mt-0.5">Play audio notification sound effects on incoming messages.</p>
                            </div>
                            <button
                              onClick={handleToggleSound}
                              disabled={notifSettings?.globalMute}
                              className={`w-10 h-5.5 flex items-center rounded-full p-0.5 transition-colors ${
                                notifSettings?.soundEnabled && !notifSettings?.globalMute ? 'bg-sky-500 justify-end' : 'bg-slate-300 justify-start'
                              }`}
                            >
                              <div className="w-4.5 h-4.5 bg-white rounded-full shadow-xs" />
                            </button>
                          </div>

                          {/* Status updates notifications */}
                          <div className="p-4 flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <h5 className="font-bold text-xs text-slate-900">Status Update Notifications</h5>
                              <p className="text-[10px] text-slate-500 mt-0.5">Get notified when a connected contact publishes status updates.</p>
                            </div>
                            <button
                              onClick={handleToggleStatusUpdates}
                              disabled={notifSettings?.globalMute}
                              className={`w-10 h-5.5 flex items-center rounded-full p-0.5 transition-colors ${
                                notifSettings?.statusUpdatesEnabled && !notifSettings?.globalMute ? 'bg-sky-500 justify-end' : 'bg-slate-300 justify-start'
                              }`}
                            >
                              <div className="w-4.5 h-4.5 bg-white rounded-full shadow-xs" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: CONTACTS IMPORT / SYNC */}
                  {activeTab === 'contacts' && (
                    <div className="space-y-4">
                      {/* Double layout: Upload CSV or Manual form */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Area 1: CSV Upload with Drag-and-Drop */}
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          className={`border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center text-center transition-all ${
                            isDraggingCSV
                              ? 'border-sky-500 bg-sky-50/50'
                              : 'border-slate-300 bg-slate-50 hover:bg-slate-100/50'
                          }`}
                        >
                          <Upload className="w-10 h-10 text-sky-500 mb-3" />
                          <h6 className="text-xs font-bold text-slate-800">CSV Contact File Upload</h6>
                          <p className="text-[10px] text-slate-500 mt-1 max-w-xs leading-normal">
                            Upload a spreadsheet .csv file. Columns must start with: <span className="font-bold font-mono">Name, Phone, Email</span>.
                          </p>

                          <label className="mt-4 px-3.5 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-[11px] font-bold rounded-xl cursor-pointer shadow-xs transition-colors">
                            <span>Choose File</span>
                            <input
                              type="file"
                              accept=".csv"
                              onChange={handleCSVUpload}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {/* Area 2: Manual entry */}
                        <form onSubmit={handleAddManualContact} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 flex flex-col justify-between">
                          <div>
                            <h6 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1">
                              <Plus className="w-3.5 h-3.5 text-sky-500" /> Add Contact Manually
                            </h6>
                            
                            <div className="space-y-2">
                              <input
                                type="text"
                                placeholder="Contact Full Name"
                                value={manualName}
                                onChange={(e) => setManualName(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                              />
                              <input
                                type="text"
                                placeholder="Phone number (e.g., +15550192)"
                                value={manualPhone}
                                onChange={(e) => setManualPhone(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                              />
                              <input
                                type="email"
                                placeholder="Email Address (e.g., alex@cove.app)"
                                value={manualEmail}
                                onChange={(e) => setManualEmail(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                              />
                            </div>
                          </div>

                          <button
                            type="submit"
                            className="w-full mt-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-[11px] font-bold rounded-xl transition-colors shadow-2xs"
                          >
                            Add Manual Contact & Sync Map
                          </button>
                        </form>
                      </div>

                      {/* Synced List & mapping outcomes */}
                      <div className="border border-slate-150 rounded-2xl p-4 bg-white space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-sky-500" /> Synced Devices & mapped Users ({syncedContacts.length})
                          </h5>
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                            Mapped Active: {syncedContacts.filter(c => c.isRegistered).length}
                          </span>
                        </div>

                        <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
                          {syncedContacts.map((contact) => (
                            <div key={contact.id} className="py-2 flex items-center justify-between gap-3 text-xs">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 font-bold text-[10px] flex items-center justify-center shrink-0 border border-slate-200/50">
                                  {contact.avatarUrl ? (
                                    <img src={contact.avatarUrl} alt={contact.name} className="w-full h-full rounded-full object-cover" />
                                  ) : (
                                    contact.name.slice(0, 2).toUpperCase()
                                  )}
                                </div>
                                <div className="overflow-hidden">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-slate-900 truncate">{contact.name}</span>
                                    {contact.isRegistered ? (
                                      <span className="text-[8px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-1 py-0.1 rounded">Registered</span>
                                    ) : (
                                      <span className="text-[8px] bg-slate-50 text-slate-400 border border-slate-100 px-1 py-0.1 rounded">Not Registered</span>
                                    )}
                                  </div>
                                  <p className="text-[9px] text-slate-500 truncate mt-0.5 font-mono">
                                    {contact.phone || 'No phone'} • {contact.email || 'No email'}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {contact.isRegistered && contact.mappedUserId && (
                                  <button
                                    onClick={() => {
                                      if (onOpenChatWithProfile) {
                                        onOpenChatWithProfile({
                                          id: contact.mappedUserId!,
                                          email: contact.email,
                                          display_name: contact.name,
                                          avatar_url: contact.avatarUrl || undefined,
                                          about: contact.about || undefined,
                                        });
                                        onClose();
                                      }
                                    }}
                                    className="p-1 text-sky-600 hover:bg-sky-50 rounded-lg"
                                    title="Message Contact"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {!contact.isRegistered && (
                                  <button
                                    onClick={() => {
                                      showToast('success', 'Invite Request Sent!', `Sent email/SMS invitation containing client download link to ${contact.email || contact.phone}`);
                                    }}
                                    className="px-2 py-0.5 bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-600 text-[9px] font-bold rounded-lg transition-colors"
                                  >
                                    Invite
                                  </button>
                                )}
                                <button
                                  onClick={() => handleClearContact(contact.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded-lg"
                                  title="Delete Sync"
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                          {syncedContacts.length === 0 && (
                            <div className="p-6 text-center text-xs text-slate-400 italic">
                              You have not imported any contacts yet. Upload a CSV file or enter details manually.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 5: ACCOUNT & SECURITY */}
                  {activeTab === 'account' && (
                    <div className="space-y-5">
                      <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl space-y-4">
                        <h5 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Account Information</h5>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="p-3 bg-white border border-slate-200 rounded-xl">
                            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Email Credentials</span>
                            <span className="text-xs font-bold font-mono text-slate-800">{user.email}</span>
                          </div>
                          
                          <div className="p-3 bg-white border border-slate-200 rounded-xl">
                            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Unique Session ID</span>
                            <span className="text-[10px] font-mono text-slate-500 truncate block">{user.id}</span>
                          </div>
                        </div>
                      </div>

                      {/* Delete Account */}
                      <div className="p-4 bg-rose-50/40 border border-rose-200/70 rounded-2xl space-y-3">
                        <h5 className="text-xs font-extrabold text-rose-500 uppercase tracking-wider flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" /> Danger Zone
                        </h5>

                        {!showDeleteConfirm ? (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <h6 className="text-xs font-bold text-rose-950">Permanently Delete Account</h6>
                              <p className="text-[10px] text-rose-700 mt-0.5">Permanently delete your profile, chats, unreads, and settings.</p>
                            </div>
                            <button
                              onClick={() => setShowDeleteConfirm(true)}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors shrink-0"
                            >
                              Delete Account
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-xs text-rose-800 font-medium leading-relaxed">
                              Are you absolutely sure? This action is irreversible. All of your synced databases, logs, contacts list, and profiles will be destroyed.
                            </p>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-rose-900 block">Type <span className="font-mono underline">DELETE</span> to confirm:</label>
                              <input
                                type="text"
                                value={confirmInput}
                                onChange={(e) => setConfirmInput(e.target.value)}
                                placeholder="DELETE"
                                className="w-full max-w-xs px-2.5 py-1.5 bg-white border border-rose-300 rounded-xl text-xs font-mono font-bold text-rose-950 focus:outline-none focus:border-rose-600"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={handleAccountDelete}
                                disabled={confirmInput.trim().toUpperCase() !== 'DELETE' || isDeleting}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg"
                              >
                                {isDeleting ? 'Deleting...' : 'Confirm Deletion'}
                              </button>
                              <button
                                onClick={() => { setShowDeleteConfirm(false); setConfirmInput(''); }}
                                className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
            </div>

            {/* Bottom bar with action buttons */}
            <div className="px-6 py-4 border-t border-slate-150 bg-slate-50 flex items-center justify-between shrink-0">
              <button
                onClick={() => {
                  onClose();
                  onSignOut();
                }}
                className="text-xs font-bold text-slate-500 hover:text-rose-600 flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>

              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-colors shadow-2xs"
              >
                Close Settings
              </button>
            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
