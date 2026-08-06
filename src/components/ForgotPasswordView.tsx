import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, ArrowLeft, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { CoveLogo } from './CoveLogo';
import { supabase } from '../lib/supabase';
import { AuthView } from '../types';

interface ForgotPasswordViewProps {
  onNavigate: (view: AuthView) => void;
  showToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const ForgotPasswordView: React.FC<ForgotPasswordViewProps> = ({
  onNavigate,
  showToast,
}) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}`,
      });

      if (error) throw error;

      setSent(true);
      showToast('success', 'Reset Link Sent', `Password reset instructions sent to ${email}`);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setErrorMessage(err.message || 'Failed to send reset link.');
      showToast('error', 'Reset Failed', err.message || 'Could not process password reset.');
    } finally {
      setLoading(false);
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
      <div className="bg-white border border-[#E2E8F0] rounded-[12px] p-6 sm:p-8 shadow-md">
        <div className="text-center mb-8">
          <div className="inline-block mb-3">
            <CoveLogo size="md" />
          </div>
          <h1 className="text-2xl font-semibold text-[#0F172A] tracking-tight">
            Reset Password
          </h1>
          <p className="text-[#64748B] text-sm mt-1">
            Enter your email to receive a recovery link
          </p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 bg-sky-50 border border-sky-100 text-[#0EA5E9] rounded-xl flex items-center justify-center mx-auto bg-sky-50">
              <CheckCircle2 className="w-6 h-6 text-[#0EA5E9]" />
            </div>
            <h3 className="text-lg font-semibold text-[#0F172A]">Check your inbox</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              We sent password reset instructions to <span className="font-mono text-[#0EA5E9] font-semibold">{email}</span>.
            </p>
            <button
              onClick={() => onNavigate('login')}
              className="mt-4 w-full py-2 bg-slate-100 hover:bg-slate-200 text-[#0F172A] font-semibold text-xs rounded-lg transition-all"
            >
              Return to Log In
            </button>
          </div>
        ) : (
          <>
            {errorMessage && (
              <div className="mb-6 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5 uppercase tracking-wide">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm placeholder-[#64748B] focus:outline-none focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9] transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-semibold text-sm rounded-lg shadow-sm focus:outline-none transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Send Recovery Link</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center border-t border-[#E2E8F0] pt-5">
              <button
                onClick={() => onNavigate('login')}
                className="text-xs text-[#64748B] hover:text-[#0F172A] transition-colors inline-flex items-center gap-1.5 font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Log In</span>
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};
