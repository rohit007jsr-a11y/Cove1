import React, { useState } from 'react';
import { signInWithGoogle, formatAuthError, isSupabaseConfigured, getSupabaseAuthCallbackUrl } from '../lib/supabase';
import { AlertCircle, ExternalLink, Info, Check, Copy } from 'lucide-react';

interface GoogleSignInButtonProps {
  mode?: 'signin' | 'signup' | 'continue';
  disabled?: boolean;
  onError?: (error: string) => void;
  className?: string;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  mode = 'continue',
  disabled = false,
  onError,
  className = '',
}) => {
  const [loading, setLoading] = useState(false);
  const [showConfigHelp, setShowConfigHelp] = useState(false);
  const [copied, setCopied] = useState(false);

  const buttonText =
    mode === 'signin'
      ? 'Sign in with Google'
      : mode === 'signup'
      ? 'Sign up with Google'
      : 'Continue with Google';

  const callbackUrl = getSupabaseAuthCallbackUrl();

  const handleGoogleLogin = async () => {
    if (loading || disabled) return;

    if (!isSupabaseConfigured) {
      const err = 'Supabase credentials are not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';
      onError?.(err);
      return;
    }

    try {
      setLoading(true);
      // Store flag for fast startup detection upon redirect
      sessionStorage.setItem('cove_oauth_in_progress', 'google');

      const { data, error } = await signInWithGoogle();

      if (error) {
        sessionStorage.removeItem('cove_oauth_in_progress');
        const formatted = formatAuthError(error);
        if (
          error.message?.toLowerCase().includes('provider is not enabled') ||
          error.message?.toLowerCase().includes('unsupported provider')
        ) {
          setShowConfigHelp(true);
        }
        onError?.(formatted);
      } else if (data?.url) {
        // Direct browser navigation to Google OAuth endpoint
        window.location.href = data.url;
      }
    } catch (err: any) {
      sessionStorage.removeItem('cove_oauth_in_progress');
      console.error('Google Sign In error:', err);
      const formatted = formatAuthError(err);
      onError?.(formatted);
    } finally {
      // Keep loading spinner if redirecting
      setTimeout(() => setLoading(false), 2000);
    }
  };

  const copyCallbackUrl = () => {
    if (!callbackUrl) return;
    navigator.clipboard.writeText(callbackUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`w-full ${className}`}>
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={disabled || loading}
        aria-label={buttonText}
        className="w-full relative flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 text-[#0F172A] border border-[#CBD5E1] hover:border-[#94A3B8] font-medium text-sm rounded-lg shadow-sm transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30 focus:border-[#0EA5E9]"
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-[#0EA5E9] border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-600 font-medium text-xs sm:text-sm">Connecting to Google...</span>
          </div>
        ) : (
          <>
            {/* High-accuracy Official 4-color Google G Icon */}
            <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span className="font-semibold text-slate-700 tracking-tight text-xs sm:text-sm">
              {buttonText}
            </span>
            <span className="ml-auto text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 uppercase tracking-wider">
              Fast
            </span>
          </>
        )}
      </button>

      {/* Optional helper hint if user wants details on setup */}
      <div className="flex items-center justify-end mt-1.5">
        <button
          type="button"
          onClick={() => setShowConfigHelp(!showConfigHelp)}
          className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors"
        >
          <Info className="w-3 h-3 text-slate-400" />
          <span>Google setup info</span>
        </button>
      </div>

      {showConfigHelp && (
        <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-2 text-left">
          <div className="flex items-center justify-between font-medium text-slate-800">
            <span>Supabase Google Provider Setup</span>
            <button
              type="button"
              onClick={() => setShowConfigHelp(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              &times;
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            To enable Google login, enable Google in <strong>Supabase &rarr; Auth &rarr; Providers &rarr; Google</strong>, and paste your Google OAuth Client ID & Secret from Google Cloud Console.
          </p>
          {callbackUrl && (
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">
                Authorized Redirect URI for Google Cloud Console:
              </div>
              <div className="flex items-center gap-1 bg-white p-1.5 rounded border border-slate-200 font-mono text-[11px] text-slate-700 break-all select-all">
                <span className="flex-1 overflow-hidden truncate">{callbackUrl}</span>
                <button
                  type="button"
                  onClick={copyCallbackUrl}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 text-[10px] font-sans font-semibold shrink-0 flex items-center gap-1"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
