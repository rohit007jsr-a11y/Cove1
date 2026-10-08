import { supabase } from './supabase';

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const sessionData = await supabase.auth.getSession();
  const token = sessionData.data.session?.access_token || '';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  return fetch(url, {
    ...options,
    headers,
  });
}
