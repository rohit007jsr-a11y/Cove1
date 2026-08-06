import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, Sparkles } from 'lucide-react';
import { CoveLogo } from './CoveLogo';
import { supabase } from '../lib/supabase';
import { AuthView } from '../types';

interface LoginViewProps {
  onNavigate: (view: AuthView) => void;
  onLoginSuccess: () => void;
  onVerificationNeeded: (email: string) => void;
  showToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onNavigate,
  onLoginSuccess,
  onVerificationNeeded,
  showToast,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Handle unconfirmed email case
        if (
          error.message.toLowerCase().includes('email not confirmed') ||
          error.message.toLowerCase().includes('email verification')
        ) {
          showToast(
            'info',
            'Email Verification Required',
            'Please verify your email address before logging in.'
          );
          onVerificationNeeded(email);
          return;
        }
        throw error;
      }

      if (data.user && !data.user.email_confirmed_at) {
        // If email confirmation is enabled in project settings and user hasn't confirmed
        showToast('info', 'Verification Pending', 'Please confirm your email address.');
        onVerificationNeeded(email);
        return;
      }

      showToast('success', 'Welcome back', 'Successfully logged into Cove.');
      onLoginSuccess();
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMessage(err.message || 'Invalid email or password.');
      showToast('error', 'Login Failed', err.message || 'Invalid login credentials.');
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
            Welcome back
          </h1>
          <p className="text-[#64748B] text-sm mt-1">
            Sign in to your Cove account
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
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

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#0F172A] uppercase tracking-wide">
                Password
              </label>
              <button
                type="button"
                onClick={() => onNavigate('forgot_password')}
                className="text-xs text-[#0EA5E9] hover:text-[#0284C7] font-medium transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm placeholder-[#64748B] focus:outline-none focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-semibold text-sm rounded-lg shadow-sm focus:outline-none transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <LogIn className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-[#E2E8F0] pt-5">
          <p className="text-xs text-[#64748B]">
            Don't have an account yet?{' '}
            <button
              onClick={() => onNavigate('signup')}
              className="text-[#0EA5E9] hover:text-[#0284C7] font-semibold underline underline-offset-4 ml-1 transition-colors"
            >
              Sign up
            </button>
          </p>
        </div>
      </div>
    </motion.div>
  );
};
