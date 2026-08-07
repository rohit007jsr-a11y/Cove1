import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  X,
  Check,
  Search,
  ArrowRight,
  ArrowLeft,
  Shield,
  MessageSquare,
  Image as ImageIcon,
  Sparkles,
  Lock
} from 'lucide-react';
import { ContactRequest, UserProfile, GroupSettings } from '../types';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  contacts: ContactRequest[];
  onGroupCreated: (newGroup: any) => void;
  showToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=150&auto=format&fit=crop&q=80',
];

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  user,
  contacts,
  onGroupCreated,
  showToast,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(PRESET_AVATARS[0]);
  const [settings, setSettings] = useState<GroupSettings>({
    onlyAdminsCanSend: false,
    onlyAdminsCanEditInfo: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Filter contacts by search query
  const filteredContacts = contacts.filter((c) => {
    const name = (c.profile?.display_name || '').toLowerCase();
    const email = (c.profile?.email || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  const toggleUserSelection = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds((prev) => prev.filter((id) => id !== userId));
    } else {
      setSelectedUserIds((prev) => [...prev, userId]);
    }
  };

  const handleNextStep = () => {
    if (selectedUserIds.length === 0) {
      showToast('error', 'Select Participants', 'Please select at least one contact for the group.');
      return;
    }
    setStep(2);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      showToast('error', 'Group Name Required', 'Please provide a title for your group.');
      return;
    }

    setIsSubmitting(true);
    try {
      const creatorName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Cove Member';
      const payload = {
        name: groupName.trim(),
        description: description.trim(),
        avatarUrl,
        creatorId: user.id,
        creatorName,
        participants: selectedUserIds,
        settings,
      };

      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to create group');

      const data = await res.json();
      showToast('success', 'Group Created', `Group "${groupName}" created with ${selectedUserIds.length + 1} members.`);
      onGroupCreated(data.group);
      onClose();

      // Reset state
      setStep(1);
      setSelectedUserIds([]);
      setGroupName('');
      setDescription('');
    } catch (err: any) {
      showToast('error', 'Creation Error', err.message || 'Could not create group session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200/80 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/20 text-sky-400 rounded-2xl border border-sky-400/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base">New Group Chat</h2>
              <p className="text-xs text-slate-400">Step {step} of 2 &bull; {step === 1 ? 'Add Participants' : 'Group Details'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex-1 flex flex-col overflow-hidden p-6"
            >
              <p className="text-xs text-slate-600 mb-3 font-medium">
                Select contacts from your accepted list to add to the group:
              </p>

              {/* Search Bar */}
              <div className="relative mb-4 shrink-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search contacts by name or email..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-100/80 border border-slate-200/80 focus:bg-white focus:border-sky-500 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-sans"
                />
              </div>

              {/* Contact List Feed */}
              <div className="flex-1 overflow-y-auto space-y-1 pr-1 border border-slate-100 rounded-2xl p-2 bg-slate-50/50">
                {filteredContacts.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No contacts found matching "{searchQuery}"
                  </div>
                ) : (
                  filteredContacts.map((contact) => {
                    const otherId = contact.requester_id === user.id ? contact.addressee_id : contact.requester_id;
                    const isSelected = selectedUserIds.includes(otherId);
                    const profile = contact.profile;
                    const displayName = profile?.display_name || profile?.email?.split('@')[0] || 'Cove Member';
                    const initials = displayName.slice(0, 2).toUpperCase();

                    return (
                      <button
                        key={contact.id}
                        onClick={() => toggleUserSelection(otherId)}
                        className={`w-full p-2.5 rounded-xl transition-all flex items-center justify-between gap-3 border ${
                          isSelected
                            ? 'bg-sky-50/80 border-sky-400/50 text-slate-900'
                            : 'hover:bg-white border-transparent text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="relative shrink-0">
                            {profile?.avatar_url ? (
                              <img
                                src={profile.avatar_url}
                                alt="Avatar"
                                className="w-9 h-9 rounded-full object-cover border border-slate-200"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-sky-500/10 text-sky-600 font-bold text-xs flex items-center justify-center border border-sky-500/20">
                                {initials}
                              </div>
                            )}
                          </div>
                          <div className="overflow-hidden text-left">
                            <p className="font-bold text-xs truncate text-slate-900">{displayName}</p>
                            <p className="text-[10px] text-slate-500 truncate font-mono">@{profile?.username || 'user'}</p>
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                            isSelected
                              ? 'bg-sky-500 border-sky-500 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Selection Summary Footer */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between shrink-0">
                <span className="text-xs font-semibold text-slate-600">
                  {selectedUserIds.length} contact{selectedUserIds.length === 1 ? '' : 's'} selected
                </span>
                <button
                  onClick={handleNextStep}
                  disabled={selectedUserIds.length === 0}
                  className="px-5 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-2"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex-1 flex flex-col overflow-y-auto p-6 space-y-4"
            >
              <form onSubmit={handleCreateGroup} className="space-y-4">
                {/* Avatar Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Group Icon & Avatar
                  </label>
                  <div className="flex items-center gap-3">
                    <img
                      src={avatarUrl}
                      alt="Group Avatar"
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-sky-500 shadow-xs shrink-0"
                    />
                    <div className="flex flex-wrap gap-2">
                      {PRESET_AVATARS.map((url, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setAvatarUrl(url)}
                          className={`w-9 h-9 rounded-xl overflow-hidden border-2 transition-all ${
                            avatarUrl === url ? 'border-sky-500 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={url} alt="preset" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Group Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Group Subject / Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g. Design Team, Product Guild, Family"
                    className="w-full p-2.5 bg-slate-100/80 border border-slate-200/80 focus:bg-white focus:border-sky-500 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-sans font-bold"
                  />
                </div>

                {/* Group Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Group Description (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the group's topic or guidelines..."
                    className="w-full p-2.5 bg-slate-100/80 border border-slate-200/80 focus:bg-white focus:border-sky-500 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-sans resize-none"
                  />
                </div>

                {/* Settings Toggles */}
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-slate-800">Restrict Messages</p>
                      <p className="text-[10px] text-slate-500">Only admins can send messages in this group</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSettings((prev) => ({ ...prev, onlyAdminsCanSend: !prev.onlyAdminsCanSend }))
                      }
                      className={`w-10 h-6 rounded-full transition-colors relative p-0.5 ${
                        settings.onlyAdminsCanSend ? 'bg-sky-500' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full transition-transform shadow-xs ${
                          settings.onlyAdminsCanSend ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                    <div>
                      <p className="font-bold text-xs text-slate-800">Restrict Group Settings</p>
                      <p className="text-[10px] text-slate-500">Only admins can edit subject, icon & info</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSettings((prev) => ({ ...prev, onlyAdminsCanEditInfo: !prev.onlyAdminsCanEditInfo }))
                      }
                      className={`w-10 h-6 rounded-full transition-colors relative p-0.5 ${
                        settings.onlyAdminsCanEditInfo ? 'bg-sky-500' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full transition-transform shadow-xs ${
                          settings.onlyAdminsCanEditInfo ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !groupName.trim()}
                    className="px-5 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-2"
                  >
                    <span>{isSubmitting ? 'Creating...' : 'Create Group'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
