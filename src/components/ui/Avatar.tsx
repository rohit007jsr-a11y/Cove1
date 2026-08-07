import React from 'react';

export interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'Avatar',
  name = '',
  size = 'md',
  isOnline = false,
  className = '',
}) => {
  // Size specifications
  const sizes = {
    xs: 'w-6 h-6 text-[10px] font-bold',
    sm: 'w-8 h-8 text-xs font-semibold',
    md: 'w-10 h-10 text-sm font-semibold',
    lg: 'w-14 h-14 text-base font-bold',
    xl: 'w-20 h-20 text-xl font-bold',
  };

  // Status indicator sizes
  const indicatorSizes = {
    xs: 'w-2 h-2',
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-4 h-4 border-2',
    xl: 'w-5 h-5 border-2',
  };

  const getInitials = (fullName: string) => {
    if (!fullName) return '?';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return fullName.slice(0, 2).toUpperCase();
  };

  return (
    <div className={`relative inline-block select-none shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          className={`object-cover rounded-full border border-slate-200/40 shadow-2xs ${sizes[size]}`}
          onError={(e) => {
            // If image fails to load, fallback to plain initials
            (e.target as HTMLImageElement).style.display = 'none';
            const sibling = (e.target as HTMLImageElement).nextElementSibling as HTMLDivElement;
            if (sibling) sibling.style.display = 'flex';
          }}
        />
      ) : null}

      {/* Fallback Initials Div */}
      <div
        className={`flex items-center justify-center rounded-full bg-gradient-to-tr from-sky-400 to-sky-600 text-white shadow-3xs uppercase ${sizes[size]}`}
        style={{ display: src ? 'none' : 'flex' }}
      >
        {getInitials(name || alt)}
      </div>

      {/* Online indicator dot */}
      {isOnline && (
        <span
          className={`absolute bottom-0 right-0 rounded-full bg-emerald-500 border border-white shadow-2xs ${indicatorSizes[size]}`}
          title="Online"
        />
      )}
    </div>
  );
};
