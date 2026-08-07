import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare,
  ArrowLeft,
  LogOut,
  Key,
  Users,
  ShieldCheck,
  RefreshCw,
  User,
  Settings,
  Layers,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  Info,
  CircleDot,
  Bell,
  BellOff,
  Lock,
  Shield,
  Phone,
  Video,
  Palette,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile, ContactRequest, Message, Profile, ChatSummary, ReplyPreview, Group, UserStatusGroup, Reaction } from '../types';
import { CoveLogo } from './CoveLogo';
import { ContactsView } from './ContactsView';
import { ProfileView } from './ProfileView';
import { AccountSettingsModal } from './AccountSettingsModal';
import { ArchitectureModal } from './ArchitectureModal';
import { DesignSystemModal } from './DesignSystemModal';
import { ChatList } from './ChatList';
import { StatusList } from './StatusList';
import { MessageBubble } from './MessageBubble';
import { MessageInputBar } from './MessageInputBar';
import { CreateGroupModal } from './CreateGroupModal';
import { GroupInfoModal } from './GroupInfoModal';
import { MediaViewerModal } from './MediaViewerModal';
import { ForwardModal } from './ForwardModal';
import { CallOverlay, CallSession } from './CallOverlay';
import { realtimeChat } from '../lib/websocket';
import { getNotificationSettings, toggleChatMute } from '../lib/notifications';
import {
  idbSaveMessage,
  idbSaveMessagesBulk,
  idbGetMessagesByConversation,
  idbSavePendingMessage,
  idbGetPendingSyncMessages,
  idbRemovePendingMessage,
  idbSaveChatSummary,
  idbGetChatSummaries,
  idbSaveGroup,
  idbGetGroups,
  idbGetGroupById,
} from '../lib/idb';
import {
  cacheConversationMessages,
  getCachedConversationMessages,
  cacheContactsList,
  getCachedContactsList,
} from '../lib/cache';

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
  const [chatSummaries, setChatSummaries] = useState<ChatSummary[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedContact, setSelectedContact] = useState<ContactRequest | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sidebarView, setSidebarView] = useState<'chats' | 'status' | 'contacts' | 'profile' | 'session'>('chats');
  const [statusGroups, setStatusGroups] = useState<UserStatusGroup[]>([]);
  const [rightPaneView, setRightPaneView] = useState<'chat' | 'profile'>('chat');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);
  const [isDesignSystemOpen, setIsDesignSystemOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyingTo, setReplyingTo] = useState<ReplyPreview | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isRecipientTyping, setIsRecipientTyping] = useState<boolean>(false);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState<boolean>(false);
  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [messageToForward, setMessageToForward] = useState<Message | null>(null);
  const [verifiedPeers, setVerifiedPeers] = useState<Record<string, boolean>>({});
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);

  useEffect(() => {
    const checkVerified = () => {
      try {
        const stored = localStorage.getItem('cove_verified_peers');
        if (stored) {
          setVerifiedPeers(JSON.parse(stored));
        } else {
          setVerifiedPeers({});
        }
      } catch (e) {
        console.error('Error reading verified peers:', e);
      }
    };
    checkVerified();
    
    window.addEventListener('focus', checkVerified);
    window.addEventListener('cove_security_verified_update', checkVerified);
    return () => {
      window.removeEventListener('focus', checkVerified);
      window.removeEventListener('cove_security_verified_update', checkVerified);
    };
  }, []);

  // In-chat search states
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState('');
  const [activeMatchIndex, setActiveMatchIndex] = useState(-1);
  const [pendingJumpMessageId, setPendingJumpMessageId] = useState<string | null>(null);

  // Update App Badge count for PWA and desktop install icons based on total unread count
  useEffect(() => {
    const totalUnread = chatSummaries.reduce((acc, chat) => acc + (chat.unread_count || 0), 0);
    if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
      if (totalUnread > 0) {
        navigator.setAppBadge(totalUnread).catch((err) => console.log('[Badge] Failed to set app icon badge:', err));
      } else {
        navigator.clearAppBadge().catch((err) => console.log('[Badge] Failed to clear app icon badge:', err));
      }
    }
  }, [chatSummaries]);

  // Per-chat mute settings
  const [isChatMuted, setIsChatMuted] = useState(false);

  useEffect(() => {
    if (user?.id && activeConversationId) {
      getNotificationSettings(user.id).then((settings) => {
        if (settings) {
          setIsChatMuted(settings.mutedChats.includes(activeConversationId));
        }
      });
    }
  }, [user?.id, activeConversationId]);

  const handleToggleMuteActiveChat = async () => {
    if (!user?.id || !activeConversationId) return;
    const res = await toggleChatMute(user.id, activeConversationId);
    if (res) {
      setIsChatMuted(res.isMuted);
      showToast(
        'success',
        res.isMuted ? 'Chat Muted' : 'Chat Unmuted',
        res.isMuted
          ? 'You will not receive background push notification alerts for this conversation.'
          : 'Background push notifications for this conversation are restored.'
      );
    }
  };

  // Auto-reset search query when switching chats
  useEffect(() => {
    setInChatSearchQuery('');
    setShowInChatSearch(false);
    setActiveMatchIndex(-1);
  }, [activeConversationId]);

  // Compute matched message IDs in active thread
  const matchingMessageIds = useMemo(() => {
    if (!inChatSearchQuery.trim()) return [];
    const query = inChatSearchQuery.toLowerCase();
    return messages
      .filter((m) => m.content && m.content.toLowerCase().includes(query))
      .map((m) => m.id);
  }, [messages, inChatSearchQuery]);

  const handleNextMatch = () => {
    if (matchingMessageIds.length === 0) return;
    const nextIdx = (activeMatchIndex + 1) % matchingMessageIds.length;
    setActiveMatchIndex(nextIdx);
    handleJumpToMessage(matchingMessageIds[nextIdx]);
  };

  const handlePrevMatch = () => {
    if (matchingMessageIds.length === 0) return;
    const prevIdx = (activeMatchIndex - 1 + matchingMessageIds.length) % matchingMessageIds.length;
    setActiveMatchIndex(prevIdx);
    handleJumpToMessage(matchingMessageIds[prevIdx]);
  };

  // Jump scroll when selecting matching search messages
  useEffect(() => {
    if (pendingJumpMessageId && messages.length > 0) {
      const exists = messages.some((m) => m.id === pendingJumpMessageId);
      if (exists) {
        setTimeout(() => {
          handleJumpToMessage(pendingJumpMessageId);
          setPendingJumpMessageId(null);
        }, 300);
      }
    }
  }, [pendingJumpMessageId, messages]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 1. Handle Online/Offline Status and Realtime Connection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('success', 'Back Online', 'Reconnected to Cove network.');
      realtimeChat.connect(user.id, user.user_metadata?.full_name, user.user_metadata?.avatar_url);
      flushPendingOfflineQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast('info', 'Offline Mode', 'Changes are saved locally in IndexedDB.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial WebSocket connect
    realtimeChat.connect(user.id, user.user_metadata?.full_name, user.user_metadata?.avatar_url);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user.id]);

  // 2. Setup WebSocket event subscriptions
  useEffect(() => {
    // Message event handler
    const unsubscribeMsg = realtimeChat.on('message', (data) => {
      const msgData = data.message;
      if (!msgData) return;

      const formattedMsg: Message = {
        id: msgData.id,
        conversation_id: msgData.conversationId,
        sender_id: msgData.senderId,
        sender_name: msgData.senderName,
        receiver_id: msgData.receiverId,
        content: msgData.content,
        type: msgData.type || 'text',
        media_url: msgData.mediaUrl,
        thumbnail_url: msgData.thumbnailUrl,
        mime_type: msgData.mimeType,
        file_size: msgData.fileSize,
        duration: msgData.duration,
        file_name: msgData.fileName,
        created_at: msgData.createdAt || new Date().toISOString(),
        status: msgData.status || 'delivered',
        reply_to: msgData.replyTo,
        is_group: msgData.isGroup,
        group_id: msgData.groupId,
        is_forwarded: msgData.isForwarded,
        forward_count: msgData.forwardCount,
        original_message_id: msgData.originalMessageId,
        reactions: msgData.reactions || [],
      };

      // Save to IndexedDB
      idbSaveMessage(formattedMsg);

      // Append to active conversation if open
      if (formattedMsg.conversation_id === activeConversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === formattedMsg.id)) return prev;
          return [...prev, formattedMsg];
        });

        // Trigger read receipt if chat is currently active
        if (formattedMsg.sender_id !== user.id) {
          realtimeChat.markAsRead(
            formattedMsg.conversation_id,
            [formattedMsg.id],
            formattedMsg.sender_id,
            user.id
          );
        }
      }

      // Update chat summaries list
      setChatSummaries((prev) =>
        prev.map((cs) => {
          if (cs.conversation_id === formattedMsg.conversation_id) {
            return {
              ...cs,
              last_message: formattedMsg,
              unread_count:
                formattedMsg.conversation_id === activeConversationId || formattedMsg.sender_id === user.id
                  ? cs.unread_count
                  : cs.unread_count + 1,
              updated_at: formattedMsg.created_at,
            };
          }
          return cs;
        })
      );

      // In-app alert dispatching with sound & toast triggers based on user's notification preferences
      getNotificationSettings(user.id).then((settings) => {
        if (!settings) return;
        if (settings.globalMute) return;
        if (settings.mutedChats.includes(formattedMsg.conversation_id)) return;

        // Play chime SFX if sound is enabled and recipient is me
        if (settings.soundEnabled && formattedMsg.sender_id !== user.id) {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-600.wav');
          audio.volume = 0.35;
          audio.play().catch(() => {});
        }

        // Show toast banner if sender is someone else AND we are not currently viewing this conversation
        if (formattedMsg.sender_id !== user.id && formattedMsg.conversation_id !== activeConversationId) {
          const title = settings.showPreviews ? (formattedMsg.sender_name || 'New Message') : 'New Message';
          const body = settings.showPreviews ? (formattedMsg.content || 'Sent an attachment') : 'You received a new message';
          showToast('info', title, body);
        }
      });
    });

    // Status update handler
    const unsubscribeStatus = realtimeChat.on('status', (data) => {
      const { messageId, conversationId, status } = data;
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, status } : msg))
      );
      setChatSummaries((prev) =>
        prev.map((cs) => {
          if (cs.conversation_id === conversationId && cs.last_message && cs.last_message.id === messageId) {
            return {
              ...cs,
              last_message: { ...cs.last_message, status },
            };
          }
          return cs;
        })
      );
    });

    // Read receipt handler
    const unsubscribeRead = realtimeChat.on('read_receipt', (data) => {
      const { conversationId, messageIds } = data;
      setMessages((prev) =>
        prev.map((msg) =>
          messageIds && messageIds.includes(msg.id)
            ? { ...msg, status: 'read' }
            : msg
        )
      );
      setChatSummaries((prev) =>
        prev.map((cs) => {
          if (cs.conversation_id === conversationId && cs.last_message && messageIds && messageIds.includes(cs.last_message.id)) {
            return {
              ...cs,
              last_message: { ...cs.last_message, status: 'read' },
            };
          }
          return cs;
        })
      );
    });

    // Typing handler
    const unsubscribeTyping = realtimeChat.on('typing', (data) => {
      const { conversationId, senderId } = data;
      if (activeConversationId === conversationId) {
        setIsRecipientTyping(data.type === 'typing:start');
      }
      setChatSummaries((prev) =>
        prev.map((cs) =>
          cs.conversation_id === conversationId
            ? { ...cs, is_typing: data.type === 'typing:start' }
            : cs
        )
      );
    });

    // Group Created handler
    const unsubscribeGroupCreated = realtimeChat.on('group:created', (data) => {
      const group: Group = data.group;
      if (!group) return;
      idbSaveGroup(group);

      const groupSummary: ChatSummary = {
        contact_id: group.id,
        conversation_id: group.id,
        profile: {
          id: group.id,
          email: 'group@cove.app',
          display_name: group.name,
          avatar_url: group.avatarUrl,
        },
        is_group: true,
        group,
        unread_count: 0,
        is_online: true,
        is_typing: false,
        updated_at: group.createdAt,
      };

      setChatSummaries((prev) => {
        if (prev.some((cs) => cs.conversation_id === group.id)) {
          return prev.map((cs) => (cs.conversation_id === group.id ? groupSummary : cs));
        }
        return [groupSummary, ...prev];
      });

      setGroups((prev) => {
        if (prev.some((g) => g.id === group.id)) {
          return prev.map((g) => (g.id === group.id ? group : g));
        }
        return [group, ...prev];
      });
    });

    // Group Updated handler
    const unsubscribeGroupUpdated = realtimeChat.on('group:updated', (data) => {
      const group: Group = data.group;
      if (!group) return;
      idbSaveGroup(group);

      setGroups((prev) => prev.map((g) => (g.id === group.id ? group : g)));

      if (selectedGroup?.id === group.id) {
        setSelectedGroup(group);
      }

      setChatSummaries((prev) =>
        prev.map((cs) => {
          if (cs.conversation_id === group.id) {
            return {
              ...cs,
              profile: {
                ...cs.profile,
                display_name: group.name,
                avatar_url: group.avatarUrl,
              },
              group,
              updated_at: new Date().toISOString(),
            };
          }
          return cs;
        })
      );
    });

    // Status/Stories real-time update handler
    const unsubscribeStatusUpdates = realtimeChat.on('status:updated_all', () => {
      fetchStatuses();
      getNotificationSettings(user.id).then((settings) => {
        if (settings && !settings.globalMute && settings.statusUpdatesEnabled) {
          showToast('info', 'Status Update', 'A contact has posted a new status update!');
          if (settings.soundEnabled) {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-600.wav');
            audio.volume = 0.25;
            audio.play().catch(() => {});
          }
        }
      });
    });

    // Message reaction updated handler
    const unsubscribeReaction = realtimeChat.on('reaction_updated', (data) => {
      const { messageId, reactions } = data;
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, reactions } : msg))
      );
    });

    // WebRTC calling signal handler
    const unsubscribeCallEvent = realtimeChat.on('call_event', (data: any) => {
      if (data.type === 'call:incoming' && data.receiverId === user.id) {
        setActiveCall({
          callId: data.callId,
          callerId: data.callerId,
          callerName: data.callerName,
          callerAvatar: data.callerAvatar,
          receiverId: data.receiverId,
          receiverName: user.user_metadata?.full_name || user.email || 'You',
          receiverAvatar: user.user_metadata?.avatar_url,
          type: data.callType,
          direction: 'incoming',
        });
      }
    });

    return () => {
      unsubscribeMsg();
      unsubscribeStatus();
      unsubscribeRead();
      unsubscribeTyping();
      unsubscribeGroupCreated();
      unsubscribeGroupUpdated();
      unsubscribeStatusUpdates();
      unsubscribeReaction();
      unsubscribeCallEvent();
    };
  }, [activeConversationId, user.id]);

  const fetchStatuses = async () => {
    try {
      const res = await fetch(`/api/statuses?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.groups) {
          setStatusGroups(data.groups);
        }
      }
    } catch (err) {
      console.warn('Error fetching statuses:', err);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, [user.id]);

  // Flush offline pending queue
  const flushPendingOfflineQueue = async () => {
    try {
      const pending = await idbGetPendingSyncMessages();
      if (pending && pending.length > 0) {
        realtimeChat.syncOfflineQueue(pending, user.id);
        for (const msg of pending) {
          await idbRemovePendingMessage(msg.id);
        }
      }
    } catch (err) {
      console.warn('Error flushing offline queue:', err);
    }
  };

  // Helper to find/create conversation ID
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

      try {
        const profilesToUpsert = [
          {
            id: myUserId,
            email: user.email,
            display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Cove Member',
          },
        ];
        if (otherProfile && otherProfile.id) {
          profilesToUpsert.push({
            id: otherProfile.id,
            email: otherProfile.email || 'user@cove.app',
            display_name: otherProfile.display_name || otherProfile.email?.split('@')[0] || 'Cove Member',
          });
        }
        await supabase.from('profiles').upsert(profilesToUpsert, { onConflict: 'id' });
      } catch (pErr) {
        console.log('Notice upserting profiles:', pErr);
      }

      // Try RPC first
      try {
        const { data, error } = await supabase.rpc('create_conversation', {
          other_user_id: otherUserId,
        });

        if (!error && data) {
          const rpcId = typeof data === 'string' ? data : (data as any)?.id ? String((data as any).id) : String(data);
          if (rpcId && rpcId !== 'null' && !rpcId.startsWith('conv-')) return rpcId;
        }
      } catch (rpcErr) {
        console.warn('create_conversation RPC notice:', rpcErr);
      }

      // Fallback
      const newConvId = generateUUID();
      await supabase.from('conversations').insert([{ id: newConvId }]);
      await supabase.from('conversation_participants').upsert([
        { conversation_id: newConvId, user_id: myUserId },
        { conversation_id: newConvId, user_id: otherUserId },
      ], { onConflict: 'conversation_id,user_id' });

      return newConvId;
    } catch (err) {
      console.error('Error in getOrCreateConversationId:', err);
      return null;
    }
  };

  // Fetch contacts and build chat summaries
  const fetchContactsAndSummaries = async () => {
    // 1. Instant load from IndexedDB first
    const cachedSummaries = await idbGetChatSummaries();
    if (cachedSummaries && cachedSummaries.length > 0) {
      setChatSummaries(cachedSummaries);
    }

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
            .select('id, email, display_name, username, about, avatar_url, created_at')
            .in('id', otherUserIds);

          if (profs && Array.isArray(profs)) {
            profs.forEach((p: any) => {
              profilesMap.set(p.id, p);
            });
          }
        }

        const mappedContacts: ContactRequest[] = data.map((item: any) => {
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

        setContacts(mappedContacts);
        cacheContactsList(user.id, mappedContacts);

        // Build Summaries for Direct Contacts
        const directSummaries: ChatSummary[] = await Promise.all(
          mappedContacts.map(async (c) => {
            const otherId = c.requester_id === user.id ? c.addressee_id : c.requester_id;
            const convId = (await getOrCreateConversationId(user.id, otherId, c.profile)) || c.id;

            // Get last message from IndexedDB or Supabase
            const localMsgs = await idbGetMessagesByConversation(convId);
            const lastMsg = localMsgs.length > 0 ? localMsgs[localMsgs.length - 1] : null;

            const summaryObj: ChatSummary = {
              contact_id: c.id,
              conversation_id: convId,
              profile: c.profile || { id: otherId, email: 'user@cove.app' },
              last_message: lastMsg,
              unread_count: 0,
              is_online: true,
              is_typing: false,
              updated_at: lastMsg?.created_at || c.created_at,
            };

            await idbSaveChatSummary(summaryObj);
            return summaryObj;
          })
        );

        // Fetch Groups from API
        let groupSummaries: ChatSummary[] = [];
        try {
          const res = await fetch(`/api/groups?userId=${user.id}`);
          if (res.ok) {
            const fetchedGroups: Group[] = await res.json();
            setGroups(fetchedGroups);
            for (const g of fetchedGroups) {
              await idbSaveGroup(g);
            }

            groupSummaries = await Promise.all(
              fetchedGroups.map(async (g) => {
                const localMsgs = await idbGetMessagesByConversation(g.id);
                const lastMsg = localMsgs.length > 0 ? localMsgs[localMsgs.length - 1] : null;

                const gSummary: ChatSummary = {
                  contact_id: g.id,
                  conversation_id: g.id,
                  profile: {
                    id: g.id,
                    email: 'group@cove.app',
                    display_name: g.name,
                    avatar_url: g.avatarUrl,
                  },
                  is_group: true,
                  group: g,
                  last_message: lastMsg,
                  unread_count: 0,
                  is_online: true,
                  is_typing: false,
                  updated_at: lastMsg?.created_at || g.createdAt,
                };
                await idbSaveChatSummary(gSummary);
                return gSummary;
              })
            );
          }
        } catch (gErr) {
          console.warn('Notice fetching groups:', gErr);
          const localGroups = await idbGetGroups();
          setGroups(localGroups);
        }

        setChatSummaries([...directSummaries, ...groupSummaries]);
      }
    } catch (err) {
      console.error('Error fetching contacts & summaries:', err);
    }
  };

  useEffect(() => {
    fetchContactsAndSummaries();
    const interval = setInterval(fetchContactsAndSummaries, 10000);
    return () => clearInterval(interval);
  }, [user.id]);

  // Fetch message thread when contact or group selected
  useEffect(() => {
    if (!selectedContact && !selectedGroup) {
      setActiveConversationId(null);
      setMessages([]);
      return;
    }

    let isMounted = true;

    const loadConversation = async () => {
      setLoading(true);

      if (selectedGroup) {
        setActiveConversationId(selectedGroup.id);
        const localMsgs = await idbGetMessagesByConversation(selectedGroup.id);
        if (isMounted) setMessages(localMsgs);
        setLoading(false);
        return;
      }

      if (selectedContact) {
        const otherUserId =
          selectedContact.requester_id === user.id
            ? (selectedContact.addressee_id || selectedContact.profile?.id)
            : (selectedContact.requester_id || selectedContact.profile?.id);

        const convId = await getOrCreateConversationId(user.id, otherUserId, selectedContact.profile);
        if (!isMounted) return;

        setActiveConversationId(convId);

        if (convId) {
          // Load instantly from IndexedDB first
          const localMsgs = await idbGetMessagesByConversation(convId);
          if (localMsgs && localMsgs.length > 0 && isMounted) {
            setMessages(localMsgs);
          }

          // Fetch updates from Supabase
          try {
            const { data, error } = await supabase
              .from('messages')
              .select('*')
              .eq('conversation_id', convId)
              .order('created_at', { ascending: true });

            if (!error && data && Array.isArray(data)) {
              const formatted: Message[] = data.map((m) => ({
                id: m.id,
                conversation_id: m.conversation_id,
                sender_id: m.sender_id,
                receiver_id: otherUserId,
                content: m.content,
                type: m.type || 'text',
                media_url: m.media_url,
                created_at: m.created_at,
                status: m.read_at ? 'read' : 'delivered',
              }));

              if (isMounted) {
                setMessages(formatted);
                await idbSaveMessagesBulk(formatted);
                cacheConversationMessages(convId, formatted);
              }
            }
          } catch (err) {
            console.error('Error fetching conversation messages:', err);
          }
        }
      }
      if (isMounted) setLoading(false);
    };

    loadConversation();

    return () => {
      isMounted = false;
    };
  }, [selectedContact, selectedGroup, user.id]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, isRecipientTyping]);

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isUp = scrollHeight - scrollTop - clientHeight > 150;
      setShowScrollBottomBtn(isUp);
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const threadMediaItems = messages.filter(
    (m) =>
      m.type === 'image' ||
      m.type === 'video' ||
      m.mime_type?.startsWith('image/') ||
      m.mime_type?.startsWith('video/') ||
      (m.media_url && m.media_url.match(/\.(jpeg|jpg|png|gif|webp|mp4|webm|mov)$/i))
  );

  const handleOpenMediaViewer = (msg: Message) => {
    const idx = threadMediaItems.findIndex((m) => m.id === msg.id);
    setSelectedMediaIndex(idx >= 0 ? idx : 0);
    setIsMediaViewerOpen(true);
  };

  // React to message with emoji
  const handleReact = (message: Message, emoji: string) => {
    if (!activeConversationId) return;
    const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';

    // Optimistic local UI update
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== message.id) return msg;
        const currentReactions = msg.reactions || [];
        const existingIdx = currentReactions.findIndex(
          (r) => r.userId === user.id && r.emoji === emoji
        );

        let updated: Reaction[];
        if (existingIdx >= 0) {
          updated = currentReactions.filter((_, idx) => idx !== existingIdx);
        } else {
          updated = currentReactions.filter((r) => r.userId !== user.id);
          updated.push({ emoji, userId: user.id, userName });
        }
        return { ...msg, reactions: updated };
      })
    );

    // Send via WebSocket
    realtimeChat.sendReaction(message.id, activeConversationId, user.id, userName, emoji);
  };

  // Open forward modal
  const handleOpenForwardModal = (message: Message) => {
    setMessageToForward(message);
    setForwardModalOpen(true);
  };

  // Confirm forward message to selected targets
  const handleConfirmForward = (selectedTargets: any[]) => {
    if (!messageToForward) return;
    const senderName = user.user_metadata?.full_name || 'You';
    realtimeChat.forwardMessage(messageToForward, selectedTargets, user.id, senderName);
    showToast('success', 'Message Forwarded', `Forwarded to ${selectedTargets.length} chat(s).`);
  };

  // Delete message locally
  const handleStartCall = (type: 'voice' | 'video') => {
    if (!selectedContact) return;
    const receiverId =
      selectedContact.requester_id === user.id
        ? (selectedContact.addressee_id || selectedContact.profile?.id)
        : (selectedContact.requester_id || selectedContact.profile?.id);

    if (!receiverId) return;

    const callId = `call_${Date.now()}`;
    const newCall: CallSession = {
      callId,
      callerId: user.id,
      callerName: user.user_metadata?.full_name || user.email || 'You',
      callerAvatar: user.user_metadata?.avatar_url,
      receiverId,
      receiverName: selectedContact.profile?.display_name || selectedContact.profile?.email || 'Cove Member',
      receiverAvatar: selectedContact.profile?.avatar_url,
      type,
      direction: 'outgoing',
    };

    setActiveCall(newCall);

    // Notify receiver via WebSocket signaling relay
    realtimeChat.sendCallSignal({
      type: 'call:initiate',
      callId,
      callerId: user.id,
      callerName: user.user_metadata?.full_name || user.email || 'You',
      callerAvatar: user.user_metadata?.avatar_url,
      receiverId,
      callType: type,
    });
  };

  const handleDeleteMessage = (messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    showToast('info', 'Message Deleted', 'Removed from conversation view.');
  };

  // Jump to quoted message and flash highlight
  const handleJumpToMessage = (messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-4', 'ring-sky-400', 'bg-sky-100/90', 'rounded-2xl', 'transition-all', 'duration-500');
      setTimeout(() => {
        el.classList.remove('ring-4', 'ring-sky-400', 'bg-sky-100/90');
      }, 2000);
    } else {
      showToast('info', 'Quoted Message', 'Quoted message is earlier in history.');
    }
  };

  const handleSendMessage = async (
    text: string,
    type: any = 'text',
    mediaUrl?: string,
    fileName?: string,
    mediaMeta?: {
      thumbnailUrl?: string;
      mimeType?: string;
      fileSize?: number;
      duration?: number;
    }
  ) => {
    if (!selectedContact && !selectedGroup) return;

    const generateUUID = (): string => {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });
    };

    const myName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Member';

    // Group Message Sending Flow
    if (selectedGroup) {
      const messageId = generateUUID();
      const newMsg: Message = {
        id: messageId,
        conversation_id: selectedGroup.id,
        sender_id: user.id,
        sender_name: myName,
        receiver_id: selectedGroup.id,
        content: text,
        type,
        media_url: mediaUrl,
        thumbnail_url: mediaMeta?.thumbnailUrl,
        mime_type: mediaMeta?.mimeType,
        file_size: mediaMeta?.fileSize,
        duration: mediaMeta?.duration,
        file_name: fileName,
        created_at: new Date().toISOString(),
        status: 'sending',
        reply_to: replyingTo,
        is_group: true,
        group_id: selectedGroup.id,
      };

      setMessages((prev) => [...prev, newMsg]);
      setReplyingTo(null);
      await idbSaveMessage(newMsg);

      if (isOnline) {
        realtimeChat.sendGroupMessage(newMsg);
      } else {
        await idbSavePendingMessage(newMsg);
      }
      return;
    }

    // Direct 1:1 Message Sending Flow
    if (!selectedContact) return;

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
      showToast('error', 'Session Error', 'Could not start conversation session.');
      return;
    }

    const messageId = generateUUID();
    const newMsg: Message = {
      id: messageId,
      conversation_id: convId,
      sender_id: user.id,
      sender_name: myName,
      receiver_id: otherUserId,
      content: text,
      type,
      media_url: mediaUrl,
      thumbnail_url: mediaMeta?.thumbnailUrl,
      mime_type: mediaMeta?.mimeType,
      file_size: mediaMeta?.fileSize,
      duration: mediaMeta?.duration,
      file_name: fileName,
      created_at: new Date().toISOString(),
      status: 'sending',
      reply_to: replyingTo,
    };

    // Optimistic UI insert
    setMessages((prev) => [...prev, newMsg]);
    setReplyingTo(null);

    // Save to IndexedDB
    await idbSaveMessage(newMsg);

    // Send via WebSocket or queue if offline
    if (isOnline) {
      const sentSuccess = realtimeChat.sendMessage(newMsg);
      if (!sentSuccess) {
        await idbSavePendingMessage(newMsg);
      }
    } else {
      await idbSavePendingMessage(newMsg);
    }

    // Backup insert to Supabase database
    try {
      await supabase.from('messages').insert([
        {
          id: messageId,
          conversation_id: convId,
          sender_id: user.id,
          content: text,
          type,
          media_url: mediaUrl,
        },
      ]);
    } catch (err) {
      console.warn('Supabase fallback insert note:', err);
    }
  };

  const handleTypingStatus = (isTyping: boolean) => {
    if (!activeConversationId) return;
    if (selectedGroup) {
      // Group typing broadcast
      return;
    }
    if (!selectedContact) return;
    const otherUserId =
      selectedContact.requester_id === user.id
        ? (selectedContact.addressee_id || selectedContact.profile?.id)
        : (selectedContact.requester_id || selectedContact.profile?.id);

    realtimeChat.sendTypingStatus(activeConversationId, otherUserId, user.id, isTyping);
  };

  // Group Management Action Handlers
  const handleCreateGroup = async (name: string, description: string, participantIds: string[], avatarUrl?: string) => {
    try {
      const creatorName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Member';
      const creatorAvatar = user.user_metadata?.avatar_url;

      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          creatorId: user.id,
          creatorName,
          creatorAvatar,
          participantIds,
          avatarUrl,
        }),
      });

      if (!res.ok) throw new Error('Failed to create group');

      const group: Group = await res.json();
      setGroups((prev) => [group, ...prev]);
      setSelectedGroup(group);
      setSelectedContact(null);
      setIsCreateGroupOpen(false);
      showToast('success', 'Group Created', `Group "${group.name}" was successfully created.`);
      fetchContactsAndSummaries();
    } catch (err) {
      console.error('Error creating group:', err);
      showToast('error', 'Error', 'Failed to create group. Please try again.');
    }
  };

  const handleUpdateGroupInfo = async (name: string, description: string, avatarUrl?: string, settings?: any) => {
    if (!selectedGroup) return;
    try {
      const res = await fetch(`/api/groups/${selectedGroup.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          name,
          description,
          avatarUrl,
          settings,
        }),
      });

      if (!res.ok) throw new Error('Failed to update group');
      const updated: Group = await res.json();
      setSelectedGroup(updated);
      setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      showToast('success', 'Group Updated', 'Group settings were updated.');
    } catch (err) {
      console.error('Error updating group:', err);
      showToast('error', 'Error', 'Failed to update group settings.');
    }
  };

  const handleAddParticipant = async (targetUserId: string) => {
    if (!selectedGroup) return;
    try {
      const targetContact = contacts.find(
        (c) =>
          c.profile?.id === targetUserId ||
          c.requester_id === targetUserId ||
          c.addressee_id === targetUserId
      );
      const name = targetContact?.profile?.display_name || targetContact?.profile?.email || 'New Member';
      const avatar = targetContact?.profile?.avatar_url;

      const res = await fetch(`/api/groups/${selectedGroup.id}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          action: 'add',
          targetUserId,
          targetUserName: name,
          targetUserAvatar: avatar,
        }),
      });

      if (!res.ok) throw new Error('Failed to add member');
      const updated: Group = await res.json();
      setSelectedGroup(updated);
      setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      showToast('success', 'Member Added', `${name} was added to the group.`);
    } catch (err) {
      console.error('Error adding member:', err);
      showToast('error', 'Error', 'Failed to add member.');
    }
  };

  const handleRemoveParticipant = async (targetUserId: string) => {
    if (!selectedGroup) return;
    try {
      const res = await fetch(`/api/groups/${selectedGroup.id}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          action: 'remove',
          targetUserId,
        }),
      });

      if (!res.ok) throw new Error('Failed to remove member');
      const updated: Group = await res.json();
      setSelectedGroup(updated);
      setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      showToast('info', 'Member Removed', 'Participant removed from group.');
    } catch (err) {
      console.error('Error removing member:', err);
      showToast('error', 'Error', 'Failed to remove member.');
    }
  };

  const handleChangeRole = async (targetUserId: string, newRole: 'admin' | 'member') => {
    if (!selectedGroup) return;
    try {
      const res = await fetch(`/api/groups/${selectedGroup.id}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          targetUserId,
          newRole,
        }),
      });

      if (!res.ok) throw new Error('Failed to change role');
      const updated: Group = await res.json();
      setSelectedGroup(updated);
      setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      showToast('success', 'Role Updated', `User role updated to ${newRole}.`);
    } catch (err) {
      console.error('Error changing role:', err);
      showToast('error', 'Error', 'Failed to update member role.');
    }
  };

  const handleLeaveGroup = async () => {
    if (!selectedGroup) return;
    try {
      await fetch(`/api/groups/${selectedGroup.id}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          action: 'leave',
        }),
      });

      setSelectedGroup(null);
      setIsGroupInfoOpen(false);
      showToast('info', 'Left Group', `You left "${selectedGroup.name}".`);
      fetchContactsAndSummaries();
    } catch (err) {
      console.error('Error leaving group:', err);
      showToast('error', 'Error', 'Failed to leave group.');
    }
  };

  const getContactName = (contact: ContactRequest) => {
    const p = contact.profile;
    return p?.display_name || p?.email?.split('@')[0] || 'Cove Member';
  };

  const getContactInitials = (contact: ContactRequest) => {
    const name = getContactName(contact) || 'U';
    return name.slice(0, 2).toUpperCase();
  };

  const handleStartChatWithProfile = async (profile: Profile) => {
    let existingContact = contacts.find(
      (c) => c.profile?.id === profile.id || c.requester_id === profile.id || c.addressee_id === profile.id
    );

    if (!existingContact) {
      const mockContact: ContactRequest = {
        id: `contact-mapped-${profile.id}`,
        requester_id: user.id,
        addressee_id: profile.id,
        status: 'accepted',
        created_at: new Date().toISOString(),
        profile: profile,
      };
      
      setContacts((prev) => [mockContact, ...prev]);
      existingContact = mockContact;
    }

    setSelectedGroup(null);
    setSelectedContact(existingContact);
    setSidebarView('chats');
    setIsSettingsOpen(false);
  };

  return (
    <div className="w-full h-screen min-h-[100dvh] bg-white flex flex-col overflow-hidden select-none font-sans">
      {/* Network Status Banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-bold flex items-center justify-center gap-2 shrink-0 animate-pulse">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline Mode — Messages are saved locally in IndexedDB & will auto-sync when online</span>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* 1. Left Sidebar Navigation Panel */}
        <div
          className={`${
            selectedContact || selectedGroup ? 'hidden md:flex' : 'flex'
          } flex-col w-full md:w-[340px] lg:w-[380px] border-r border-slate-200 bg-slate-50/70 shrink-0 h-full overflow-hidden`}
        >
          {/* Top User Profile Header */}
          <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-2xs">
            <div
              onClick={() => setSidebarView('profile')}
              className="flex items-center gap-3 overflow-hidden cursor-pointer group p-1 -ml-1 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <div className="relative shrink-0">
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="Avatar"
                    className="w-9 h-9 rounded-full object-cover border border-sky-500/30"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-sky-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                    {(user.user_metadata?.full_name || user.email || 'U').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
              </div>
              <div className="overflow-hidden">
                <h2 className="font-bold text-sm text-slate-900 group-hover:text-sky-600 truncate leading-tight">
                  {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Cove Member'}
                </h2>
                <span className="text-[10px] text-sky-600 font-mono font-medium truncate">
                  @{user.user_metadata?.username || user.email?.split('@')[0] || 'user'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setIsDesignSystemOpen(true)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-600 hover:text-sky-600 transition-colors relative"
                title="Cove Design System Playground"
              >
                <Palette className="w-4 h-4 text-sky-500" />
              </button>
              <button
                onClick={() => setIsArchitectureOpen(true)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-600 hover:text-sky-600 transition-colors relative"
                title="Architecture System & Specifications"
              >
                <Layers className="w-4 h-4 text-sky-500" />
              </button>
              <button
                onClick={() => setSidebarView('profile')}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-600 hover:text-sky-600 transition-colors"
                title="My Profile"
              >
                <User className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-600 hover:text-sky-600 transition-colors"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
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

          {/* Sub-Header Navigation Tabs: Chats | Status | Directory */}
          <div className="flex items-center border-b border-slate-200 bg-slate-100/80 p-1 gap-1 shrink-0">
            <button
              onClick={() => setSidebarView('chats')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                sidebarView === 'chats'
                  ? 'bg-white text-sky-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chats</span>
              {chatSummaries.reduce((a, b) => a + (b.unread_count || 0), 0) > 0 && (
                <span className="px-1.5 py-0.2 bg-sky-500 text-white text-[9px] font-extrabold rounded-full">
                  {chatSummaries.reduce((a, b) => a + (b.unread_count || 0), 0)}
                </span>
              )}
            </button>

            <button
              onClick={() => setSidebarView('status')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all relative ${
                sidebarView === 'status'
                  ? 'bg-white text-sky-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
              }`}
            >
              <CircleDot className="w-3.5 h-3.5 text-emerald-500" />
              <span>Status</span>
              {statusGroups.some((g) => g.ownerId !== user.id && g.hasUnviewed) && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setSidebarView('contacts')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                sidebarView === 'contacts'
                  ? 'bg-white text-sky-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Directory</span>
            </button>
          </div>

          <AnimatePresence mode="wait">
            {sidebarView === 'chats' && (
              <motion.div
                key="chats"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex flex-col flex-1 overflow-hidden"
              >
                {/* Chat List */}
                <ChatList
                  chats={chatSummaries}
                  selectedContactId={selectedGroup ? selectedGroup.id : selectedContact?.id || null}
                  onSelectChat={(chat, jumpMessageId) => {
                    if (chat.is_group && chat.group) {
                      setSelectedGroup(chat.group);
                      setSelectedContact(null);
                    } else {
                      const found = contacts.find((c) => c.id === chat.contact_id);
                      if (found) {
                        setSelectedContact(found);
                        setSelectedGroup(null);
                      }
                    }
                    if (jumpMessageId) {
                      setPendingJumpMessageId(jumpMessageId);
                      setShowInChatSearch(true);
                      const matchingMsg = messages.find((m) => m.id === jumpMessageId);
                      if (matchingMsg && matchingMsg.content) {
                        setInChatSearchQuery(matchingMsg.content);
                      }
                    }
                    setSidebarView('chats');
                  }}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onOpenDirectory={() => setSidebarView('contacts')}
                  onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
                  currentUserId={user.id}
                />
              </motion.div>
            )}

            {sidebarView === 'status' && (
              <motion.div
                key="status"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex flex-col flex-1 overflow-hidden"
              >
                <StatusList
                  currentUserId={user.id}
                  currentUserName={user.user_metadata?.full_name || user.email?.split('@')[0] || 'Cove User'}
                  currentUserAvatar={user.user_metadata?.avatar_url}
                  statusGroups={statusGroups}
                  onRefreshStatuses={fetchStatuses}
                  onReplyToStatus={(statusOwnerId, text) => {
                    const contact = contacts.find(
                      (c) => c.profile?.id === statusOwnerId || c.requester_id === statusOwnerId || c.addressee_id === statusOwnerId
                    );
                    if (contact) {
                      setSelectedContact(contact);
                      setSelectedGroup(null);
                      setSidebarView('chats');
                      showToast('success', 'Status Reply', `Opened chat with ${contact.profile?.display_name || 'contact'}`);
                    }
                  }}
                />
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
                    setSelectedGroup(null);
                    setSidebarView('chats');
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 2. Right Conversation Thread Panel */}
        <div
          className={`${
            !selectedContact && !selectedGroup ? 'hidden md:flex' : 'flex'
          } flex-col flex-1 bg-white h-full overflow-hidden`}
        >
          {selectedGroup ? (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Group Top Header */}
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0 shadow-2xs">
                <div
                  onClick={() => setIsGroupInfoOpen(true)}
                  className="flex items-center gap-3 overflow-hidden cursor-pointer group p-1 -ml-1 rounded-xl hover:bg-slate-200/60 transition-colors"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedGroup(null);
                    }}
                    className="md:hidden p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-full transition-all"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <img
                    src={selectedGroup.avatarUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150'}
                    alt="Group Avatar"
                    className="w-9 h-9 rounded-xl object-cover border border-sky-300 shadow-2xs group-hover:scale-105 transition-transform"
                  />
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900 group-hover:text-sky-600 truncate leading-tight">
                        {selectedGroup.name}
                      </h3>
                      <span className="px-1.5 py-0.2 bg-sky-100 text-sky-700 text-[9px] font-extrabold rounded-md shrink-0">
                        {selectedGroup.participants.length} members
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {selectedGroup.description || 'Tap for group info & members'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowInChatSearch(!showInChatSearch)}
                    className={`p-2 rounded-xl transition-all ${
                      showInChatSearch
                        ? 'bg-amber-100 text-amber-700 shadow-3xs border border-amber-200'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                    title="Search keywords in this chat"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsGroupInfoOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold flex items-center gap-1.5 transition-colors border border-sky-200"
                  >
                    <Info className="w-4 h-4 text-sky-600" />
                    <span>Group Info</span>
                  </button>
                </div>
              </div>

              {/* In-Chat Search Panel */}
              <AnimatePresence>
                {showInChatSearch && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-amber-50/90 border-b border-amber-200/60 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0"
                  >
                    <div className="flex items-center gap-2 flex-1 max-w-md bg-white border border-amber-200 rounded-xl px-3 py-1.5 shadow-3xs">
                      <Search className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <input
                        type="text"
                        placeholder="Search keywords in this chat..."
                        value={inChatSearchQuery}
                        onChange={(e) => {
                          setInChatSearchQuery(e.target.value);
                          setActiveMatchIndex(e.target.value.trim() ? 0 : -1);
                        }}
                        className="w-full bg-transparent border-none text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-0"
                        autoFocus
                      />
                      {inChatSearchQuery && (
                        <button
                          onClick={() => {
                            setInChatSearchQuery('');
                            setActiveMatchIndex(-1);
                          }}
                          className="p-0.5 hover:bg-amber-100 rounded-full transition-colors"
                        >
                          <X className="w-3.5 h-3.5 text-amber-600" />
                        </button>
                      )}
                    </div>

                    {matchingMessageIds.length > 0 && (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-bold text-amber-800 font-mono bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                          {activeMatchIndex + 1} of {matchingMessageIds.length} matches
                        </span>
                        <div className="flex items-center bg-white rounded-xl border border-amber-200 overflow-hidden shadow-3xs">
                          <button
                            onClick={handlePrevMatch}
                            className="p-1.5 hover:bg-amber-50 text-amber-800 border-r border-amber-200 transition-colors"
                            title="Previous match"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleNextMatch}
                            className="p-1.5 hover:bg-amber-50 text-amber-800 transition-colors"
                            title="Next match"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {inChatSearchQuery && matchingMessageIds.length === 0 && (
                      <span className="text-[11px] font-bold text-slate-500 shrink-0 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        No matches found
                      </span>
                    )}

                    <button
                      onClick={() => {
                        setShowInChatSearch(false);
                        setInChatSearchQuery('');
                        setActiveMatchIndex(-1);
                      }}
                      className="p-1 hover:bg-amber-100 rounded-lg text-amber-800 shrink-0 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Messages Feed Area */}
              <div
                ref={chatContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 bg-slate-50/40 flex flex-col relative"
              >
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-sky-500" />
                    <span>Loading group message history...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2 my-auto">
                    <div className="w-12 h-12 rounded-full bg-sky-50 text-sky-500 flex items-center justify-center border border-sky-100">
                      <Users className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">Group Created!</p>
                    <p className="text-[11px] text-slate-500 max-w-[220px] text-center">
                      Send a message below to start collaborating with "{selectedGroup.name}".
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 flex-1">
                    {messages.map((msg) => {
                      const isMe = msg.sender_id === user.id;
                      const isActiveMatch =
                        matchingMessageIds.length > 0 &&
                        activeMatchIndex !== -1 &&
                        matchingMessageIds[activeMatchIndex] === msg.id;

                      return (
                        <MessageBubble
                          key={msg.id}
                          message={msg}
                          isOwn={isMe}
                          currentUserId={user.id}
                          currentUserName={user.user_metadata?.full_name || 'Member'}
                          searchQuery={inChatSearchQuery}
                          isActiveMatch={isActiveMatch}
                          onOpenMediaViewer={handleOpenMediaViewer}
                          onReact={handleReact}
                          onForward={handleOpenForwardModal}
                          onDelete={handleDeleteMessage}
                          onJumpToMessage={handleJumpToMessage}
                          onReply={(replyMsg) => {
                            setReplyingTo({
                              id: replyMsg.id,
                              sender_name: isMe ? 'You' : replyMsg.sender_name || 'Member',
                              content: replyMsg.content || 'Media Attachment',
                            });
                          }}
                        />
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}

                {/* Jump to bottom float button */}
                {showScrollBottomBtn && (
                  <button
                    onClick={scrollToBottom}
                    className="fixed bottom-20 right-6 p-2.5 bg-sky-500 text-white rounded-full shadow-lg hover:bg-sky-600 transition-all z-20 active:scale-95"
                    title="Scroll to latest messages"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Input Bar */}
              <MessageInputBar
                onSendMessage={handleSendMessage}
                onTyping={handleTypingStatus}
                replyTo={replyingTo}
                onCancelReply={() => setReplyingTo(null)}
                disabled={
                  selectedGroup.settings?.onlyAdminsCanSend &&
                  !selectedGroup.admins.includes(user.id)
                }
              />
            </div>
          ) : selectedContact ? (
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
                {/* Chat Top Header */}
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0 shadow-2xs">
                  <div
                    onClick={() => setRightPaneView('profile')}
                    className="flex items-center gap-3 overflow-hidden cursor-pointer group p-1 -ml-1 rounded-xl hover:bg-slate-200/60 transition-colors"
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
                      <h3 className="font-bold text-sm text-slate-900 group-hover:text-sky-600 truncate leading-tight flex items-center gap-1.5">
                        <span>{getContactName(selectedContact)}</span>
                        {verifiedPeers[getContactName(selectedContact)] ? (
                          <Shield className="w-3.5 h-3.5 text-emerald-500 fill-emerald-100" title="Security Code Verified" />
                        ) : (
                          <Lock className="w-3 text-slate-400" title="End-to-End Encrypted" />
                        )}
                      </h3>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5 font-mono">
                        {isRecipientTyping ? (
                          <span className="text-sky-600 font-bold animate-pulse">typing...</span>
                        ) : (
                          <span>@{selectedContact.profile?.username || getContactName(selectedContact).toLowerCase()}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStartCall('voice')}
                      className="p-1.5 rounded-xl hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 transition-all border border-transparent hover:border-emerald-200/50"
                      title="Start Voice Call"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleStartCall('video')}
                      className="p-1.5 rounded-xl hover:bg-sky-50 text-sky-600 hover:text-sky-700 transition-all border border-transparent hover:border-sky-200/50"
                      title="Start Video Call"
                    >
                      <Video className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowInChatSearch(!showInChatSearch)}
                      className={`p-1.5 rounded-xl transition-all ${
                        showInChatSearch
                          ? 'bg-amber-100 text-amber-700 shadow-3xs border border-amber-200'
                          : 'hover:bg-slate-200 text-slate-600'
                      }`}
                      title="Search keywords in this chat"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleToggleMuteActiveChat}
                      className={`p-1.5 rounded-xl transition-all ${
                        isChatMuted
                          ? 'bg-rose-50 text-rose-600 border border-rose-200/60 shadow-3xs'
                          : 'hover:bg-slate-200 text-slate-600'
                      }`}
                      title={isChatMuted ? 'Unmute chat' : 'Mute chat'}
                    >
                      {isChatMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setIsArchitectureOpen(true)}
                      className="px-2.5 py-1 rounded-full bg-sky-50 hover:bg-sky-100 text-sky-700 text-[10px] font-bold flex items-center gap-1.5 transition-colors border border-sky-200/60"
                      title="Architecture Specs"
                    >
                      <Layers className="w-3.5 h-3.5 text-sky-500" />
                      <span>Architecture</span>
                    </button>
                    <button
                      onClick={() => setRightPaneView('profile')}
                      className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <User className="w-3.5 h-3.5 text-sky-500" />
                      <span>Contact Info</span>
                    </button>
                  </div>
                </div>

                {/* In-Chat Search Panel */}
                <AnimatePresence>
                  {showInChatSearch && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-amber-50/90 border-b border-amber-200/60 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0"
                    >
                      <div className="flex items-center gap-2 flex-1 max-w-md bg-white border border-amber-200 rounded-xl px-3 py-1.5 shadow-3xs">
                        <Search className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <input
                          type="text"
                          placeholder="Search keywords in this chat..."
                          value={inChatSearchQuery}
                          onChange={(e) => {
                            setInChatSearchQuery(e.target.value);
                            setActiveMatchIndex(e.target.value.trim() ? 0 : -1);
                          }}
                          className="w-full bg-transparent border-none text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-0"
                          autoFocus
                        />
                        {inChatSearchQuery && (
                          <button
                            onClick={() => {
                              setInChatSearchQuery('');
                              setActiveMatchIndex(-1);
                            }}
                            className="p-0.5 hover:bg-amber-100 rounded-full transition-colors"
                          >
                            <X className="w-3.5 h-3.5 text-amber-600" />
                          </button>
                        )}
                      </div>

                      {matchingMessageIds.length > 0 && (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-bold text-amber-800 font-mono bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                            {activeMatchIndex + 1} of {matchingMessageIds.length} matches
                          </span>
                          <div className="flex items-center bg-white rounded-xl border border-amber-200 overflow-hidden shadow-3xs">
                            <button
                              onClick={handlePrevMatch}
                              className="p-1.5 hover:bg-amber-50 text-amber-800 border-r border-amber-200 transition-colors"
                              title="Previous match"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleNextMatch}
                              className="p-1.5 hover:bg-amber-50 text-amber-800 transition-colors"
                              title="Next match"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {inChatSearchQuery && matchingMessageIds.length === 0 && (
                        <span className="text-[11px] font-bold text-slate-500 shrink-0 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          No matches found
                        </span>
                      )}

                      <button
                        onClick={() => {
                          setShowInChatSearch(false);
                          setInChatSearchQuery('');
                          setActiveMatchIndex(-1);
                        }}
                        className="p-1 hover:bg-amber-100 rounded-lg text-amber-800 shrink-0 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Messages Feed Area */}
                <div
                  ref={chatContainerRef}
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 bg-slate-50/40 flex flex-col relative"
                >
                  {loading ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-sky-500" />
                      <span>Loading conversation history...</span>
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
                      {/* E2EE Active Indicator Notice banner */}
                      <div 
                        onClick={() => {
                          setIsArchitectureOpen(true);
                          // We'll set a tiny timer or global hook if needed to focus the security tab,
                          // but simply opening the architecture modal gives the user full access.
                        }}
                        className="mx-auto mb-4 max-w-sm p-3 bg-slate-900/5 hover:bg-slate-900/10 border border-slate-200/80 rounded-2xl text-[11px] text-slate-600 flex items-start gap-2.5 cursor-pointer select-none transition-all shadow-3xs"
                        title="View End-to-End Encryption Specifications"
                      >
                        <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="flex-1 leading-normal">
                          <span className="font-bold text-slate-800">Messages are end-to-end encrypted.</span> No one outside of this chat, not even Cove, can read or listen to them. Tap to verify security codes.
                        </div>
                      </div>

                      {messages.map((msg) => {
                        const isMe = msg.sender_id === user.id;
                        const isActiveMatch =
                          matchingMessageIds.length > 0 &&
                          activeMatchIndex !== -1 &&
                          matchingMessageIds[activeMatchIndex] === msg.id;

                        return (
                          <MessageBubble
                            key={msg.id}
                            message={msg}
                            isOwn={isMe}
                            currentUserId={user.id}
                            currentUserName={user.user_metadata?.full_name || 'Member'}
                            searchQuery={inChatSearchQuery}
                            isActiveMatch={isActiveMatch}
                            onOpenMediaViewer={handleOpenMediaViewer}
                            onReact={handleReact}
                            onForward={handleOpenForwardModal}
                            onDelete={handleDeleteMessage}
                            onJumpToMessage={handleJumpToMessage}
                            onReply={(replyMsg) => {
                              setReplyingTo({
                                id: replyMsg.id,
                                sender_name: isMe ? 'You' : getContactName(selectedContact),
                                content: replyMsg.content || 'Media Attachment',
                              });
                            }}
                          />
                        );
                      })}

                      {/* Live typing indicator */}
                      {isRecipientTyping && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 p-2 px-3 bg-white border border-slate-200/80 rounded-full w-max text-xs text-slate-500 shadow-2xs"
                        >
                          <span className="font-semibold text-sky-600">{getContactName(selectedContact)}</span> is typing...
                        </motion.div>
                      )}

                      <div ref={messagesEndRef} />
                    </div>
                  )}

                  {/* Jump to bottom float button */}
                  {showScrollBottomBtn && (
                    <button
                      onClick={scrollToBottom}
                      className="fixed bottom-20 right-6 p-2.5 bg-sky-500 text-white rounded-full shadow-lg hover:bg-sky-600 transition-all z-20 active:scale-95"
                      title="Scroll to latest messages"
                    >
                      <ChevronDown className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Input Bar */}
                <MessageInputBar
                  onSendMessage={handleSendMessage}
                  onTyping={handleTypingStatus}
                  replyTo={replyingTo}
                  onCancelReply={() => setReplyingTo(null)}
                />
              </div>
            )
          ) : (
            /* Empty State Splash */
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4 p-8 text-center select-none bg-slate-50/30">
              <div className="w-16 h-16 rounded-2xl bg-white shadow-xs border border-slate-200/80 flex items-center justify-center">
                <CoveLogo size="lg" showText={false} />
              </div>
              <div className="max-w-sm space-y-1">
                <h2 className="text-lg font-bold text-slate-900">Welcome to Cove Chat</h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Select a conversation or group from the sidebar, or create a new group.
                </p>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => setIsCreateGroupOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                >
                  <Users className="w-4 h-4" />
                  <span>Create Group</span>
                </button>
                <button
                  onClick={() => setSidebarView('contacts')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl shadow-2xs transition-colors"
                >
                  <Users className="w-4 h-4 text-sky-500" />
                  <span>Explore Directory</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Account Settings Modal */}
      <AccountSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        onSignOut={onSignOut}
        showToast={showToast}
        onOpenChatWithProfile={handleStartChatWithProfile}
      />

      {/* Architecture System Modal */}
      <ArchitectureModal
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
      />

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        contacts={contacts}
        onCreateGroup={handleCreateGroup}
      />

      {/* Group Info Drawer Modal */}
      {selectedGroup && (
        <GroupInfoModal
          isOpen={isGroupInfoOpen}
          onClose={() => setIsGroupInfoOpen(false)}
          group={selectedGroup}
          currentUser={user}
          contacts={contacts}
          onUpdateGroupInfo={handleUpdateGroupInfo}
          onAddParticipant={handleAddParticipant}
          onRemoveParticipant={handleRemoveParticipant}
          onChangeRole={handleChangeRole}
          onLeaveGroup={handleLeaveGroup}
          showToast={showToast}
        />
      )}
      {/* Full-Screen Media Viewer Lightbox */}
      <MediaViewerModal
        isOpen={isMediaViewerOpen}
        onClose={() => setIsMediaViewerOpen(false)}
        mediaItems={threadMediaItems}
        initialIndex={selectedMediaIndex}
      />

      {/* Forward Message Modal */}
      <ForwardModal
        isOpen={forwardModalOpen}
        onClose={() => setForwardModalOpen(false)}
        messageToForward={messageToForward}
        contacts={contacts}
        groups={groups}
        currentUserId={user.id}
        onForward={handleConfirmForward}
      />

      {/* Realtime Call Overlay */}
      <CallOverlay
        currentUser={user}
        activeCall={activeCall}
        onEndCall={() => setActiveCall(null)}
        showToast={showToast}
      />

      {/* Global Interactive Design System & Animation Showcase */}
      <DesignSystemModal
        isOpen={isDesignSystemOpen}
        onClose={() => setIsDesignSystemOpen(false)}
        showToast={showToast}
      />
    </div>
  );
};
