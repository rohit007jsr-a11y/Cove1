export type AuthView = 'login' | 'signup' | 'verification_pending' | 'forgot_password' | 'dashboard' | 'reset_password';

export interface UserProfile {
  id: string;
  email?: string;
  created_at?: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string | null;
  user_metadata?: {
    full_name?: string;
    username?: string;
    about?: string;
    phone_number?: string;
    avatar_url?: string;
    preferred_theme?: string;
  };
}

export interface Profile {
  id: string;
  email: string;
  display_name?: string;
  username?: string;
  about?: string;
  phone_number?: string;
  avatar_url?: string;
  created_at?: string;
}

export interface ContactRequest {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  profile?: Profile;
}

export interface Conversation {
  id: string;
  created_at: string;
}

export interface ConversationParticipant {
  conversation_id: string;
  user_id: string;
}

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';
export type MessageType = 'text' | 'image' | 'video' | 'document' | 'voice' | 'voice_note' | 'file' | 'system';

export interface GroupSettings {
  onlyAdminsCanSend: boolean;
  onlyAdminsCanEditInfo: boolean;
}

export interface GroupMember {
  userId: string;
  role: 'creator' | 'admin' | 'member';
  joinedAt: string;
  profile?: Profile;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  creatorId: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  participants: string[]; // array of user IDs
  admins: string[]; // array of user IDs
  settings: GroupSettings;
  members?: GroupMember[];
}

export interface ReplyPreview {
  id: string;
  sender_name: string;
  content: string;
}

export interface Reaction {
  emoji: string;
  userId: string;
  userName?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name?: string;
  sender_avatar?: string;
  receiver_id?: string;
  is_group?: boolean;
  group_id?: string;
  content: string;
  type?: MessageType;
  media_url?: string;
  thumbnail_url?: string;
  mime_type?: string;
  file_size?: number;
  duration?: number;
  file_name?: string;
  created_at: string;
  status?: MessageStatus;
  read_at?: string | null;
  reply_to?: ReplyPreview | null;
  reactions?: Reaction[];
  is_forwarded?: boolean;
  forward_count?: number;
  original_message_id?: string;
}

export interface MessageSearchResult {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  snippet: string;
  matchedTerm: string;
  createdAt: string;
  isGroup?: boolean;
  groupId?: string;
  chatName: string;
  chatAvatar?: string;
  contactId?: string;
}

export interface GlobalSearchResults {
  chats: ChatSummary[];
  messages: MessageSearchResult[];
}

export interface ChatSummary {
  contact_id: string;
  conversation_id: string;
  profile: Profile;
  is_group?: boolean;
  group?: Group;
  last_message?: Message | null;
  unread_count: number;
  is_online: boolean;
  is_typing: boolean;
  updated_at: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

export type StatusPrivacy = 'all' | 'contacts' | 'except';

export interface StatusViewer {
  userId: string;
  userName: string;
  userAvatar?: string;
  viewedAt: string;
}

export interface StatusItem {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string;
  type: 'text' | 'image' | 'video';
  contentUrl?: string;
  text?: string;
  bgColor?: string;
  caption?: string;
  createdAt: string;
  expiresAt: string;
  privacy: StatusPrivacy;
  viewers: StatusViewer[];
}

export interface UserStatusGroup {
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string;
  isOwn: boolean;
  hasUnviewed: boolean;
  lastUpdated: string;
  statuses: StatusItem[];
}



