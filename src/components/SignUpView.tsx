import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Check, AlertCircle } from 'lucide-react';
import { CoveLogo } from './CoveLogo';
import { supabase } from '../lib/supabase';
import { AuthView } from '../types';

interface SignUpViewProps {
  onNavigate: (view: AuthView) => void;
  onSignUpSuccess: (email: string) => void;
  showToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const SignUpView: React.FC<SignUpViewProps> = ({
  onNavigate,
  onSignUpSuccess,
  showToast,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Calculate password strength
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-700' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    if (score === 2 || score === 3) return { score: 2, label: 'Moderate', color: 'bg-amber-500' };
    return { score: 3, label: 'Strong', color: 'bg-teal-400' };
  };

  const strength = getPasswordStrength(password);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        if (error.message.includes('Error sending confirmation email') || error.message.includes('rate limit')) {
           throw new Error('Supabase email limit reached. Please disable "Confirm email" in your Supabase Authentication -> Providers -> Email settings, or configure a custom SMTP server.');
        }
        throw error;
      }

      showToast(
        'success',
        'Account Created',
        'Verification email sent. Please check your inbox to confirm.'
      );

      // Trigger navigation to Verification Pending screen with the registered email
      onSignUpSuccess(email);
    } catch (err: any) {
      console.error('Sign up error:', err);
      setErrorMessage(err.message || 'Failed to create account. Please try again.');
      showToast('error', 'Sign Up Failed', err.message || 'An error occurred during registration.');
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
            Create an Account
          </h1>
          <p className="text-[#64748B] text-sm mt-1">
            Sign up to start messaging on Cove
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5 uppercase tracking-wide">
              Full Name <span className="text-[#64748B] font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Maya Lin"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm placeholder-[#64748B] focus:outline-none focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9] transition-all"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5 uppercase tracking-wide">
              Email Address <span className="text-[#0EA5E9]">*</span>
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
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5 uppercase tracking-wide">
              Password <span className="text-[#0EA5E9]">*</span>
            </label>
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

            {/* Password strength meter */}
            {password && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1 bg-[#E2E8F0] rounded-full overflow-hidden flex gap-1">
                  <div
                    className={`h-full transition-all duration-300 ${
                      strength.score >= 1 ? strength.color : 'bg-[#E2E8F0]'
                    } w-1/3`}
                  />
                  <div
                    className={`h-full transition-all duration-300 ${
                      strength.score >= 2 ? strength.color : 'bg-[#E2E8F0]'
                    } w-1/3`}
                  />
                  <div
                    className={`h-full transition-all duration-300 ${
                      strength.score >= 3 ? (strength.color === 'bg-teal-400' ? 'bg-emerald-500' : strength.color) : 'bg-[#E2E8F0]'
                    } w-1/3`}
                  />
                </div>
                <span className="text-[10px] text-[#64748B] font-semibold">
                  {strength.label === 'Strong' ? 'Strong' : strength.label}
                </span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5 uppercase tracking-wide">
              Confirm Password <span className="text-[#0EA5E9]">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm placeholder-[#64748B] focus:outline-none focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9] transition-all"
              />
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-[11px] text-red-500 mt-1">Passwords do not match</p>
            )}
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
                <span>Create Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-[#E2E8F0] pt-5">
          <p className="text-xs text-[#64748B]">
            Already have an account?{' '}
            <button
              onClick={() => onNavigate('login')}
              className="text-[#0EA5E9] hover:text-[#0284C7] font-semibold underline underline-offset-4 ml-1 transition-colors"
            >
              Log in
            </button>
          </p>
        </div>
      </div>
    </motion.div>
  );
};
