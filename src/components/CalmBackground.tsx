import React from 'react';

export const CalmBackground: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div className="relative min-h-screen w-full bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans selection:bg-sky-500/20 selection:text-sky-700 overflow-x-hidden">
      {/* Soft ambient gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-sky-50/50 via-transparent to-slate-100/50 z-0" />

      {/* Main Content Container */}
      <div className="relative z-10 flex-1 flex flex-col w-full">
        {children}
      </div>
    </div>
  );
};


