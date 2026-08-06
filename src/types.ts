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

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at?: string | null;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}


