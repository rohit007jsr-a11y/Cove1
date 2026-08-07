import React, { useState, useEffect } from 'react';
import { Search, X, MessageSquare, Image as ImageIcon, Volume2, FileText, Users, Plus, Shield, MessageCircle } from 'lucide-react';
import { ChatSummary, MessageSearchResult } from '../types';
import { ListItemEnter } from './animations/Animations';

interface ChatListProps {
  chats: ChatSummary[];
  selectedContactId: string | null;
  onSelectChat: (chat: ChatSummary, jumpMessageId?: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenDirectory: () => void;
  onOpenCreateGroup?: () => void;
  currentUserId?: string;
}

export const ChatList: React.FC<ChatListProps> = ({
  chats,
  selectedContactId,
  onSelectChat,
  searchQuery,
  onSearchChange,
  onOpenDirectory,
  onOpenCreateGroup,
  currentUserId,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'direct' | 'groups'>('all');
  const [searchTab, setSearchTab] = useState<'chats' | 'messages'>('chats');
  const [remoteMessageResults, setRemoteMessageResults] = useState<MessageSearchResult[]>([]);
  const [isSearchingMessages, setIsSearchingMessages] = useState(false);

  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setRemoteMessageResults([]);
      setIsSearchingMessages(false);
      setSearchTab('chats');
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingMessages(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&userId=${currentUserId || ''}`);
        if (res.ok) {
          const data = await res.json();
          setRemoteMessageResults(data.messages || []);
        }
      } catch (err) {
        console.error('Failed to search messages API:', err);
      } finally {
        setIsSearchingMessages(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, currentUserId]);

  const formatLastTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return date.toLocaleDateString([], { weekday: 'short' });
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
    } catch {
      return '';
    }
  };

  const filteredChats = chats.filter((chat) => {
    if (filterTab === 'direct' && chat.is_group) return false;
    if (filterTab === 'groups' && !chat.is_group) return false;

    const name = (chat.profile.display_name || chat.group?.name || '').toLowerCase();
    const email = (chat.profile.email || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  // Sort chats by last_message created_at descending
  const sortedChats = [...filteredChats].sort((a, b) => {
    const timeA = a.last_message?.created_at ? new Date(a.last_message.created_at).getTime() : new Date(a.updated_at).getTime();
    const timeB = b.last_message?.created_at ? new Date(b.last_message.created_at).getTime() : new Date(b.updated_at).getTime();
    return timeB - timeA;
  });

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Search Bar & Action Buttons */}
      <div className="p-3 bg-white border-b border-slate-200 shrink-0 space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search chats or groups..."
              className="w-full pl-9 pr-8 py-2 bg-slate-100/80 border border-transparent hover:bg-slate-100 focus:bg-white focus:border-sky-500 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {onOpenCreateGroup && (
            <button
              onClick={onOpenCreateGroup}
              className="p-2 bg-sky-50 hover:bg-sky-100 text-sky-600 border border-sky-200 rounded-xl transition-colors shrink-0 flex items-center gap-1 font-bold text-xs"
              title="Create New Group"
            >
              <Users className="w-4 h-4" />
              <Plus className="w-3 h-3 stroke-[3]" />
            </button>
          )}
        </div>

        {/* Search Results Category Switcher (if search query active) */}
        {searchQuery.trim() ? (
          <div className="flex items-center gap-1 bg-amber-50/80 p-0.5 rounded-xl text-[11px] font-bold border border-amber-200/80">
            <button
              onClick={() => setSearchTab('chats')}
              className={`flex-1 py-1 rounded-lg transition-all ${
                searchTab === 'chats' ? 'bg-amber-500 text-white shadow-2xs' : 'text-amber-800 hover:bg-amber-100/60'
              }`}
            >
              Chats ({sortedChats.length})
            </button>
            <button
              onClick={() => setSearchTab('messages')}
              className={`flex-1 py-1 rounded-lg transition-all flex items-center justify-center gap-1 ${
                searchTab === 'messages' ? 'bg-amber-500 text-white shadow-2xs' : 'text-amber-800 hover:bg-amber-100/60'
              }`}
            >
              <span>Messages</span>
              {isSearchingMessages ? (
                <span className="w-2.5 h-2.5 rounded-full border-2 border-white border-t-transparent animate-spin ml-1" />
              ) : (
                <span>({remoteMessageResults.length})</span>
              )}
            </button>
          </div>
        ) : (
          /* Filter Tabs */
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl text-[11px] font-bold text-slate-600">
            <button
              onClick={() => setFilterTab('all')}
              className={`flex-1 py-1 rounded-lg transition-all ${
                filterTab === 'all' ? 'bg-white text-sky-600 shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterTab('direct')}
              className={`flex-1 py-1 rounded-lg transition-all ${
                filterTab === 'direct' ? 'bg-white text-sky-600 shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              Direct
            </button>
            <button
              onClick={() => setFilterTab('groups')}
              className={`flex-1 py-1 rounded-lg transition-all ${
                filterTab === 'groups' ? 'bg-white text-sky-600 shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              Groups
            </button>
          </div>
        )}
      </div>

      {/* List Feed */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {searchTab === 'messages' ? (
          remoteMessageResults.length === 0 ? (
            <div className="p-8 text-center space-y-2 my-auto">
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto border border-amber-200">
                <Search className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-800">No matching messages</p>
              <p className="text-[11px] text-slate-500">Try searching for keywords or phrases.</p>
            </div>
          ) : (
            remoteMessageResults.map((result, idx) => {
              const matchingChat = chats.find(
                (c) =>
                  c.conversation_id === result.conversationId ||
                  c.contact_id === result.contactId ||
                  (c.is_group && c.group?.id === result.groupId)
              );

              return (
                <ListItemEnter key={result.messageId} index={idx}>
                  <button
                    onClick={() => {
                      if (matchingChat) {
                        onSelectChat(matchingChat, result.messageId);
                      }
                    }}
                    className="w-full text-left p-3 rounded-2xl bg-white border border-slate-200/80 hover:border-amber-400 hover:shadow-xs transition-all space-y-1 group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <MessageCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {result.chatName}
                        </span>
                        {result.senderName && (
                          <span className="text-[10px] text-slate-500 font-medium truncate">
                            &bull; {result.senderName}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-400 font-medium shrink-0">
                        {formatLastTime(result.createdAt)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-snug">
                      {result.snippet.split(new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')).map((part, pIdx) =>
                        part.toLowerCase() === searchQuery.toLowerCase() ? (
                          <mark key={pIdx} className="bg-amber-300 text-slate-950 px-0.5 rounded font-bold">
                            {part}
                          </mark>
                        ) : (
                          part
                        )
                      )}
                    </p>
                  </button>
                </ListItemEnter>
              );
            })
          )
        ) : sortedChats.length === 0 ? (
          <div className="p-8 text-center space-y-3 my-auto">
            <div className="w-12 h-12 rounded-full bg-sky-50 border border-sky-100 text-sky-500 flex items-center justify-center mx-auto">
              {filterTab === 'groups' ? <Users className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">
                {filterTab === 'groups' ? 'No group chats yet' : 'No active conversations'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-[220px] mx-auto leading-relaxed">
                {filterTab === 'groups'
                  ? 'Create a group to start collaborating with multiple contacts.'
                  : 'Connect with contacts or create a group to start messaging.'}
              </p>
            </div>
            {filterTab === 'groups' && onOpenCreateGroup ? (
              <button
                onClick={onOpenCreateGroup}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white font-semibold text-xs rounded-xl transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Group</span>
              </button>
            ) : (
              <button
                onClick={onOpenDirectory}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white font-semibold text-xs rounded-xl transition-colors shadow-2xs"
              >
                <span>Explore Directory</span>
              </button>
            )}
          </div>
        ) : (
          sortedChats.map((chat, idx) => {
            const isSelected = selectedContactId === chat.contact_id;
            const isGroup = Boolean(chat.is_group);
            const displayName = isGroup
              ? chat.group?.name || 'Group Chat'
              : chat.profile.display_name || chat.profile.email.split('@')[0];
            const initials = displayName.slice(0, 2).toUpperCase();
            const lastMsg = chat.last_message;

            return (
              <ListItemEnter key={chat.contact_id} index={idx}>
                <button
                  onClick={() => onSelectChat(chat)}
                  className={`w-full text-left p-3 rounded-2xl transition-all flex items-center gap-3 border relative group ${
                    isSelected
                      ? 'bg-white border-sky-500/30 shadow-xs text-slate-900'
                      : 'hover:bg-white/80 border-transparent text-slate-700'
                  }`}
                >
                  {/* Avatar + Online or Group Badge */}
                  <div className="relative shrink-0">
                    {isGroup ? (
                      <div className="relative">
                        <img
                          src={chat.group?.avatarUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150'}
                          alt="Group Avatar"
                          className="w-11 h-11 rounded-2xl object-cover border border-sky-200 shadow-2xs"
                        />
                        <div className="absolute -bottom-1 -right-1 bg-sky-500 text-white p-0.5 rounded-md border-2 border-white shadow-xs">
                          <Users className="w-2.5 h-2.5" />
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        {chat.profile.avatar_url ? (
                          <img
                            src={chat.profile.avatar_url}
                            alt="Avatar"
                            className="w-11 h-11 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-sky-500/10 text-sky-600 font-bold text-sm flex items-center justify-center border border-sky-500/20">
                            {initials}
                          </div>
                        )}
                        {chat.is_online && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" title="Online" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="overflow-hidden flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <span className="font-bold text-xs truncate text-slate-900">
                          {displayName}
                        </span>
                        {isGroup && (
                          <span className="px-1.5 py-0.2 bg-sky-100 text-sky-700 text-[9px] font-extrabold rounded-md shrink-0">
                            {chat.group?.participants.length || 0} members
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium shrink-0">
                        {formatLastTime(lastMsg?.created_at || chat.updated_at)}
                      </span>
                    </div>

                    {/* Preview Text / Media Type */}
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                        {chat.is_typing ? (
                          <span className="text-sky-600 font-semibold animate-pulse flex items-center gap-1">
                            typing...
                          </span>
                        ) : lastMsg ? (
                          <>
                            {isGroup && lastMsg.sender_name && lastMsg.type !== 'system' && (
                              <span className="font-bold text-slate-700 shrink-0">
                                {lastMsg.sender_name.split(' ')[0]}:
                              </span>
                            )}
                            {lastMsg.type === 'image' && <ImageIcon className="w-3.5 h-3.5 text-sky-500 inline shrink-0" />}
                            {lastMsg.type === 'voice' && <Volume2 className="w-3.5 h-3.5 text-sky-500 inline shrink-0" />}
                            {lastMsg.type === 'file' && <FileText className="w-3.5 h-3.5 text-sky-500 inline shrink-0" />}
                            <span className="truncate">{lastMsg.content || 'Attachment'}</span>
                          </>
                        ) : (
                          <span className="text-slate-400 italic">No messages yet</span>
                        )}
                      </div>

                      {/* Unread count badge */}
                      {chat.unread_count > 0 && (
                        <span className="w-4 h-4 bg-emerald-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center shrink-0 shadow-2xs">
                          {chat.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </ListItemEnter>
            );
          })
        )}
      </div>
    </div>
  );
};

