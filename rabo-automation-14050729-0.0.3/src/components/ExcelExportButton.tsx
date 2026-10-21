import React, { useState, useRef, useEffect } from 'react';
import { FileSpreadsheet, ChevronDown, Download, Check } from 'lucide-react';

interface ExcelExportButtonProps {
  onExportFiltered: () => void;
  onExportFull: () => void;
  filteredCount: number;
  totalCount: number;
  entityName: string; // e.g. "پروژه‌ها" or "پرسنل"
  className?: string;
}

export const ExcelExportButton: React.FC<ExcelExportButtonProps> = ({
  onExportFiltered,
  onExportFull,
  filteredCount,
  totalCount,
  entityName,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [justDownloaded, setJustDownloaded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isFiltered = filteredCount < totalCount;

  // بستن منو با کلیک در بیرون
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleFilteredClick = () => {
    onExportFiltered();
    setIsOpen(false);
    triggerSuccessAnimation();
  };

  const handleFullClick = () => {
    onExportFull();
    setIsOpen(false);
    triggerSuccessAnimation();
  };

  const triggerSuccessAnimation = () => {
    setJustDownloaded(true);
    setTimeout(() => {
      setJustDownloaded(false);
    }, 2500);
  };

  return (
    <div className={`relative inline-block text-right ${className}`} ref={dropdownRef}>
      {/* دکمه اصلی دو بخشی: کلیک روی بدنه یا کلیک روی فلش منو */}
      <div className="inline-flex items-center rounded-lg shadow-2xs border border-emerald-600 overflow-hidden bg-emerald-700 hover:bg-emerald-800 text-white transition-all">
        <button
          type="button"
          onClick={() => {
            if (isFiltered) {
              setIsOpen(prev => !prev);
            } else {
              handleFullClick();
            }
          }}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold cursor-pointer transition-colors"
          title={`خروجی اکسل از ${entityName}`}
        >
          {justDownloaded ? (
            <Check className="w-4 h-4 text-emerald-200 animate-bounce" />
          ) : (
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
          )}
          <span>خروجی اکسل</span>
          {isFiltered && (
            <span className="bg-emerald-800/90 text-emerald-100 text-[10px] px-1.5 py-0.2 rounded font-mono">
              {filteredCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          className="px-1.5 py-2 border-r border-emerald-600/70 hover:bg-emerald-600/60 cursor-pointer text-emerald-200"
          title="گزینه‌های دانلود اکسل"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* منوی گزینه‌های خروجی */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-right animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-bold text-slate-500">
            انتخاب نوع گزارش اکسل (XLSX):
          </div>

          <button
            type="button"
            onClick={handleFilteredClick}
            className="w-full px-3 py-2 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 flex items-center justify-between gap-2 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <Download className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="font-bold">لیست فیلترشده فعلی</span>
            </div>
            <span className="bg-emerald-100 text-emerald-800 font-mono text-[10px] px-2 py-0.5 rounded-full font-bold">
              {filteredCount} سطر
            </span>
          </button>

          <button
            type="button"
            onClick={handleFullClick}
            className="w-full px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 flex items-center justify-between gap-2 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>کل داده‌های پایگاه ({entityName})</span>
            </div>
            <span className="bg-slate-100 text-slate-600 font-mono text-[10px] px-2 py-0.5 rounded-full font-bold">
              {totalCount} سطر
            </span>
          </button>

          <div className="px-3 pt-1.5 mt-1 border-t border-slate-100 text-[10px] text-slate-400">
            فایل با فرمت استاندارد XLSX و پشتیبانی راست‌به‌چپ (RTL) ذخیره می‌شود.
          </div>
        </div>
      )}
    </div>
  );
};
