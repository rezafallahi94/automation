import React from 'react';

interface RaboLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'compact' | 'emblem';
  textColor?: 'dark' | 'light';
  className?: string;
}

export const RaboLogo: React.FC<RaboLogoProps> = ({
  size = 'md',
  variant = 'full',
  textColor = 'dark',
  className = ''
}) => {
  const getEmblemSize = () => {
    switch (size) {
      case 'sm': return 'w-8 h-8';
      case 'md': return 'w-10 h-10';
      case 'lg': return 'w-14 h-14';
      case 'xl': return 'w-20 h-20';
    }
  };

  const getTitleSize = () => {
    switch (size) {
      case 'sm': return 'text-xs font-bold';
      case 'md': return 'text-sm font-black';
      case 'lg': return 'text-base font-black';
      case 'xl': return 'text-xl font-black';
    }
  };

  const getSubtitleSize = () => {
    switch (size) {
      case 'sm': return 'text-[9px] font-bold';
      case 'md': return 'text-[10px] font-bold';
      case 'lg': return 'text-xs font-bold';
      case 'xl': return 'text-sm font-bold';
    }
  };

  const isLight = textColor === 'light';

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* نشان رسمی و اصیل مهندسی رابو بارگذاری شده توسط کاربر با فرمت SVG */}
      <div className={`relative shrink-0 rounded-xl overflow-hidden shadow-2xs flex items-center justify-center bg-white p-1 border border-amber-400/30 ${getEmblemSize()}`}>
        <img 
          src="/Logo.svg" 
          alt="شرکت مهندسی رهنمون کیفیت رابو" 
          className="w-full h-full object-contain"
          onError={(e) => {
            // Fallback if image fails to load
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>

      {/* تایپوگرافی رسمی فارسی */}
      {variant !== 'emblem' && (
        <div className="flex flex-col justify-center leading-tight">
          <div className="flex items-center gap-1.5">
            <span className={`${getTitleSize()} tracking-tight ${isLight ? 'text-white' : 'text-[#13213c]'}`}>
              مهندسی رابو
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-500 border border-amber-500/30">
              تضمین کیفیت
            </span>
          </div>
          {variant === 'full' && (
            <span className={`${getSubtitleSize()} ${isLight ? 'text-amber-400/90' : 'text-amber-700'} tracking-normal mt-0.5 font-semibold`}>
              رهنمون کیفیت و مدیریت یکپارچه
            </span>
          )}
        </div>
      )}
    </div>
  );
};
