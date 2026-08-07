import React, { forwardRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className = '', variant = 'primary', size = 'md', isLoading = false, disabled, ...props }, ref) => {
    const prefersReduced = useReducedMotion();

    // 1. Map variant classes
    const baseStyle = "inline-flex items-center justify-center font-sans font-semibold rounded-xl border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 cursor-pointer select-none disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap";
    
    const variants = {
      primary: "bg-[#0EA5E9] hover:bg-[#0284C7] active:bg-[#0369A1] text-white border-transparent shadow-xs",
      secondary: "bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 border-slate-200/50",
      outline: "bg-transparent hover:bg-slate-50 active:bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-300",
      destructive: "bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white border-transparent shadow-xs",
      ghost: "bg-transparent hover:bg-slate-50 text-slate-500 hover:text-slate-700 border-transparent",
    };

    // 2. Map size padding & heights (Following strict Button vertical-to-horizontal proportions of 1:2)
    const sizes = {
      sm: "h-9 px-4.5 text-xs rounded-lg gap-1.5",
      md: "h-11 px-6 text-sm rounded-xl gap-2",
      lg: "h-13 px-8 text-base rounded-xl gap-2.5",
    };

    const combinedClasses = `${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`;

    // Micro-press interaction with custom spring physics
    const scaleValue = prefersReduced || disabled || isLoading ? 1 : 0.97;

    return (
      <motion.button
        ref={ref as any}
        whileTap={{ scale: scaleValue }}
        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
        disabled={disabled || isLoading}
        className={combinedClasses}
        {...props}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <svg className="animate-spin h-4.5 w-4.5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Please wait...</span>
          </div>
        ) : (
          children
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
