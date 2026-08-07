import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className = '', disabled, id, ...props }, ref) => {
    
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="flex flex-col space-y-1.5 w-full font-sans text-left">
        {label && (
          <label 
            htmlFor={inputId} 
            className="text-[13px] font-bold text-slate-500 tracking-wide uppercase select-none"
          >
            {label}
          </label>
        )}
        
        <div className="relative flex items-center w-full">
          {icon && (
            <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center justify-center">
              {icon}
            </div>
          )}
          
          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            className={`
              w-full h-11 text-sm bg-white text-slate-800 placeholder-slate-300 rounded-xl border
              focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all duration-150
              disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed
              ${icon ? 'pl-11' : 'pl-4'}
              pr-4
              ${
                error 
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' 
                  : 'border-slate-200 hover:border-slate-300 focus:border-[#0EA5E9] focus:ring-[#0EA5E9]/20'
              }
              ${className}
            `}
            {...props}
          />
        </div>

        {error ? (
          <p className="text-xs font-semibold text-rose-500 flex items-center gap-1.5 animate-tick-pop">
            <span className="w-1 h-1 rounded-full bg-rose-500" />
            <span>{error}</span>
          </p>
        ) : helperText ? (
          <p className="text-xs text-slate-400 leading-normal">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
