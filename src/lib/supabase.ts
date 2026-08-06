import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const fallbackUrl = 'https://placeholder.supabase.co';
const fallbackKey = 'placeholder-key';

export const supabase = createClient(
  supabaseUrl || fallbackUrl,
  supabaseAnonKey || fallbackKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export function getSupabaseConfig() {
  return {
    url: supabaseUrl,
    key: supabaseAnonKey ? '••••••••' : '',
    isConfigured: isSupabaseConfigured,
  };
}
