import React from 'react';
import { motion } from 'motion/react';
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-screen min-h-[100dvh] flex flex-col bg-slate-50 overflow-hidden"
    >
      <MessagesView
        user={user}
        onSignOut={onSignOut}
        showToast={showToast}
      />
    </motion.div>
  );
};

