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
  RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile, ContactRequest, Message, Profile } from '../types';
import { CoveLogo } from './CoveLogo';
import { ContactsView } from './ContactsView';

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
  const [sidebarView, setSidebarView] = useState<'chats' | 'contacts' | 'session'>('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper to find or create a conversation between two users using database function
  const getOrCreateConversationId = async (
    myUserId: string,
    otherUserId: string,
    otherProfile?: Profile
  ): Promise<string | null> => {
    try {
      if (!myUserId || !otherUserId) return null;

      // Ensure both user profiles exist in Supabase 'profiles' table first
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

      // 1. Primary: Call database RPC function create_conversation
      try {
        const { data, error } = await supabase.rpc('create_conversation', {
          other_user_id: otherUserId,
        });

        if (!error && data) {
          if (typeof data === 'string') return data;
          if (typeof data === 'object' && 'id' in data) return (data as any).id;
          return String(data);
        } else if (error) {
          console.warn('create_conversation RPC notice:', error.message);
        }
      } catch (rpcErr) {
        console.warn('create_conversation RPC exception:', rpcErr);
      }

      // 2. Secondary fallback: direct participant search
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

          if (shared && shared.length > 0) {
            return shared[0].conversation_id;
          }
        }
      } catch (pErr) {
        console.log('Notice checking participants:', pErr);
      }

      // 3. Fallback: generate stable conversation ID string
      return `conv-${[myUserId, otherUserId].sort().join('-')}`;
    } catch (err) {
      console.error('Error in getOrCreateConversationId:', err);
      return `conv-${[myUserId, otherUserId].sort().join('-')}`;
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

    const otherUserId =
      selectedContact.requester_id === user.id
        ? (selectedContact.addressee_id || selectedContact.profile?.id)
        : (selectedContact.requester_id || selectedContact.profile?.id);

    let convId = activeConversationId;
    if (!convId) {
      convId = await getOrCreateConversationId(user.id, otherUserId, selectedContact.profile);
      setActiveConversationId(convId);
    }

    if (!convId) {
      showToast('error', 'Error', 'Could not start conversation session.');
      return;
    }

    const messageText = newMessage.trim();
    const tempId = `temp-${Date.now()}`;
    const tempMessage: Message = {
      id: tempId,
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
            conversation_id: convId,
            sender_id: user.id,
            content: messageText,
          },
        ])
        .select()
        .single();

      if (!error && data) {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === tempId ? data : msg))
        );
      } else {
        if (error) console.warn('Supabase message insert notice:', error.message);
        // Save fallback to localStorage so message persists in conversation
        const localKey = `cove_local_msgs_${convId}`;
        const existing: Message[] = JSON.parse(localStorage.getItem(localKey) || '[]');
        const fallbackMsg: Message = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          conversation_id: convId,
          sender_id: user.id,
          content: messageText,
          created_at: tempMessage.created_at,
        };
        existing.push(fallbackMsg);
        localStorage.setItem(localKey, JSON.stringify(existing));

        setMessages((prev) =>
          prev.map((msg) => (msg.id === tempId ? fallbackMsg : msg))
        );
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      const localKey = `cove_local_msgs_${convId}`;
      const existing: Message[] = JSON.parse(localStorage.getItem(localKey) || '[]');
      const fallbackMsg: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        conversation_id: convId,
        sender_id: user.id,
        content: messageText,
        created_at: tempMessage.created_at,
      };
      existing.push(fallbackMsg);
      localStorage.setItem(localKey, JSON.stringify(existing));

      setMessages((prev) =>
        prev.map((msg) => (msg.id === tempId ? fallbackMsg : msg))
      );
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
    <div className="w-full max-w-6xl mx-auto h-[calc(100vh-100px)] sm:h-[calc(100vh-140px)] min-h-[500px] bg-white rounded-xl border border-[#E2E8F0] shadow-md flex overflow-hidden">
      {/* 1. Left Sidebar Panel */}
      <div
        className={`${
          selectedContact ? 'hidden md:flex' : 'flex'
        } flex-col w-full md:w-[380px] border-r border-[#E2E8F0] bg-[#F7FAFC] shrink-0 h-full overflow-hidden`}
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
              {/* Sidebar Header */}
              <div className="p-4 border-b border-[#E2E8F0] bg-white flex items-center justify-between shrink-0">
                {/* User Info & Avatar */}
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-[#0EA5E9] text-white font-bold text-sm flex items-center justify-center shrink-0">
                      {(user.user_metadata?.full_name || user.email || 'U').slice(0, 2).toUpperCase()}
                    </div>
                    {/* Verified online badge */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#22C55E] rounded-full border-2 border-white" title="Verified Online" />
                  </div>
                  <div className="overflow-hidden">
                    <h2 className="font-bold text-sm text-[#0F172A] truncate leading-tight">
                      {user.user_metadata?.full_name || 'Cove Member'}
                    </h2>
                    <span className="text-[10px] text-[#64748B] flex items-center gap-1 font-semibold truncate uppercase tracking-wider">
                      Verified Account
                    </span>
                  </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setSidebarView('contacts')}
                    className="p-2 hover:bg-slate-100 rounded-full text-[#64748B] hover:text-[#0EA5E9] transition-colors"
                    title="Find Contacts & Directory"
                  >
                    <Users className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setSidebarView('session')}
                    className="p-2 hover:bg-slate-100 rounded-full text-[#64748B] hover:text-[#0EA5E9] transition-colors"
                    title="Session Inspector"
                  >
                    <Key className="w-5 h-5" />
                  </button>
                  <button
                    onClick={onSignOut}
                    className="p-2 hover:bg-red-50 rounded-full text-[#64748B] hover:text-red-500 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Chat Search Bar */}
              <div className="p-3 bg-white border-b border-[#E2E8F0] shrink-0">
                <div className="relative">
                  <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search or start a new chat..."
                    className="w-full pl-9 pr-4 py-1.5 bg-[#F7FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9] transition-all"
                  />
                </div>
              </div>

              {/* Active Conversations List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-white">
                {filteredContacts.length === 0 ? (
                  <div className="p-6 text-center space-y-2">
                    <Inbox className="w-8 h-8 text-[#64748B] mx-auto opacity-40" />
                    <p className="text-xs font-bold text-[#0F172A]">No active conversations</p>
                    <p className="text-[11px] text-[#64748B] max-w-[200px] mx-auto">
                      Click the search icon in the header to find users and start a chat!
                    </p>
                    <button
                      onClick={() => setSidebarView('contacts')}
                      className="mt-2 text-xs text-[#0EA5E9] font-bold hover:underline"
                    >
                      Open Directory
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
                        className={`w-full text-left p-3 rounded-lg transition-all flex items-center gap-3 border ${
                          isSelected
                            ? 'bg-[#F7FAFC] border-[#0EA5E9]'
                            : 'hover:bg-slate-50 border-transparent'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-[#0EA5E9]/10 text-[#0EA5E9] font-bold text-sm flex items-center justify-center shrink-0">
                          {getContactInitials(contact)}
                        </div>
                        <div className="overflow-hidden flex-1">
                          <div className="font-bold text-[#0F172A] text-xs truncate">
                            {getContactName(contact)}
                          </div>
                          <p className="text-[10px] text-[#64748B] truncate mt-0.5">
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
              <div className="px-4 py-4 bg-[#F7FAFC] border-b border-[#E2E8F0] flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setSidebarView('chats')}
                  className="p-1 hover:bg-slate-200 text-[#64748B] hover:text-[#0F172A] rounded-full transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                  <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                    <Key className="w-5 h-5 text-[#0EA5E9]" strokeWidth={2.5} />
                    Session Inspector
                  </h2>
                </div>
              </div>

              {/* Session contents */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans">
                <div className="p-3 bg-slate-50 border border-[#E2E8F0] rounded-lg">
                  <h3 className="font-semibold text-[10px] text-[#64748B] uppercase tracking-wide mb-1.5">
                    User UUID
                  </h3>
                  <p className="font-mono text-[#0F172A] break-all select-all font-semibold">
                    {user.id}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-[#E2E8F0] rounded-lg">
                  <h3 className="font-semibold text-[10px] text-[#64748B] uppercase tracking-wide mb-1.5">
                    Verified Email
                  </h3>
                  <p className="font-mono text-[#0F172A] break-all select-all font-semibold">
                    {user.email}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-[#E2E8F0] rounded-lg">
                  <h3 className="font-semibold text-[10px] text-[#64748B] uppercase tracking-wide mb-1.5">
                    Security Provider
                  </h3>
                  <p className="text-[#0F172A] font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#22C55E]" strokeWidth={2.5} />
                    Supabase OAuth / JWT
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-[#E2E8F0] rounded-lg">
                  <h3 className="font-semibold text-[10px] text-[#64748B] uppercase tracking-wide mb-1.5">
                    Last Session Sync
                  </h3>
                  <p className="text-[#0F172A] font-mono">
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
          <div className="flex flex-col h-full overflow-hidden">
            {/* Active Contact Header */}
            <div className="p-4 border-b border-[#E2E8F0] bg-[#F7FAFC] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 overflow-hidden">
                <button
                  onClick={() => setSelectedContact(null)}
                  className="md:hidden p-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-slate-200 rounded-full transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-9 h-9 rounded-full bg-[#0EA5E9]/10 text-[#0EA5E9] font-bold text-xs flex items-center justify-center shrink-0">
                  {getContactInitials(selectedContact)}
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-bold text-sm text-[#0F172A] truncate leading-tight">
                    {getContactName(selectedContact)}
                  </h3>
                  <p className="text-[10px] text-[#64748B] truncate mt-0.5">
                    {getContactEmail(selectedContact)}
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded bg-[#E2E8F0] text-[#0F172A] text-[9px] font-bold uppercase tracking-wider">
                Active Session
              </span>
            </div>

            {/* Message Feed Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FFFFFF] flex flex-col">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full text-[#64748B] text-xs gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-[#0EA5E9]" />
                  <span>Loading message thread...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-[#64748B] space-y-2">
                  <MessageSquare className="w-8 h-8 opacity-40 text-[#0EA5E9]" />
                  <p className="text-xs font-bold text-[#0F172A]">Start your conversation</p>
                  <p className="text-[11px] text-[#64748B]">Type a message below to start chatting in real-time.</p>
                </div>
              ) : (
                <div className="space-y-3 flex-1">
                  {messages.map((msg) => {
                    const isMe = msg.sender_id === user.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] px-4 py-2.5 rounded-[12px] text-sm shadow-sm ${
                            isMe
                              ? 'bg-[#0EA5E9] text-white rounded-tr-none'
                              : 'bg-[#F1F5F9] text-[#0F172A] rounded-tl-none border border-[#E2E8F0]'
                          }`}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed break-words">{msg.content}</p>
                          <div
                            className={`text-[9px] mt-1.5 flex items-center justify-end gap-1 ${
                              isMe ? 'text-sky-100' : 'text-[#64748B]'
                            }`}
                          >
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input Box */}
            <div className="p-3 border-t border-[#E2E8F0] bg-white shrink-0">
              <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 p-2.5 bg-[#F7FAFC] border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm placeholder-[#64748B] focus:outline-none focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9] resize-none max-h-24 font-sans leading-relaxed"
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
                  className="p-2.5 bg-[#0EA5E9] hover:bg-[#0284C7] disabled:opacity-40 text-white rounded-lg transition-all shadow-sm flex items-center justify-center shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* Empty Chat Welcome Screen */
          <div className="flex flex-col items-center justify-center h-full text-[#64748B] space-y-4 p-6 text-center select-none">
            <div className="w-16 h-16 rounded-full bg-sky-50 flex items-center justify-center border border-sky-100">
              <CoveLogo size="lg" showText={false} />
            </div>
            <div className="max-w-md">
              <h2 className="text-xl font-bold text-[#0F172A]">Cove for Web</h2>
              <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
                Connect and chat instantly with Cove. Click the Directory icon at the top left to add friends, approve pending requests, or test messaging.
              </p>
            </div>
            <div className="pt-6 border-t border-[#E2E8F0] w-full max-w-xs flex items-center justify-center gap-2 text-[10px] text-[#64748B] font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-[#22C55E]" strokeWidth={2.5} />
              <span>Secured with Supabase Authentication</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
