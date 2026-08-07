import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CornerUpRight,
  X,
  Search,
  Users,
  Check,
  Send,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Film,
  Music
} from 'lucide-react';
import { Message, ContactRequest, Group } from '../types';

interface ForwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageToForward: Message | null;
  contacts: ContactRequest[];
  groups: Group[];
  currentUserId: string;
  onForward: (selectedTargets: { conversationId?: string; contactId?: string; groupId?: string; name: string }[]) => void;
}

const MAX_FORWARD_LIMIT = 5; // Anti-spam constraint

export const ForwardModal: React.FC<ForwardModalProps> = ({
  isOpen,
  onClose,
  messageToForward,
  contacts,
  groups,
  currentUserId,
  onForward,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTargets, setSelectedTargets] = useState<
    { conversationId?: string; contactId?: string; groupId?: string; name: string }[]
  >([]);
  const [showLimitWarning, setShowLimitWarning] = useState(false);

  if (!isOpen || !messageToForward) return null;

  const getContactName = (contact: ContactRequest) => {
    return (
      contact.profile?.display_name ||
      contact.profile?.username ||
      contact.profile?.email?.split('@')[0] ||
      'Contact'
    );
  };

  const getContactId = (contact: ContactRequest) => {
    return contact.profile?.id || (contact.requester_id === currentUserId ? contact.addressee_id : contact.requester_id);
  };

  // Filtered lists
  const filteredContacts = contacts.filter((c) => {
    if (c.status !== 'accepted') return false;
    const name = getContactName(c).toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  const filteredGroups = groups.filter((g) => {
    if (!g.participants.includes(currentUserId)) return false;
    return g.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const toggleTarget = (target: { conversationId?: string; contactId?: string; groupId?: string; name: string }) => {
    const key = target.groupId || target.contactId || target.conversationId;
    const isAlreadySelected = selectedTargets.some(
      (t) => (t.groupId || t.contactId || t.conversationId) === key
    );

    if (isAlreadySelected) {
      setSelectedTargets(
        selectedTargets.filter(
          (t) => (t.groupId || t.contactId || t.conversationId) !== key
        )
      );
      setShowLimitWarning(false);
    } else {
      if (selectedTargets.length >= MAX_FORWARD_LIMIT) {
        setShowLimitWarning(true);
        setTimeout(() => setShowLimitWarning(false), 3000);
        return;
      }
      setSelectedTargets([...selectedTargets, target]);
    }
  };

  const handleConfirmForward = () => {
    if (selectedTargets.length === 0) return;
    onForward(selectedTargets);
    setSelectedTargets([]);
    setSearchQuery('');
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-sky-500/10 text-sky-600 rounded-xl">
                <CornerUpRight className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base leading-tight">Forward Message</h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Select up to {MAX_FORWARD_LIMIT} contacts or groups
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedTargets([]);
                setSearchQuery('');
                onClose();
              }}
              className="p-1.5 hover:bg-slate-200/80 rounded-full text-slate-500 hover:text-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quoted Message Preview Box */}
          <div className="p-4 bg-slate-100/70 border-b border-slate-200 shrink-0">
            <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
              <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl shrink-0">
                {messageToForward.type === 'image' ? (
                  <ImageIcon className="w-4 h-4" />
                ) : messageToForward.type === 'video' ? (
                  <Film className="w-4 h-4" />
                ) : messageToForward.type === 'voice_note' || messageToForward.type === 'voice' ? (
                  <Music className="w-4 h-4" />
                ) : messageToForward.type === 'document' || messageToForward.type === 'file' ? (
                  <FileText className="w-4 h-4" />
                ) : (
                  <CornerUpRight className="w-4 h-4" />
                )}
              </div>
              <div className="overflow-hidden text-xs flex-1">
                <span className="font-bold text-slate-900 block truncate">
                  {messageToForward.sender_name || 'Original Message'}
                </span>
                <p className="text-slate-600 truncate text-[11px] mt-0.5">
                  {messageToForward.content ||
                    (messageToForward.file_name ? `Attachment: ${messageToForward.file_name}` : 'Media Content')}
                </p>
              </div>
            </div>
          </div>

          {/* Anti-spam Limit Warning Pill */}
          {showLimitWarning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 py-2 bg-amber-500 text-white text-xs font-bold flex items-center justify-center gap-2 shrink-0 shadow-inner"
            >
              <AlertCircle className="w-4 h-4" />
              <span>For anti-spam policy, you can select a max of {MAX_FORWARD_LIMIT} chats at once.</span>
            </motion.div>
          )}

          {/* Search Input */}
          <div className="p-3 px-4 border-b border-slate-200 bg-white shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contacts or groups to forward..."
                className="w-full pl-9 pr-4 py-2 bg-slate-100/80 border border-slate-200/80 focus:bg-white focus:border-sky-500 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
          </div>

          {/* Recipient List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {/* Groups Section */}
            {filteredGroups.length > 0 && (
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider px-2 block mb-1.5">
                  Groups
                </span>
                <div className="space-y-1">
                  {filteredGroups.map((group) => {
                    const isSelected = selectedTargets.some((t) => t.groupId === group.id);
                    return (
                      <div
                        key={group.id}
                        onClick={() =>
                          toggleTarget({
                            groupId: group.id,
                            name: group.name,
                          })
                        }
                        className={`p-2.5 rounded-2xl flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? 'bg-sky-50 border border-sky-300' : 'hover:bg-slate-100/80'
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <img
                            src={group.avatarUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150'}
                            alt="Group"
                            className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                          />
                          <div className="overflow-hidden">
                            <p className="font-bold text-xs text-slate-900 truncate">{group.name}</p>
                            <p className="text-[10px] text-slate-500 truncate">
                              {group.participants.length} members
                            </p>
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                            isSelected ? 'bg-sky-500 border-sky-500 text-white' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Contacts Section */}
            {filteredContacts.length > 0 && (
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider px-2 block mb-1.5">
                  Direct Contacts
                </span>
                <div className="space-y-1">
                  {filteredContacts.map((contact) => {
                    const contactId = getContactId(contact);
                    const name = getContactName(contact);
                    const isSelected = selectedTargets.some((t) => t.contactId === contactId);

                    return (
                      <div
                        key={contact.id}
                        onClick={() =>
                          toggleTarget({
                            contactId,
                            name,
                          })
                        }
                        className={`p-2.5 rounded-2xl flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? 'bg-sky-50 border border-sky-300' : 'hover:bg-slate-100/80'
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          {contact.profile?.avatar_url ? (
                            <img
                              src={contact.profile.avatar_url}
                              alt="Avatar"
                              className="w-9 h-9 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-sky-500/10 text-sky-600 font-bold text-xs flex items-center justify-center shrink-0 border border-sky-500/20">
                              {name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="overflow-hidden">
                            <p className="font-bold text-xs text-slate-900 truncate">{name}</p>
                            <p className="text-[10px] text-slate-500 truncate font-mono">
                              @{contact.profile?.username || name.toLowerCase().replace(/\s+/g, '')}
                            </p>
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                            isSelected ? 'bg-sky-500 border-sky-500 text-white' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {filteredContacts.length === 0 && filteredGroups.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs">
                No matching contacts or groups found.
              </div>
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
            <span className="text-xs font-semibold text-slate-600">
              Selected: <strong className="text-sky-600 font-extrabold">{selectedTargets.length}</strong> / {MAX_FORWARD_LIMIT}
            </span>

            <button
              onClick={handleConfirmForward}
              disabled={selectedTargets.length === 0}
              className="px-5 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white text-xs font-bold rounded-2xl shadow-md transition-all flex items-center gap-2 active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>Forward ({selectedTargets.length})</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
