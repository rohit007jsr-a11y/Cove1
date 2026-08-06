import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare,
  Send,
  ArrowLeft,
  Clock,
  LogOut,
  Key,
  Search,
  Users,
  ShieldCheck,
  Inbox,
  RefreshCw,
  X,
  Check,
  CheckCheck,
  User,
  AtSign
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile, ContactRequest, Message, Profile } from '../types';
import { CoveLogo } from './CoveLogo';
import { ContactsView } from './ContactsView';
import { ProfileView } from './ProfileView';

interface MessagesViewProps {
  user: UserProfile;
  onSignOut: () => void;
  showToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const MessagesView: React.FC<MessagesViewProps> = ({
  user,
  onSignOut,
  showToast,
}) => {
  const [contacts, setContacts] = useState<ContactRequest[]>([]);
  const [selectedContact, setSelectedContact] = useState<ContactRequest | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarView, setSidebarView] = useState<'chats' | 'contacts' | 'profile' | 'session'>('chats');
  const [rightPaneView, setRightPaneView] = useState<'chat' | 'profile'>('chat');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper to find or create a conversation between two users using database function or client fallback
  const getOrCreateConversationId = async (
    myUserId: string,
    otherUserId: string,
    otherProfile?: Profile
  ): Promise<string | null> => {
    try {
      if (!myUserId || !otherUserId) return null;

      const generateUUID = (): string => {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
          return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
        });
      };

      // Ensure both user profiles exist in Supabase 'profiles' table first to prevent foreign key issues
      try {
        const profilesToUpsert = [
          {
            id: myUserId,
            email: user.email,
            display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Cove Member',
          }
        ];
        if (otherProfile && otherProfile.id) {
          profilesToUpsert.push({
            id: otherProfile.id,
            email: otherProfile.email || 'user@cove.app',
            display_name: otherProfile.display_name || otherProfile.email?.split('@')[0] || 'Cove Member',
          });
        } else if (otherUserId) {
          profilesToUpsert.push({
            id: otherUserId,
            email: 'user@cove.app',
            display_name: 'Cove Member',
          });
        }
        await supabase.from('profiles').upsert(profilesToUpsert, { onConflict: 'id' });
      } catch (pErr) {
        console.log('Notice upserting profiles:', pErr);
      }

      // 1. Primary: Try database RPC function create_conversation if available
      try {
        const { data, error } = await supabase.rpc('create_conversation', {
          other_user_id: otherUserId,
        });

        if (!error && data) {
          const rpcId = typeof data === 'string' ? data : (data as any)?.id ? String((data as any).id) : String(data);
          if (rpcId && rpcId !== 'null' && !rpcId.startsWith('conv-')) return rpcId;
        } else if (error) {
          console.warn('create_conversation RPC notice:', error.message);
        }
      } catch (rpcErr) {
        console.warn('create_conversation RPC exception:', rpcErr);
      }

      // 2. Secondary: direct participant search in conversation_participants table
      try {
        const { data: myPart } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', myUserId);

        if (myPart && myPart.length > 0) {
          const myConvIds = myPart.map((p: any) => p.conversation_id);
          const { data: shared } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .in('conversation_id', myConvIds)
            .eq('user_id', otherUserId)
            .limit(1);

          if (shared && shared.length > 0 && shared[0].conversation_id) {
            return shared[0].conversation_id;
          }
        }
      } catch (pErr) {
        console.log('Notice checking participants:', pErr);
      }

      // 3. Fallback: Create a new conversation row directly in Supabase DB with a valid UUID
      try {
        const newConvId = generateUUID();
        let finalConvId = newConvId;

        const { error: convErr } = await supabase
          .from('conversations')
          .insert([{ id: newConvId }]);

        if (convErr) {
          console.warn('Notice inserting specified conv ID, trying auto insert:', convErr.message);
          const { data: autoConv, error: autoErr } = await supabase
            .from('conversations')
            .insert({})
            .select('id')
            .single();

          if (!autoErr && autoConv?.id) {
            finalConvId = autoConv.id;
          }
        }

        // Add both participants to conversation_participants table
        const { error: partUpsertErr } = await supabase.from('conversation_participants').upsert([
          { conversation_id: finalConvId, user_id: myUserId },
          { conversation_id: finalConvId, user_id: otherUserId },
        ], { onConflict: 'conversation_id,user_id' });

        if (partUpsertErr) {
          await supabase.from('conversation_participants').insert([
            { conversation_id: finalConvId, user_id: myUserId },
            { conversation_id: finalConvId, user_id: otherUserId },
          ]);
        }

        return finalConvId;
      } catch (createErr) {
        console.error('Error creating new conversation in database:', createErr);
        return generateUUID();
      }
    } catch (err) {
      console.error('Error in getOrCreateConversationId:', err);
      return null;
    }
  };

  // Fetch accepted contacts
  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (!error && data && Array.isArray(data)) {
        const otherUserIds = Array.from(
          new Set(
            data.map((item: any) =>
              item.requester_id === user.id ? item.addressee_id : item.requester_id
            )
          )
        ).filter(Boolean);

        let profilesMap = new Map<string, Profile>();
        if (otherUserIds.length > 0) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, email, display_name, avatar_url, created_at')
            .in('id', otherUserIds);

          if (profs && Array.isArray(profs)) {
            profs.forEach((p: any) => {
              profilesMap.set(p.id, {
                id: p.id,
                email: p.email,
                display_name: p.display_name,
                avatar_url: p.avatar_url,
                created_at: p.created_at,
              });
            });
          }
        }

        const mapped: ContactRequest[] = data.map((item: any) => {
          const otherId = item.requester_id === user.id ? item.addressee_id : item.requester_id;
          const profile = profilesMap.get(otherId) || {
            id: otherId,
            email: 'user@cove.app',
            display_name: 'Cove Member',
          };

          return {
            id: item.id,
            requester_id: item.requester_id,
            addressee_id: item.addressee_id,
            status: item.status,
            created_at: item.created_at,
            profile,
          };
        });

        setContacts(mapped);
      } else {
        const localStore = localStorage.getItem('cove_contact_requests_global');
        if (localStore) {
          const parsed = JSON.parse(localStore);
          const accepted = parsed.filter(
            (r: any) =>
              r.status === 'accepted' &&
              (r.requester_id === user.id || r.addressee_id === user.id || r.recipient_id === user.id)
          );
          setContacts(accepted);
        }
      }
    } catch (err) {
      console.error('Error fetching contacts:', err);
    }
  };

  useEffect(() => {
    fetchContacts();
    const interval = setInterval(fetchContacts, 8000);
    return () => clearInterval(interval);
  }, [user.id]);

  // Fetch messages when a contact is selected
  useEffect(() => {
    if (!selectedContact) {
      setActiveConversationId(null);
      setMessages([]);
      return;
    }

    const otherUserId =
      selectedContact.requester_id === user.id
        ? (selectedContact.addressee_id || selectedContact.profile?.id)
        : (selectedContact.requester_id || selectedContact.profile?.id);

    let isMounted = true;

    const loadConversationAndMessages = async () => {
      setLoading(true);
      const convId = await getOrCreateConversationId(user.id, otherUserId, selectedContact.profile);

      if (!isMounted) return;
      setActiveConversationId(convId);

      if (convId) {
        try {
          const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: true });

          const localKey = `cove_local_msgs_${convId}`;
          const localMsgs: Message[] = JSON.parse(localStorage.getItem(localKey) || '[]');

          let combined: Message[] = [];
          if (!error && data && Array.isArray(data)) {
            combined = [...data];
          }

          localMsgs.forEach((lm) => {
            if (!combined.some((m) => m.id === lm.id || (m.content === lm.content && m.created_at === lm.created_at))) {
              combined.push(lm);
            }
          });

          combined.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

          if (isMounted) {
            setMessages(combined);
          }
        } catch (err) {
          console.error('Error fetching messages:', err);
          const localKey = `cove_local_msgs_${convId}`;
          const localMsgs: Message[] = JSON.parse(localStorage.getItem(localKey) || '[]');
          if (isMounted) setMessages(localMsgs);
        }
      }
      if (isMounted) setLoading(false);
    };

    loadConversationAndMessages();

    return () => {
      isMounted = false;
    };
  }, [selectedContact, user.id]);

  // Set up Realtime subscription whenever activeConversationId changes
  useEffect(() => {
    if (!activeConversationId) return;

    const channel = supabase
      .channel(`conv_channel_${activeConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedContact) return;

    const generateUUID = (): string => {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });
    };

    const otherUserId =
      selectedContact.requester_id === user.id
        ? (selectedContact.addressee_id || selectedContact.profile?.id)
        : (selectedContact.requester_id || selectedContact.profile?.id);

    let convId = activeConversationId;
    if (!convId) {
      convId = await getOrCreateConversationId(user.id, otherUserId, selectedContact.profile);
      if (convId) setActiveConversationId(convId);
    }

    if (!convId) {
      showToast('error', 'Error', 'Could not start conversation session.');
      return;
    }

    const messageText = newMessage.trim();
    const messageId = generateUUID();
    const tempId = `temp-${Date.now()}`;

    const tempMessage: Message = {
      id: messageId,
      conversation_id: convId,
      sender_id: user.id,
      content: messageText,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMessage]);
    setNewMessage('');

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            id: messageId,
            conversation_id: convId,
            sender_id: user.id,
            content: messageText,
          },
        ])
        .select()
        .single();

      if (!error && data) {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === messageId || msg.id === tempId ? data : msg))
        );
      } else {
        if (error) {
          console.warn('Supabase message insert error:', error.message);
          showToast('error', 'Database Error', `Message not saved to Supabase: ${error.message}`);
        }
        // Save fallback to localStorage so message persists in conversation
        const localKey = `cove_local_msgs_${convId}`;
        const existing: Message[] = JSON.parse(localStorage.getItem(localKey) || '[]');
        if (!existing.some((m) => m.id === tempMessage.id)) {
          existing.push(tempMessage);
          localStorage.setItem(localKey, JSON.stringify(existing));
        }
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      showToast('error', 'Send Error', err.message || 'Failed to send message.');
      const localKey = `cove_local_msgs_${convId}`;
      const existing: Message[] = JSON.parse(localStorage.getItem(localKey) || '[]');
      if (!existing.some((m) => m.id === tempMessage.id)) {
        existing.push(tempMessage);
        localStorage.setItem(localKey, JSON.stringify(existing));
      }
    }
  };

  const getContactName = (contact: ContactRequest) => {
    const p = contact.profile;
    return p?.display_name || p?.email?.split('@')[0] || 'Cove Member';
  };

  const getContactEmail = (contact: ContactRequest) => {
    return contact.profile?.email || 'user@cove.app';
  };

  const getContactInitials = (contact: ContactRequest) => {
    const name = getContactName(contact) || 'U';
    return name.slice(0, 2).toUpperCase();
  };

  const filteredContacts = contacts.filter((contact) => {
    const name = getContactName(contact).toLowerCase();
    const email = getContactEmail(contact).toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  return (
    <div className="w-full h-screen min-h-[100dvh] bg-white flex overflow-hidden select-none font-sans">
      {/* 1. Left Sidebar Panel */}
      <div
        className={`${
          selectedContact ? 'hidden md:flex' : 'flex'
        } flex-col w-full md:w-[340px] lg:w-[380px] border-r border-slate-200 bg-slate-50/70 shrink-0 h-full overflow-hidden`}
      >
        <AnimatePresence mode="wait">
          {sidebarView === 'chats' && (
            <motion.div
              key="chats"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex flex-col h-full"
            >
              {/* Sidebar Top Header */}
              <div className="px-4 py-3.5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-2xs">
                {/* Logo & User info */}
                <div
                  onClick={() => setSidebarView('profile')}
                  className="flex items-center gap-3 overflow-hidden cursor-pointer group p-1 -ml-1 rounded-xl hover:bg-slate-100/80 transition-colors"
                  title="View Profile Details"
                >
                  <div className="relative shrink-0">
                    {user.user_metadata?.avatar_url ? (
                      <img
                        src={user.user_metadata.avatar_url}
                        alt="Avatar"
                        className="w-9 h-9 rounded-full object-cover shadow-xs border border-sky-500/30"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-sky-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                        {(user.user_metadata?.full_name || user.email || 'U').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" title="Verified Session" />
                  </div>
                  <div className="overflow-hidden">
                    <h2 className="font-bold text-sm text-slate-900 group-hover:text-sky-600 truncate leading-tight transition-colors">
                      {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Cove Member'}
                    </h2>
                    <span className="text-[10px] text-slate-500 font-medium truncate flex items-center gap-1">
                      <span className="text-sky-600 font-mono">
                        @{user.user_metadata?.username || user.email?.split('@')[0] || 'user'}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Header Action Tools */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setSidebarView('profile')}
                    className={`p-2 rounded-full transition-colors ${
                      sidebarView === 'profile' ? 'bg-sky-100 text-sky-600 font-bold' : 'hover:bg-slate-100 text-slate-600 hover:text-sky-600'
                    }`}
                    title="My WhatsApp-Style Profile"
                  >
                    <User className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSidebarView('contacts')}
                    className={`p-2 rounded-full transition-colors ${
                      sidebarView === 'contacts' ? 'bg-sky-100 text-sky-600 font-bold' : 'hover:bg-slate-100 text-slate-600 hover:text-sky-600'
                    }`}
                    title="Find Contacts & Directory"
                  >
                    <Users className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSidebarView('session')}
                    className={`p-2 rounded-full transition-colors ${
                      sidebarView === 'session' ? 'bg-sky-100 text-sky-600 font-bold' : 'hover:bg-slate-100 text-slate-600 hover:text-sky-600'
                    }`}
                    title="Session Inspector"
                  >
                    <Key className="w-4 h-4" />
                  </button>
                  <button
                    onClick={onSignOut}
                    className="p-2 hover:bg-rose-50 rounded-full text-slate-500 hover:text-rose-600 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Chat Search Bar */}
              <div className="p-3 bg-white border-b border-slate-200 shrink-0">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search messages or contacts..."
                    className="w-full pl-9 pr-8 py-2 bg-slate-100/80 border border-transparent hover:bg-slate-100 focus:bg-white border-slate-200/60 focus:border-sky-500 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-sans"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Active Conversations List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-slate-50/50">
                {filteredContacts.length === 0 ? (
                  <div className="p-8 text-center space-y-3 my-auto">
                    <div className="w-12 h-12 rounded-full bg-sky-50 border border-sky-100 text-sky-500 flex items-center justify-center mx-auto">
                      <Inbox className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">No active chats</p>
                      <p className="text-[11px] text-slate-500 mt-1 max-w-[220px] mx-auto leading-relaxed">
                        Connect with friends using their email address from the Cove Directory.
                      </p>
                    </div>
                    <button
                      onClick={() => setSidebarView('contacts')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Find & Add Contacts</span>
                    </button>
                  </div>
                ) : (
                  filteredContacts.map((contact) => {
                    const isSelected = selectedContact?.id === contact.id;
                    return (
                      <button
                        key={contact.id}
                        onClick={() => {
                          setSelectedContact(contact);
                          setSidebarView('chats');
                        }}
                        className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 border ${
                          isSelected
                            ? 'bg-white border-sky-500/30 shadow-xs text-slate-900'
                            : 'hover:bg-white/80 border-transparent text-slate-700'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-sky-500/10 text-sky-600 font-bold text-sm flex items-center justify-center shrink-0 border border-sky-500/20">
                          {getContactInitials(contact)}
                        </div>
                        <div className="overflow-hidden flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-xs truncate text-slate-900">
                              {getContactName(contact)}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium shrink-0">
                              Active
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {getContactEmail(contact)}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}

          {sidebarView === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex flex-col h-full bg-white"
            >
              <ProfileView
                user={user}
                onBack={() => setSidebarView('chats')}
                onOpenContactsDirectory={() => setSidebarView('contacts')}
                onUpdateProfile={(updatedMeta) => {
                  user.user_metadata = {
                    ...(user.user_metadata || {}),
                    ...updatedMeta,
                  };
                }}
                showToast={showToast}
              />
            </motion.div>
          )}

          {sidebarView === 'contacts' && (
            <motion.div
              key="contacts"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex flex-col h-full bg-white"
            >
              <ContactsView
                user={user}
                showToast={showToast}
                onBack={() => setSidebarView('chats')}
                onSelectContact={(c) => {
                  setSelectedContact(c);
                  setSidebarView('chats');
                }}
              />
            </motion.div>
          )}

          {sidebarView === 'session' && (
            <motion.div
              key="session"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex flex-col h-full bg-white"
            >
              {/* Header */}
              <div className="px-4 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setSidebarView('chats')}
                  className="p-1.5 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1">
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Key className="w-4 h-4 text-sky-500" strokeWidth={2.5} />
                    Session Details
                  </h2>
                </div>
              </div>

              {/* Session details */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs font-sans">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <h3 className="font-semibold text-[10px] text-slate-400 uppercase tracking-wider">
                    User ID
                  </h3>
                  <p className="font-mono text-slate-800 break-all select-all font-semibold text-[11px]">
                    {user.id}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <h3 className="font-semibold text-[10px] text-slate-400 uppercase tracking-wider">
                    Verified Email
                  </h3>
                  <p className="font-mono text-slate-800 break-all select-all font-semibold text-[11px]">
                    {user.email}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <h3 className="font-semibold text-[10px] text-slate-400 uppercase tracking-wider">
                    Auth Security
                  </h3>
                  <p className="text-slate-800 font-semibold flex items-center gap-1.5 text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
                    Supabase OAuth / JWT
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <h3 className="font-semibold text-[10px] text-slate-400 uppercase tracking-wider">
                    Last Session Sync
                  </h3>
                  <p className="text-slate-700 font-mono text-[11px]">
                    {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Just now'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. Right Chat Thread Panel */}
      <div
        className={`${
          !selectedContact ? 'hidden md:flex' : 'flex'
        } flex-col flex-1 bg-white h-full overflow-hidden`}
      >
        {selectedContact ? (
          rightPaneView === 'profile' ? (
            <ProfileView
              user={user}
              otherProfile={selectedContact.profile}
              contactStatus={selectedContact.status}
              onBack={() => setRightPaneView('chat')}
              onOpenChat={() => setRightPaneView('chat')}
              showToast={showToast}
            />
          ) : (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Active Contact Top Header */}
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0 shadow-2xs">
              <div
                onClick={() => setRightPaneView('profile')}
                className="flex items-center gap-3 overflow-hidden cursor-pointer group p-1 -ml-1 rounded-xl hover:bg-slate-200/60 transition-colors"
                title="View Contact Profile Details"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedContact(null);
                  }}
                  className="md:hidden p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-full transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-9 h-9 rounded-full bg-sky-500/10 text-sky-600 font-bold text-xs flex items-center justify-center shrink-0 border border-sky-500/20 group-hover:scale-105 transition-transform">
                  {getContactInitials(selectedContact)}
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-sky-600 truncate leading-tight transition-colors">
                    {getContactName(selectedContact)}
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5 font-mono">
                    @{selectedContact.profile?.username || getContactEmail(selectedContact).split('@')[0]}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRightPaneView('profile')}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1.5 transition-colors"
                  title="View Profile Details"
                >
                  <User className="w-3.5 h-3.5 text-sky-500" />
                  <span>Profile Info</span>
                </button>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[10px] font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active Chat
                </span>
              </div>
            </div>

            {/* Message Feed Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 bg-slate-50/30 flex flex-col">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-sky-500" />
                  <span>Loading messages...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2 my-auto">
                  <div className="w-12 h-12 rounded-full bg-sky-50 text-sky-500 flex items-center justify-center border border-sky-100">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">No messages yet</p>
                  <p className="text-[11px] text-slate-500 max-w-[200px] text-center">
                    Send a message below to start chatting with {getContactName(selectedContact)}.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 flex-1">
                  {messages.map((msg) => {
                    const isMe = msg.sender_id === user.id;
                    const isPending = msg.id?.startsWith('temp');
                    return (
                      <div
                        key={msg.id}
                        className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] sm:max-w-[65%] px-4 py-2.5 rounded-2xl text-sm shadow-2xs ${
                            isMe
                              ? 'bg-sky-500 text-white rounded-tr-xs'
                              : 'bg-white text-slate-900 rounded-tl-xs border border-slate-200/80'
                          }`}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed break-words">{msg.content}</p>
                          <div
                            className={`text-[9px] mt-1 flex items-center justify-end gap-1 font-medium ${
                              isMe ? 'text-sky-100' : 'text-slate-400'
                            }`}
                          >
                            <span>
                              {new Date(msg.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {isMe && (
                              <span
                                key={isPending ? 'pending' : 'sent'}
                                className="flex items-center ml-0.5 shrink-0 animate-tick-pop transition-all duration-300"
                                title={isPending ? 'Sending...' : 'Sent & Delivered'}
                              >
                                {isPending ? (
                                  <Clock className="w-2.5 h-2.5 text-sky-200 animate-pulse" />
                                ) : (
                                  <CheckCheck className="w-3.5 h-3.5 text-sky-100 stroke-[2.5]" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Bottom Message Input Form */}
            <div className="p-3 border-t border-slate-200 bg-white shrink-0">
              <form onSubmit={handleSendMessage} className="flex items-end gap-2 max-w-4xl mx-auto">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Write a message..."
                  rows={1}
                  className="flex-1 p-3 bg-slate-100/80 border border-slate-200/60 focus:bg-white focus:border-sky-500 rounded-xl text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-none max-h-28 font-sans leading-relaxed transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-3 bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white rounded-xl transition-all shadow-xs flex items-center justify-center shrink-0 active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
          )
        ) : (
          /* Empty State Welcome Screen */
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4 p-8 text-center select-none bg-slate-50/30">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-xs border border-slate-200/80 flex items-center justify-center">
              <CoveLogo size="lg" showText={false} />
            </div>
            <div className="max-w-sm space-y-1">
              <h2 className="text-lg font-bold text-slate-900">Welcome to Cove</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Select a conversation from the left sidebar or open the Directory to connect with people.
              </p>
            </div>
            <button
              onClick={() => setSidebarView('contacts')}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs transition-colors"
            >
              <Users className="w-4 h-4 text-sky-500" />
              <span>Explore Directory</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
