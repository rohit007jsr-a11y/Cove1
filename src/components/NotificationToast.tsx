import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { ToastMessage } from '../types';

interface NotificationToastProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ toast, onClose }) => {
  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
    info: <Info className="w-5 h-5 text-sky-500 shrink-0" />,
  };

  const borders = {
    success: 'border-emerald-200 bg-white text-[#0F172A]',
    error: 'border-rose-200 bg-white text-[#0F172A]',
    info: 'border-sky-200 bg-white text-[#0F172A]',
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -24, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.94 }}
        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
        className={`fixed top-5 right-5 z-50 max-w-md w-full p-4 rounded-xl border shadow-xl flex items-start gap-3 ${borders[toast.type]}`}
      >
        {icons[toast.type]}
        <div className="flex-1 pr-2">
          <h4 className="font-semibold text-sm text-[#0F172A]">{toast.title}</h4>
          {toast.message && (
            <p className="text-xs text-[#64748B] mt-1 leading-relaxed">{toast.message}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-[#64748B] hover:text-[#0F172A] transition-colors p-1 rounded-lg hover:bg-slate-50"
        >
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
