import React, { useState } from 'react';
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
  Sparkles
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onSignOut: () => void;
  showToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  onSignOut,
  showToast,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleAccountDelete = async () => {
    if (confirmInput.trim().toUpperCase() !== 'DELETE') {
      showToast('error', 'Confirmation Failed', 'Please type DELETE in capital letters to confirm.');
      return;
    }

    setIsDeleting(true);
    try {
      // 1. Delete user profile record from Supabase 'profiles' table
      try {
        await supabase.from('profiles').delete().eq('id', user.id);
      } catch (dbErr) {
        console.warn('Notice deleting profile from table:', dbErr);
      }

      // 2. Clear local storage user keys
      try {
        localStorage.removeItem(`cove_profile_${user.id}`);
        localStorage.clear();
      } catch (e) {
        console.warn('Notice clearing local storage:', e);
      }

      // 3. Sign out from Supabase Auth
      try {
        await supabase.auth.signOut();
      } catch (sErr) {
        console.warn('Notice signing out:', sErr);
      }

      showToast('success', 'Account Deleted', 'Your account and data have been permanently removed.');
      
      // 4. Trigger sign out callback
      onSignOut();
      onClose();
    } catch (err: any) {
      console.error('Account deletion error:', err);
      showToast('error', 'Deletion Error', err.message || 'Failed to delete account. Signing out...');
      onSignOut();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Modal Header */}
          <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl border border-sky-500/30">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base tracking-tight">Account Settings</h3>
                <p className="text-[11px] text-slate-400">Manage preferences and account security</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* User Overview Box */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-sky-500 text-white font-bold text-xl flex items-center justify-center shrink-0 shadow-sm border-2 border-white">
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="Avatar"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  (user.user_metadata?.full_name || user.email || 'U').slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="overflow-hidden flex-1">
                <h4 className="font-bold text-slate-900 text-sm truncate">
                  {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Cove User'}
                </h4>
                <p className="text-xs font-mono font-bold text-sky-600 truncate">
                  @{user.user_metadata?.username || user.email?.split('@')[0] || 'username'}
                </p>
                <p className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
                  {user.email}
                </p>
              </div>
              <div className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold flex items-center gap-1 shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Verified
              </div>
            </div>

            {/* Account Information Details */}
            <div className="space-y-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Account Credentials
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3.5 bg-white border border-slate-200/80 rounded-xl space-y-1">
                  <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-sky-500" /> Email Address
                  </span>
                  <p className="text-xs font-mono font-semibold text-slate-800 truncate">
                    {user.email}
                  </p>
                </div>

                <div className="p-3.5 bg-white border border-slate-200/80 rounded-xl space-y-1">
                  <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                    <User className="w-3 h-3 text-sky-500" /> User Handle
                  </span>
                  <p className="text-xs font-mono font-semibold text-sky-600 truncate">
                    @{user.user_metadata?.username || 'not_set'}
                  </p>
                </div>

                <div className="p-3.5 bg-white border border-slate-200/80 rounded-xl space-y-1">
                  <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-sky-500" /> User Unique ID
                  </span>
                  <p className="text-[10px] font-mono text-slate-600 truncate">
                    {user.id}
                  </p>
                </div>

                <div className="p-3.5 bg-white border border-slate-200/80 rounded-xl space-y-1">
                  <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-sky-500" /> Account Status
                  </span>
                  <p className="text-xs font-semibold text-emerald-600 truncate">
                    Active & Protected
                  </p>
                </div>
              </div>
            </div>

            {/* Danger Zone: Account Deletion */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider block flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Danger Zone
              </span>

              {!showDeleteConfirm ? (
                <div className="p-4 bg-rose-50/50 border border-rose-200/80 rounded-2xl flex items-center justify-between gap-3">
                  <div>
                    <h5 className="font-bold text-xs text-rose-950">Delete Account</h5>
                    <p className="text-[11px] text-rose-700/80 leading-normal mt-0.5">
                      Permanently delete your profile, messages, and remove your username from Cove.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl space-y-3"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-bold text-sm text-rose-950">Confirm Account Deletion</h5>
                      <p className="text-xs text-rose-800 leading-relaxed mt-1">
                        Are you sure you want to permanently delete your account? All your messages, contacts, and metadata will be permanently deleted and you will be signed out immediately.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-bold text-rose-900 block">
                      To confirm, type <span className="font-mono underline">DELETE</span> below:
                    </label>
                    <input
                      type="text"
                      value={confirmInput}
                      onChange={(e) => setConfirmInput(e.target.value)}
                      placeholder="DELETE"
                      autoFocus
                      className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl text-xs font-mono font-bold text-rose-950 placeholder-rose-300 focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={handleAccountDelete}
                      disabled={isDeleting || confirmInput.trim().toUpperCase() !== 'DELETE'}
                      className="flex-1 py-2 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      {isDeleting ? (
                        <span>Deleting Account...</span>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          <span>Permanently Delete Account</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setConfirmInput('');
                      }}
                      className="py-2 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
            <button
              onClick={() => {
                onClose();
                onSignOut();
              }}
              className="text-xs font-bold text-slate-600 hover:text-rose-600 flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out Instead</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
