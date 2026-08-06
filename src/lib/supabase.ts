import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder')
);

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

export function formatAuthError(err: any): string {
  if (!err) return 'An unknown error occurred.';

  const message = typeof err === 'string' ? err : err.message || String(err);

  if (
    message.toLowerCase().includes('failed to fetch') ||
    message.toLowerCase().includes('networkerror') ||
    message.toLowerCase().includes('fetch failed') ||
    message.toLowerCase().includes('typeerror')
  ) {
    if (!isSupabaseConfigured) {
      return 'Supabase credentials missing on deployment. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your Vercel Project Settings (Environment Variables) and redeploy.';
    }
    return `Unable to connect to Supabase server. Please check your internet connection or verify your Supabase project status and CORS settings.`;
  }

  if (message.includes('Error sending confirmation email') || message.includes('rate limit')) {
    return 'Supabase email limit reached. Please disable "Confirm email" in your Supabase Auth -> Providers -> Email settings or configure a custom SMTP server.';
  }

  return message;
}

export function getSupabaseConfig() {
  return {
    url: supabaseUrl,
    key: supabaseAnonKey ? '••••••••' : '',
    isConfigured: isSupabaseConfigured,
  };
}
