import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Camera,
  Edit2,
  Check,
  X,
  User,
  AtSign,
  Info,
  Mail,
  UserPlus,
  MessageSquare,
  Copy,
  Sparkles,
  ShieldCheck,
  Phone,
  Smile,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile, Profile, ContactRequest } from '../types';
import { generateAutoUsername, validateUsername } from '../lib/username';

interface ProfileViewProps {
  user: UserProfile;
  otherProfile?: Profile | null; // If provided, view another user's profile
  contactStatus?: 'none' | 'pending' | 'accepted';
  onBack?: () => void;
  onUpdateProfile?: (updated: Partial<UserProfile['user_metadata']>) => void;
  onConnectContact?: (targetProfile: Profile) => void;
  onOpenChat?: (targetProfile: Profile) => void;
  onOpenContactsDirectory?: () => void;
  showToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
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

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  otherProfile,
  contactStatus = 'none',
  onBack,
  onUpdateProfile,
  onConnectContact,
  onOpenChat,
  onOpenContactsDirectory,
  showToast,
}) => {
  const isSelf = !otherProfile || otherProfile.id === user.id;

  // Local editable state for own profile
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [about, setAbout] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Editing state controls
  const [editingName, setEditingName] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [editingAbout, setEditingAbout] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [customAvatarInput, setCustomAvatarInput] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Initialize or fetch profile data
  useEffect(() => {
    if (isSelf) {
      const meta = user.user_metadata || {};
      const currentName = meta.full_name || user.email?.split('@')[0] || 'Cove Member';
      
      // Check if username exists, if not generate one automatically
      let currentUsername = meta.username;
      if (!currentUsername) {
        currentUsername = generateAutoUsername(user.email || currentName);
        // Save initial auto-generated username
        saveProfileData({ username: currentUsername });
      }

      const currentAbout = meta.about || 'Hey there! I am using Cove.';
      const currentAvatar = meta.avatar_url || '';

      setDisplayName(currentName);
      setUsername(currentUsername.replace(/^@/, ''));
      setAbout(currentAbout);
      setAvatarUrl(currentAvatar);
    }
  }, [user, isSelf]);

  const saveProfileData = async (fieldsToUpdate: {
    full_name?: string;
    username?: string;
    about?: string;
    avatar_url?: string;
  }) => {
    setSaving(true);
    try {
      const cleanUsername = fieldsToUpdate.username
        ? fieldsToUpdate.username.replace(/^@/, '').trim()
        : username;

      const newMetadata = {
        ...(user.user_metadata || {}),
        ...fieldsToUpdate,
        username: cleanUsername,
      };

      // 1. Update Supabase Auth user metadata
      const { data: authData, error: authErr } = await supabase.auth.updateUser({
        data: newMetadata,
      });

      if (authErr) {
        console.warn('Notice updating auth metadata:', authErr.message);
      }

      // 2. Upsert Supabase 'profiles' table record
      try {
        await supabase.from('profiles').upsert([
          {
            id: user.id,
            email: user.email,
            display_name: fieldsToUpdate.full_name || displayName,
            username: cleanUsername,
            about: fieldsToUpdate.about !== undefined ? fieldsToUpdate.about : about,
            avatar_url: fieldsToUpdate.avatar_url !== undefined ? fieldsToUpdate.avatar_url : avatarUrl,
          },
        ], { onConflict: 'id' });
      } catch (pErr) {
        console.warn('Notice updating profiles table:', pErr);
      }

      // 3. Update parent callback and notify
      if (onUpdateProfile) {
        onUpdateProfile(newMetadata);
      }

      // Save to localStorage fallback
      localStorage.setItem(`cove_profile_${user.id}`, JSON.stringify(newMetadata));

      showToast('success', 'Profile Updated', 'Your profile details have been saved.');
    } catch (err: any) {
      console.error('Error saving profile:', err);
      showToast('error', 'Update Failed', err.message || 'Could not save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveName = () => {
    if (!displayName.trim()) {
      showToast('error', 'Invalid Name', 'Display name cannot be empty.');
      return;
    }
    setEditingName(false);
    saveProfileData({ full_name: displayName.trim() });
  };

  const handleSaveUsername = () => {
    const val = validateUsername(username);
    if (!val.isValid) {
      setUsernameError(val.error || 'Invalid username');
      showToast('error', 'Invalid Username', val.error || 'Invalid username');
      return;
    }

    setUsernameError(null);
    setEditingUsername(false);
    const cleanUser = username.replace(/^@/, '').trim().toLowerCase();
    setUsername(cleanUser);
    saveProfileData({ username: cleanUser });
  };

  const handleSaveAbout = (newStatusText?: string) => {
    const statusToSave = newStatusText !== undefined ? newStatusText : about;
    setAbout(statusToSave);
    setEditingAbout(false);
    saveProfileData({ about: statusToSave });
  };

  const handleSelectAvatar = (url: string) => {
    setAvatarUrl(url);
    setShowAvatarPicker(false);
    saveProfileData({ avatar_url: url });
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    showToast('info', 'Copied to Clipboard', text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Content for Other User Profile
  if (!isSelf && otherProfile) {
    const otherName = otherProfile.display_name || otherProfile.email.split('@')[0] || 'Cove Member';
    const otherUsername = otherProfile.username || generateAutoUsername(otherProfile.email);
    const otherAbout = otherProfile.about || 'Hey there! I am using Cove.';
    const otherAvatar = otherProfile.avatar_url;

    return (
      <div className="flex flex-col h-full bg-slate-50 font-sans select-none overflow-y-auto">
        {/* Top Bar Header */}
        <div className="px-4 py-3.5 bg-slate-900 text-white flex items-center gap-3 shrink-0 shadow-md">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 hover:bg-slate-800 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
          )}
          <h2 className="font-bold text-base tracking-tight">Contact Info</h2>
        </div>

        {/* Hero Avatar Header */}
        <div className="bg-white border-b border-slate-200 p-6 flex flex-col items-center justify-center text-center space-y-3">
          <div className="relative">
            {otherAvatar ? (
              <img
                src={otherAvatar}
                alt={otherName}
                className="w-28 h-28 rounded-full object-cover border-4 border-slate-100 shadow-md"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-sky-500 text-white font-bold text-3xl flex items-center justify-center shadow-md border-4 border-slate-100">
                {otherName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <div>
            <h1 className="text-xl font-bold text-slate-900">{otherName}</h1>
            <p className="text-xs font-semibold text-sky-600 font-mono mt-0.5">
              @{otherUsername.replace(/^@/, '')}
            </p>
            <p className="text-xs text-slate-500 font-mono mt-1">{otherProfile.email}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2 w-full max-w-xs">
            {onOpenChat && (
              <button
                onClick={() => onOpenChat(otherProfile)}
                className="flex-1 py-2 px-4 bg-sky-500 hover:bg-sky-600 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Message</span>
              </button>
            )}

            {contactStatus === 'none' && onConnectContact && (
              <button
                onClick={() => onConnectContact(otherProfile)}
                className="flex-1 py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>Connect</span>
              </button>
            )}

            {contactStatus === 'pending' && (
              <span className="flex-1 py-2 px-4 bg-amber-50 text-amber-700 border border-amber-200 font-semibold text-xs rounded-xl text-center">
                Request Pending
              </span>
            )}

            {contactStatus === 'accepted' && (
              <span className="flex-1 py-2 px-4 bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-xs rounded-xl text-center flex items-center justify-center gap-1">
                <Check className="w-3.5 h-3.5" /> Connected
              </span>
            )}
          </div>
        </div>

        {/* WhatsApp-style Details List */}
        <div className="p-4 space-y-3 max-w-lg mx-auto w-full">
          {/* About / Status */}
          <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-2xs space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              About
            </span>
            <p className="text-sm font-medium text-slate-800 leading-relaxed">{otherAbout}</p>
          </div>

          {/* Email & Copy */}
          <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Email
              </span>
              <p className="text-xs font-mono font-semibold text-slate-800">{otherProfile.email}</p>
            </div>
            <button
              onClick={() => handleCopyText(otherProfile.email, 'email')}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
              title="Copy Email"
            >
              {copiedText === 'email' ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Username & Copy */}
          <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Username
              </span>
              <p className="text-xs font-mono font-semibold text-sky-600">
                @{otherUsername.replace(/^@/, '')}
              </p>
            </div>
            <button
              onClick={() => handleCopyText(`@${otherUsername.replace(/^@/, '')}`, 'username')}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
              title="Copy Username"
            >
              {copiedText === 'username' ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Self Profile Editor & View (WhatsApp Style)
  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans select-none overflow-y-auto">
      {/* Top Header */}
      <div className="px-4 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 hover:bg-slate-800 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
          )}
          <div>
            <h2 className="font-bold text-base tracking-tight">Profile Details</h2>
            <p className="text-[10px] text-slate-400">Manage your Cove WhatsApp-style account</p>
          </div>
        </div>

        {onOpenContactsDirectory && (
          <button
            onClick={onOpenContactsDirectory}
            className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Connect Contacts</span>
          </button>
        )}
      </div>

      <div className="flex-1 p-4 md:p-6 max-w-xl mx-auto w-full space-y-5">
        {/* 1. Large Profile Avatar & Camera Button */}
        <div className="flex flex-col items-center justify-center space-y-3 py-2">
          <div className="relative group">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md ring-2 ring-sky-500/20"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-sky-500 text-white font-bold text-4xl flex items-center justify-center shadow-md border-4 border-white ring-2 ring-sky-500/20">
                {displayName.slice(0, 2).toUpperCase()}
              </div>
            )}

            <button
              onClick={() => setShowAvatarPicker(!showAvatarPicker)}
              className="absolute bottom-1 right-1 p-3 bg-sky-500 hover:bg-sky-600 text-white rounded-full shadow-lg border-2 border-white transition-transform active:scale-95"
              title="Change Profile Photo"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          <span className="text-[11px] text-slate-400 font-medium">
            Tap camera icon to change photo
          </span>

          {/* Avatar Picker Modal Dropdown */}
          <AnimatePresence>
            {showAvatarPicker && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="w-full bg-white border border-slate-200 rounded-2xl p-4 shadow-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Choose Profile Avatar
                  </h4>
                  <button
                    onClick={() => setShowAvatarPicker(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Preset Avatars */}
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_AVATARS.map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectAvatar(url)}
                      className={`relative rounded-full overflow-hidden border-2 hover:scale-105 transition-all ${
                        avatarUrl === url ? 'border-sky-500 ring-2 ring-sky-500/30' : 'border-transparent'
                      }`}
                    >
                      <img src={url} alt={`Preset ${idx}`} className="w-10 h-10 object-cover" />
                    </button>
                  ))}
                </div>

                {/* Custom URL Input */}
                <div className="pt-2 border-t border-slate-100 flex gap-2">
                  <input
                    type="url"
                    value={customAvatarInput}
                    onChange={(e) => setCustomAvatarInput(e.target.value)}
                    placeholder="Or paste image URL (https://...)"
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    onClick={() => {
                      if (customAvatarInput.trim()) {
                        handleSelectAvatar(customAvatarInput.trim());
                        setCustomAvatarInput('');
                      }
                    }}
                    className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold rounded-xl"
                  >
                    Set
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 2. WhatsApp Style Name Section */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-sky-500" /> Your Name
            </span>
            {!editingName && (
              <button
                onClick={() => setEditingName(true)}
                className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-slate-50 rounded-lg transition-colors"
                title="Edit Name"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {editingName ? (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoFocus
                className="flex-1 px-3 py-2 bg-slate-50 border border-sky-500 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
              <button
                onClick={handleSaveName}
                disabled={saving}
                className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-xs transition-colors"
                title="Save Name"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => setEditingName(false)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <p className="text-base font-bold text-slate-900 pt-0.5">{displayName}</p>
          )}

          <p className="text-[11px] text-slate-400 leading-normal pt-1 border-t border-slate-100">
            This is not your username or pin. This name will be visible to your Cove contacts.
          </p>
        </div>

        {/* 3. WhatsApp Style Username Section (@username) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <AtSign className="w-3.5 h-3.5 text-sky-500" /> Username
            </span>
            {!editingUsername && (
              <button
                onClick={() => setEditingUsername(true)}
                className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-slate-50 rounded-lg transition-colors"
                title="Edit Username"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {editingUsername ? (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-600 font-mono font-bold text-sm">
                    @
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''));
                      setUsernameError(null);
                    }}
                    autoFocus
                    placeholder="your_username"
                    className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-sky-500 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
                <button
                  onClick={handleSaveUsername}
                  disabled={saving}
                  className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-xs transition-colors"
                  title="Save Username"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setEditingUsername(false);
                    setUsernameError(null);
                  }}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {usernameError && (
                <p className="text-[11px] text-rose-500 font-medium">{usernameError}</p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-base font-mono font-bold text-sky-600 pt-0.5">
                @{username || 'set_username'}
              </p>
              <button
                onClick={() => handleCopyText(`@${username}`, 'username')}
                className="p-1 text-slate-400 hover:text-slate-600"
                title="Copy Username"
              >
                {copiedText === 'username' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          )}

          <p className="text-[11px] text-slate-400 leading-normal pt-1 border-t border-slate-100">
            Automatically created on signup. Usernames are unique identifiers that allow people to search and connect with you on Cove.
          </p>
        </div>

        {/* 4. WhatsApp Style About / Status Section */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-sky-500" /> About / Status
            </span>
            {!editingAbout && (
              <button
                onClick={() => setEditingAbout(true)}
                className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-slate-50 rounded-lg transition-colors"
                title="Edit Status"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {editingAbout ? (
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  autoFocus
                  placeholder="Hey there! I am using Cove."
                  className="flex-1 px-3 py-2 bg-slate-50 border border-sky-500 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
                <button
                  onClick={() => handleSaveAbout()}
                  disabled={saving}
                  className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-xs transition-colors"
                  title="Save About"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEditingAbout(false)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Preset Status Chips */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Select Quick Status:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_STATUSES.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handleSaveAbout(preset)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm font-medium text-slate-800 leading-relaxed pt-0.5">{about}</p>
          )}
        </div>

        {/* 5. Account Info & Verification Badge */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-3">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-sky-500" /> Account Details
          </span>

          <div className="flex items-center justify-between">
            <div className="overflow-hidden">
              <span className="text-[10px] text-slate-400 block font-medium">Registered Email</span>
              <p className="text-xs font-mono font-bold text-slate-800 truncate">{user.email}</p>
            </div>
            <div className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full text-[10px] font-bold flex items-center gap-1 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Verified
            </div>
          </div>
        </div>

        {/* 6. Quick Action to Connect Contacts */}
        <div className="p-4 bg-gradient-to-r from-sky-500 to-sky-600 rounded-2xl text-white shadow-md flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="font-bold text-sm flex items-center gap-1.5">
              <UserPlus className="w-4 h-4" /> Connect New Contacts
            </h4>
            <p className="text-xs text-sky-100">Find users by username or email address</p>
          </div>
          {onOpenContactsDirectory && (
            <button
              onClick={onOpenContactsDirectory}
              className="px-3.5 py-2 bg-white text-sky-700 hover:bg-sky-50 font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0"
            >
              Search Directory
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
