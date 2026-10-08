import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { CalmBackground } from './components/CalmBackground';
import { LoginView } from './components/LoginView';
import { SignUpView } from './components/SignUpView';
import { VerificationPendingView } from './components/VerificationPendingView';
import { ForgotPasswordView } from './components/ForgotPasswordView';
import { DashboardView } from './components/DashboardView';
import { NotificationToast } from './components/NotificationToast';
import { supabase } from './lib/supabase';
import { AuthView, UserProfile, ToastMessage } from './types';
import { CoveLogo } from './components/CoveLogo';
import { Sparkles, ShieldCheck, Mail, ArrowRight, RefreshCw } from 'lucide-react';
import { generateAutoUsername } from './lib/username';
import { cacheUserProfile, cacheSessionMetadata, clearCoveCache } from './lib/cache';

export default function App() {
  const [currentView, setCurrentView] = useState<AuthView>('login');
  const [pendingEmail, setPendingEmail] = useState<string>('');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [initializing, setInitializing] = useState<boolean>(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = Date.now().toString();
    setToast({ id, type, title, message });

    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 5000);
  };

  // Initialize Supabase auth session listener
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) console.error('Auth session error:', error);

        if (mounted) {
          if (session?.user) {
            const meta = (session.user.user_metadata || {}) as Record<string, any>;
            const rawName = meta.full_name || meta.name || '';
            const rawAvatar = meta.avatar_url || meta.picture || '';
            const autoUsername = meta.username || generateAutoUsername(session.user.email || rawName);
            
            const userMeta = {
              ...meta,
              full_name: rawName || meta.display_name || (session.user.email ? session.user.email.split('@')[0] : 'Cove User'),
              avatar_url: rawAvatar,
              username: autoUsername,
            };

            const userObj: UserProfile = {
              id: session.user.id,
              email: session.user.email,
              created_at: session.user.created_at,
              last_sign_in_at: session.user.last_sign_in_at,
              email_confirmed_at: session.user.email_confirmed_at,
              user_metadata: userMeta,
            };

            setUser(userObj);
            cacheUserProfile(userObj);
            cacheSessionMetadata(userObj, session.access_token);

            // Sync profile data to Supabase database in background
            if (session.user.id && session.user.email) {
              supabase.from('profiles').upsert([
                {
                  id: session.user.id,
                  email: session.user.email,
                  display_name: userMeta.full_name,
                  username: autoUsername,
                  avatar_url: userMeta.avatar_url,
                  about: meta.about || 'Hey there! I am using Cove.',
                }
              ], { onConflict: 'id' }).then(({ error: upsertErr }) => {
                if (upsertErr) console.log('Notice upserting profile on init:', upsertErr.message);
              });
            }

            // Google OAuth users are pre-verified by Google
            const isGoogleUser = Boolean(
              session.user.app_metadata?.provider === 'google' ||
              session.user.identities?.some((id: any) => id.provider === 'google')
            );
            const isEmailConfirmed = Boolean(session.user.email_confirmed_at || isGoogleUser);

            if (isEmailConfirmed) {
              setCurrentView('dashboard');
              if (sessionStorage.getItem('cove_oauth_in_progress') === 'google') {
                sessionStorage.removeItem('cove_oauth_in_progress');
                showToast('success', 'Signed in with Google', `Welcome back, ${userMeta.full_name}!`);
              }
            } else {
              setPendingEmail(session.user.email || '');
              setCurrentView('verification_pending');
            }

            // Clean OAuth tokens and codes from browser address bar
            if (typeof window !== 'undefined' && (window.location.hash.includes('access_token=') || window.location.search.includes('code='))) {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          }
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        if (mounted) setInitializing(false);
      }
    }

    initAuth();

    // Listen to real-time auth changes from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Supabase Auth Event:', event, session?.user?.email);

      if (session?.user) {
        const meta = (session.user.user_metadata || {}) as Record<string, any>;
        const rawName = meta.full_name || meta.name || '';
        const rawAvatar = meta.avatar_url || meta.picture || '';
        const autoUsername = meta.username || generateAutoUsername(session.user.email || rawName);

        const userMeta = {
          ...meta,
          full_name: rawName || meta.display_name || (session.user.email ? session.user.email.split('@')[0] : 'Cove User'),
          avatar_url: rawAvatar,
          username: autoUsername,
        };

        const userObj: UserProfile = {
          id: session.user.id,
          email: session.user.email,
          created_at: session.user.created_at,
          last_sign_in_at: session.user.last_sign_in_at,
          email_confirmed_at: session.user.email_confirmed_at,
          user_metadata: userMeta,
        };

        setUser(userObj);
        cacheUserProfile(userObj);
        cacheSessionMetadata(userObj, session.access_token);

        // Google OAuth users are pre-verified by Google
        const isGoogleUser = Boolean(
          session.user.app_metadata?.provider === 'google' ||
          session.user.identities?.some((id: any) => id.provider === 'google')
        );
        const isEmailConfirmed = Boolean(session.user.email_confirmed_at || isGoogleUser);

        if (isEmailConfirmed) {
          setCurrentView('dashboard');
          if (sessionStorage.getItem('cove_oauth_in_progress') === 'google') {
            sessionStorage.removeItem('cove_oauth_in_progress');
            showToast('success', 'Signed in with Google', `Welcome back, ${userMeta.full_name}!`);
          }
        } else if (event === 'SIGNED_IN') {
          setPendingEmail(session.user.email || '');
          setCurrentView('verification_pending');
        }

        // Clean URL hash/search if OAuth tokens are present
        if (typeof window !== 'undefined' && (window.location.hash.includes('access_token=') || window.location.search.includes('code='))) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } else {
        setUser(null);
        if (event === 'SIGNED_OUT') {
          clearCoveCache();
          setCurrentView('login');
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      await clearCoveCache();
      setUser(null);
      setCurrentView('login');
      showToast('info', 'Signed Out', 'You have been signed out from Cove.');
    } catch (err: any) {
      console.error('Sign out error:', err);
      showToast('error', 'Sign Out Error', err.message || 'Failed to sign out.');
    }
  };

  const handleSignUpSuccess = (registeredEmail: string) => {
    setPendingEmail(registeredEmail);
    setCurrentView('verification_pending');
  };

  const handleVerificationNeeded = (emailAddress: string) => {
    setPendingEmail(emailAddress);
    setCurrentView('verification_pending');
  };

  const handleVerified = () => {
    setCurrentView('dashboard');
  };

  if (initializing) {
    const isGoogleAuth = typeof window !== 'undefined' && sessionStorage.getItem('cove_oauth_in_progress') === 'google';
    return (
      <CalmBackground>
        <div className="flex flex-col items-center justify-center space-y-4">
          <CoveLogo size="lg" />
          <div className="flex items-center gap-2 text-[#0EA5E9] text-sm font-medium">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>{isGoogleAuth ? 'Verifying Google account...' : 'Connecting to Cove...'}</span>
          </div>
        </div>
      </CalmBackground>
    );
  }

  if (currentView === 'dashboard' && user) {
    return (
      <div className="w-full h-screen min-h-[100dvh] bg-slate-50 font-sans overflow-hidden">
        <NotificationToast toast={toast} onClose={() => setToast(null)} />
        <DashboardView
          key="dashboard"
          user={user}
          onSignOut={handleSignOut}
          showToast={showToast}
        />
      </div>
    );
  }

  return (
    <CalmBackground>
      {/* Toast Alert Notifications */}
      <NotificationToast toast={toast} onClose={() => setToast(null)} />

      {/* Auth Screen Views */}
      <div className="w-full flex-1 flex flex-col items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {currentView === 'login' && (
            <LoginView
              key="login"
              onNavigate={setCurrentView}
              onLoginSuccess={() => setCurrentView('dashboard')}
              onVerificationNeeded={handleVerificationNeeded}
              showToast={showToast}
            />
          )}

          {currentView === 'signup' && (
            <SignUpView
              key="signup"
              onNavigate={setCurrentView}
              onSignUpSuccess={handleSignUpSuccess}
              showToast={showToast}
            />
          )}

          {currentView === 'verification_pending' && (
            <VerificationPendingView
              key="verification_pending"
              email={pendingEmail}
              onNavigate={setCurrentView}
              onVerified={handleVerified}
              showToast={showToast}
            />
          )}

          {currentView === 'forgot_password' && (
            <ForgotPasswordView
              key="forgot_password"
              onNavigate={setCurrentView}
              showToast={showToast}
            />
          )}
        </AnimatePresence>

        <div className="mt-8 text-center text-slate-400 text-[11px] font-mono">
          <span>Cove Auth &bull; Powered by Supabase</span>
        </div>
      </div>
    </CalmBackground>
  );

}
