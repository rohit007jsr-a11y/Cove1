import React from 'react';
import { MessageSquare } from 'lucide-react';

interface CoveLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export const CoveLogo: React.FC<CoveLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
}) => {
  const sizeMap = {
    sm: 'w-6 h-6 text-sky-500',
    md: 'w-8 h-8 text-sky-500',
    lg: 'w-10 h-10 text-sky-500',
  };

  const textMap = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <MessageSquare className={`${sizeMap[size]} shrink-0`} strokeWidth={2.5} />
      {showText && (
        <span className={`font-bold tracking-tight text-[#0F172A] font-sans ${textMap[size]}`}>
          Cove
        </span>
      )}
    </div>
  );
};

