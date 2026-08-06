import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, LogOut } from 'lucide-react';
import { CoveLogo } from './CoveLogo';
import { MessagesView } from './MessagesView';
import { UserProfile } from '../types';

interface DashboardViewProps {
  user: UserProfile;
  onSignOut: () => void;
  showToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  onSignOut,
  showToast,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="w-full flex flex-col space-y-4"
    >
      {/* Centered Desktop-First Top Header */}
      <div className="w-full max-w-6xl mx-auto bg-white border border-[#E2E8F0] rounded-xl px-5 py-3 flex items-center justify-between shadow-sm select-none">
        <CoveLogo size="sm" />

        <div className="flex items-center gap-4 text-xs font-semibold text-[#64748B]">
          <div className="hidden sm:flex items-center gap-1.5 bg-[#F7FAFC] border border-[#E2E8F0] px-3 py-1.5 rounded-lg">
            <ShieldCheck className="w-4 h-4 text-[#22C55E]" strokeWidth={2.5} />
            <span className="text-[#0F172A] uppercase tracking-wider text-[10px]">Secure Portal</span>
          </div>

          <button
            onClick={onSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E2E8F0] hover:bg-red-50 hover:text-red-600 hover:border-red-100 rounded-lg transition-colors text-[#0F172A]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Messaging dual-panel workspace */}
      <MessagesView
        user={user}
        onSignOut={onSignOut}
        showToast={showToast}
      />
    </motion.div>
  );
};
