import React from 'react';

export const CalmBackground: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div className="relative min-h-screen w-full bg-[#F7FAFC] text-[#0F172A] flex flex-col justify-between overflow-hidden font-sans selection:bg-[#0EA5E9]/20 selection:text-[#0284C7]">
      {/* Top background accent bar, similar to WhatsApp Web's top band */}
      <div className="absolute top-0 left-0 w-full h-[220px] bg-[#0EA5E9] z-0" />

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        {children}
      </div>
    </div>
  );
};

