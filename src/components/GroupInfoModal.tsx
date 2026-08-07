import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Users,
  Shield,
  ShieldAlert,
  UserPlus,
  UserMinus,
  Crown,
  Edit2,
  Check,
  LogOut,
  Trash2,
  Lock,
  MessageSquare,
  Sparkles,
  Info
} from 'lucide-react';
import { Group, UserProfile, ContactRequest } from '../types';

interface GroupInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  currentUser: UserProfile;
  contacts: ContactRequest[];
  onUpdateGroupInfo: (updatedFields: Partial<Group>) => Promise<void>;
  onAddParticipant: (targetUserId: string, targetUserName: string) => Promise<void>;
  onRemoveParticipant: (targetUserId: string, targetUserName: string) => Promise<void>;
  onChangeRole: (targetUserId: string, targetUserName: string, newRole: 'admin' | 'member') => Promise<void>;
  onLeaveGroup: () => Promise<void>;
  showToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const GroupInfoModal: React.FC<GroupInfoModalProps> = ({
  isOpen,
  onClose,
  group,
  currentUser,
  contacts,
  onUpdateGroupInfo,
  onAddParticipant,
  onRemoveParticipant,
  onChangeRole,
  onLeaveGroup,
  showToast,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [editDesc, setEditDesc] = useState(group.description || '');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    type: 'remove' | 'demote' | 'leave';
    targetUserId?: string;
    targetUserName?: string;
  } | null>(null);

  if (!isOpen) return null;

  const isAdmin = group.admins.includes(currentUser.id);
  const isCreator = group.creatorId === currentUser.id;

  const handleSaveInfo = async () => {
    if (!editName.trim()) return;
    try {
      await onUpdateGroupInfo({
        name: editName.trim(),
        description: editDesc.trim(),
      });
      setIsEditingName(false);
      showToast('success', 'Group Info Saved', 'Group name and description updated successfully.');
    } catch (err: any) {
      showToast('error', 'Update Failed', err.message);
    }
  };

  const handleToggleSetting = async (key: 'onlyAdminsCanSend' | 'onlyAdminsCanEditInfo') => {
    if (!isAdmin) {
      showToast('error', 'Admin Only', 'Only group admins can update group permissions.');
      return;
    }
    const updatedSettings = {
      ...group.settings,
      [key]: !group.settings[key],
    };
    try {
      await onUpdateGroupInfo({ settings: updatedSettings });
      showToast('info', 'Permissions Updated', 'Group settings changed.');
    } catch (err: any) {
      showToast('error', 'Update Failed', err.message);
    }
  };

  // Available contacts that are not yet participants in this group
  const availableContacts = contacts.filter((c) => {
    const otherId = c.requester_id === currentUser.id ? c.addressee_id : c.requester_id;
    return !group.participants.includes(otherId);
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs select-none">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Info className="w-5 h-5 text-sky-400" />
            <h2 className="font-bold text-base">Group Info</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Avatar and Group Name Header */}
          <div className="text-center flex flex-col items-center">
            <div className="relative mb-3">
              <img
                src={group.avatarUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150'}
                alt={group.name}
                className="w-20 h-20 rounded-3xl object-cover border-2 border-slate-200 shadow-md"
              />
            </div>

            {isEditingName ? (
              <div className="w-full space-y-2 max-w-xs mt-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-center px-3 py-1.5 bg-slate-100 border border-sky-400 rounded-xl font-bold text-sm text-slate-900 focus:outline-none"
                />
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Group description..."
                  rows={2}
                  className="w-full text-xs p-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 resize-none focus:outline-none"
                />
                <div className="flex justify-center gap-2 pt-1">
                  <button
                    onClick={() => setIsEditingName(false)}
                    className="px-3 py-1 bg-slate-200 text-slate-700 text-xs rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveInfo}
                    className="px-3 py-1 bg-sky-500 text-white text-xs rounded-lg font-semibold"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <h3 className="font-extrabold text-lg text-slate-900">{group.name}</h3>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setEditName(group.name);
                        setEditDesc(group.description || '');
                        setIsEditingName(true);
                      }}
                      className="p-1 text-slate-400 hover:text-sky-600 transition-colors"
                      title="Edit Subject"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  {group.participants.length} participant{group.participants.length === 1 ? '' : 's'}
                </p>
                {group.description && (
                  <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl mt-2 max-w-xs mx-auto">
                    {group.description}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Group Settings Section */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-sky-500" />
              Group Permissions
            </h4>

            <div className="flex items-center justify-between text-xs pt-1">
              <div>
                <p className="font-bold text-slate-800">Send Messages</p>
                <p className="text-[10px] text-slate-500">
                  {group.settings.onlyAdminsCanSend ? 'Only Admins' : 'All Participants'}
                </p>
              </div>
              {isAdmin ? (
                <button
                  onClick={() => handleToggleSetting('onlyAdminsCanSend')}
                  className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                    group.settings.onlyAdminsCanSend ? 'bg-sky-500' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full transition-transform shadow-xs ${
                      group.settings.onlyAdminsCanSend ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              ) : (
                <span className="text-[10px] font-semibold text-slate-400">
                  {group.settings.onlyAdminsCanSend ? 'Admins Only' : 'Everyone'}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/60">
              <div>
                <p className="font-bold text-slate-800">Edit Group Info</p>
                <p className="text-[10px] text-slate-500">
                  {group.settings.onlyAdminsCanEditInfo ? 'Only Admins' : 'All Participants'}
                </p>
              </div>
              {isAdmin ? (
                <button
                  onClick={() => handleToggleSetting('onlyAdminsCanEditInfo')}
                  className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                    group.settings.onlyAdminsCanEditInfo ? 'bg-sky-500' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full transition-transform shadow-xs ${
                      group.settings.onlyAdminsCanEditInfo ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              ) : (
                <span className="text-[10px] font-semibold text-slate-400">
                  {group.settings.onlyAdminsCanEditInfo ? 'Admins Only' : 'Everyone'}
                </span>
              )}
            </div>
          </div>

          {/* Participant List Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-sky-500" />
                Participants ({group.participants.length})
              </h4>
              {isAdmin && (
                <button
                  onClick={() => setIsAddingMember(!isAddingMember)}
                  className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Member</span>
                </button>
              )}
            </div>

            {/* Add Member Picker Drawer */}
            {isAddingMember && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 bg-sky-50/80 border border-sky-200 rounded-2xl space-y-2 overflow-hidden"
              >
                <p className="text-xs font-bold text-slate-800">Select Contact to Add:</p>
                {availableContacts.length === 0 ? (
                  <p className="text-[11px] text-slate-500">No available contacts to add.</p>
                ) : (
                  <div className="max-h-36 overflow-y-auto space-y-1">
                    {availableContacts.map((c) => {
                      const profile = c.profile;
                      const otherId = c.requester_id === currentUser.id ? c.addressee_id : c.requester_id;
                      const name = profile?.display_name || profile?.email?.split('@')[0] || 'User';

                      return (
                        <div
                          key={c.id}
                          className="flex items-center justify-between p-2 bg-white rounded-xl border border-sky-100 text-xs"
                        >
                          <span className="font-semibold text-slate-800">{name}</span>
                          <button
                            onClick={async () => {
                              await onAddParticipant(otherId, name);
                              setIsAddingMember(false);
                            }}
                            className="px-2 py-0.5 bg-sky-500 text-white font-bold text-[10px] rounded-md hover:bg-sky-600 transition-colors"
                          >
                            Add
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* Participants list */}
            <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden bg-white">
              {group.participants.map((pId) => {
                const isGroupCreator = pId === group.creatorId;
                const isGroupAdmin = group.admins.includes(pId);
                const isSelf = pId === currentUser.id;

                // Lookup profile from contacts if available
                const matchingContact = contacts.find(
                  (c) => c.requester_id === pId || c.addressee_id === pId
                );
                const profile = isSelf ? currentUser : matchingContact?.profile;
                const displayName = isSelf
                  ? 'You'
                  : profile?.display_name || profile?.email?.split('@')[0] || `User (${pId.slice(0, 5)})`;

                return (
                  <div
                    key={pId}
                    className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="relative shrink-0">
                        {profile?.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt={displayName}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200">
                            {displayName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {displayName}
                          </span>
                          {isGroupCreator && (
                            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-extrabold rounded-md flex items-center gap-0.5 shrink-0">
                              <Crown className="w-2.5 h-2.5" />
                              Creator
                            </span>
                          )}
                          {!isGroupCreator && isGroupAdmin && (
                            <span className="px-1.5 py-0.2 bg-sky-100 text-sky-800 text-[9px] font-extrabold rounded-md flex items-center gap-0.5 shrink-0">
                              <Shield className="w-2.5 h-2.5" />
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">
                          {isSelf ? currentUser.email : profile?.email || 'Participant'}
                        </p>
                      </div>
                    </div>

                    {/* Admin Actions Dropdown / Buttons for non-self */}
                    {isAdmin && !isSelf && (
                      <div className="flex items-center gap-1 shrink-0">
                        {isGroupAdmin ? (
                          <button
                            onClick={() =>
                              setConfirmModal({
                                type: 'demote',
                                targetUserId: pId,
                                targetUserName: displayName,
                              })
                            }
                            className="p-1 hover:bg-amber-50 text-slate-400 hover:text-amber-600 rounded-lg transition-colors"
                            title="Demote to Member"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => onChangeRole(pId, displayName, 'admin')}
                            className="p-1 hover:bg-sky-50 text-slate-400 hover:text-sky-600 rounded-lg transition-colors"
                            title="Promote to Admin"
                          >
                            <Shield className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() =>
                            setConfirmModal({
                              type: 'remove',
                              targetUserId: pId,
                              targetUserName: displayName,
                            })
                          }
                          className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="Remove from group"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Destructive Actions */}
          <div className="pt-4 border-t border-slate-200">
            <button
              onClick={() => setConfirmModal({ type: 'leave' })}
              className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Exit Group</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-xs w-full shadow-2xl text-center space-y-4 border border-slate-100"
            >
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  {confirmModal.type === 'leave'
                    ? 'Exit Group?'
                    : confirmModal.type === 'remove'
                    ? `Remove ${confirmModal.targetUserName}?`
                    : `Demote ${confirmModal.targetUserName}?`}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {confirmModal.type === 'leave'
                    ? 'You will no longer be able to send or receive messages in this group.'
                    : confirmModal.type === 'remove'
                    ? 'This participant will be removed from the group conversation.'
                    : 'This member will lose administrative privileges.'}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (confirmModal.type === 'leave') {
                      await onLeaveGroup();
                    } else if (confirmModal.type === 'remove' && confirmModal.targetUserId) {
                      await onRemoveParticipant(confirmModal.targetUserId, confirmModal.targetUserName || 'User');
                    } else if (confirmModal.type === 'demote' && confirmModal.targetUserId) {
                      await onChangeRole(confirmModal.targetUserId, confirmModal.targetUserName || 'User', 'member');
                    }
                    setConfirmModal(null);
                  }}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
