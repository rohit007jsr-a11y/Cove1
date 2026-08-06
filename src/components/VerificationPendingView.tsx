import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Mail, CheckCircle2, RefreshCw, ArrowLeft, Inbox, AlertCircle, Edit3 } from 'lucide-react';
import { CoveLogo } from './CoveLogo';
import { supabase, formatAuthError } from '../lib/supabase';
import { AuthView } from '../types';

interface VerificationPendingViewProps {
  email: string;
  onNavigate: (view: AuthView) => void;
  onVerified: () => void;
  showToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const VerificationPendingView: React.FC<VerificationPendingViewProps> = ({
  email,
  onNavigate,
  onVerified,
  showToast,
}) => {
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Countdown timer effect
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Resend verification email via Supabase
  const handleResendEmail = async () => {
    if (resendCooldown > 0 || isResending) return;

    if (!email) {
      showToast('error', 'Missing Email', 'No email address found to resend to.');
      return;
    }

    setIsResending(true);
    setStatusMessage(null);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      showToast('success', 'Email Sent', `A new verification link was sent to ${email}.`);
      setStatusMessage('Verification link resent successfully! Please check your inbox.');
      setResendCooldown(45); // 45 seconds cooldown
    } catch (err: any) {
      console.error('Resend email error:', err);
      const formatted = formatAuthError(err);
      showToast('error', 'Resend Failed', formatted);
      setStatusMessage(formatted);
    } finally {
      setIsResending(false);
    }
  };

  // Check if user has confirmed email by querying Supabase session
  const handleCheckStatus = async () => {
    setIsChecking(true);
    setStatusMessage(null);

    try {
      // Force refresh user session from Supabase server
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) throw error;

      if (user && user.email_confirmed_at) {
        showToast('success', 'Email Verified!', 'Your email has been confirmed. Welcome to Cove.');
        onVerified();
      } else {
        showToast(
          'info',
          'Not Verified Yet',
          'We haven\'t detected your email verification yet. Please click the link in your inbox.'
        );
        setStatusMessage('Email is still pending verification. Please click the link sent to your inbox.');
      }
    } catch (err: any) {
      console.error('Check status error:', err);
      showToast('info', 'Status Check', 'Please verify your email via the link sent to your inbox.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="bg-white border border-[#E2E8F0] rounded-[12px] p-6 sm:p-8 shadow-md text-center">
        {/* Animated Mail Graphic */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center border border-sky-100 relative overflow-hidden">
            <Mail className="w-8 h-8 text-[#0EA5E9] relative z-10" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#0EA5E9] rounded-full flex items-center justify-center text-white shadow-sm">
            <RefreshCw className="w-3 h-3 animate-spin duration-1000" />
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-[#0F172A] tracking-tight mb-2">
          Verify your email
        </h1>

        <p className="text-[#64748B] text-sm leading-relaxed mb-4">
          We've sent a verification link to:
        </p>

        {/* Email Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#F7FAFC] border border-[#E2E8F0] rounded-lg text-[#0EA5E9] font-mono text-xs max-w-full truncate mb-6 shadow-sm">
          <Inbox className="w-4 h-4 shrink-0 text-[#0EA5E9]" />
          <span className="truncate font-semibold">{email || 'your email address'}</span>
        </div>

        {statusMessage && (
          <div className="mb-6 p-3 rounded-lg bg-sky-50 border border-sky-100 text-[#0F172A] text-xs text-left flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#0EA5E9] shrink-0 mt-0.5" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Primary Actions */}
        <div className="space-y-3">
          {/* Check Verification Status */}
          <button
            onClick={handleCheckStatus}
            disabled={isChecking}
            className="w-full py-2.5 px-4 bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-semibold text-sm rounded-lg shadow-sm focus:outline-none transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isChecking ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>I've Verified My Email</span>
          </button>

          {/* Resend Email Button with Cooldown */}
          <button
            onClick={handleResendEmail}
            disabled={resendCooldown > 0 || isResending}
            className="w-full py-2 px-4 bg-white hover:bg-slate-50 border border-[#E2E8F0] text-[#0F172A] font-semibold text-xs rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
            {resendCooldown > 0
              ? `Resend available in ${resendCooldown}s`
              : 'Resend Verification Email'}
          </button>
        </div>

        {/* Spam folder & trouble tips */}
        <div className="mt-6 p-4 rounded-lg bg-[#F7FAFC] border border-[#E2E8F0] text-left">
          <h4 className="text-xs font-semibold text-[#0F172A] mb-1 flex items-center gap-1.5">
            <span>Haven't received it yet?</span>
          </h4>
          <ul className="text-[11px] text-[#64748B] space-y-1.5 pl-4 list-disc marker:text-[#0EA5E9]">
            <li>Check your <strong>Spam</strong> or <strong>Junk</strong> folder.</li>
            <li>Verification links expire after 24 hours.</li>
            <li>Make sure <code>{email}</code> was spelled correctly.</li>
          </ul>
        </div>

        {/* Back / Edit links */}
        <div className="mt-6 flex items-center justify-between border-t border-[#E2E8F0] pt-4 text-xs">
          <button
            onClick={() => onNavigate('signup')}
            className="text-[#64748B] hover:text-[#0F172A] transition-colors flex items-center gap-1 font-medium"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Change email</span>
          </button>

          <button
            onClick={() => onNavigate('login')}
            className="text-[#0EA5E9] hover:text-[#0284C7] transition-colors flex items-center gap-1 font-bold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Log In</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
