import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'slate';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
}) => {
  const baseStyle = "inline-flex items-center justify-center font-sans font-bold uppercase tracking-wider rounded-md whitespace-nowrap select-none leading-none";

  const variants = {
    primary: "bg-sky-100 text-sky-700 border border-sky-200/50",
    success: "bg-emerald-100 text-emerald-800 border border-emerald-200/50",
    warning: "bg-amber-100 text-amber-800 border border-amber-200/50",
    danger: "bg-rose-100 text-rose-800 border border-rose-200/50",
    slate: "bg-slate-100 text-slate-600 border border-slate-200",
  };

  const sizes = {
    sm: "px-1.5 py-0.5 text-[9px]",
    md: "px-2.5 py-1 text-[10px]",
  };

  return (
    <span className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
};
