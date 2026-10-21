import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronRight, ChevronLeft, Clock, Check } from 'lucide-react';
import { toFa, toEn, padFa, getTodayShamsi, jalaliMonthLength } from '../utils/jalali';

interface ShamsiDatePickerProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const SHAMSI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

const WEEK_DAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

export const ShamsiDatePicker: React.FC<ShamsiDatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = '۱۴۰۵/۰۷/۱۵',
  className = '',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial year/month/day
  const today = getTodayShamsi();
  const parseVal = (strVal: string) => {
    if (!strVal) return { y: Number(toEn(today.year)), m: Number(toEn(today.month)), d: Number(toEn(today.day)) };
    const parts = toEn(strVal).split('/').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return { y: parts[0], m: parts[1], d: parts[2] };
    }
    return { y: Number(toEn(today.year)), m: Number(toEn(today.month)), d: Number(toEn(today.day)) };
  };

  const parsed = parseVal(value);
  const [viewYear, setViewYear] = useState<number>(parsed.y);
  const [viewMonth, setViewMonth] = useState<number>(parsed.m);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewYear(prev => prev - 1);
      setViewMonth(12);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewYear(prev => prev + 1);
      setViewMonth(1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const formatted = `${toFa(viewYear)}/${padFa(viewMonth)}/${padFa(day)}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    const formatted = `${today.year}/${today.month}/${today.day}`;
    onChange(formatted);
    setViewYear(Number(toEn(today.year)));
    setViewMonth(Number(toEn(today.month)));
    setIsOpen(false);
  };

  const daysCount = jalaliMonthLength(viewYear, viewMonth);
  const daysArray = Array.from({ length: daysCount }, (_, i) => i + 1);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 mb-1">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#13213c] bg-white font-mono text-slate-800 disabled:bg-slate-100 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(prev => !prev)}
          className="absolute left-1.5 p-1 rounded-md text-slate-500 hover:text-[#13213c] hover:bg-slate-100 transition-colors cursor-pointer disabled:cursor-not-allowed"
          title="باز کردن تقویم شمسی"
        >
          <Calendar className="w-4 h-4 text-amber-600" />
        </button>
      </div>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-150 select-none">
          {/* Calendar Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
              title="ماه بعد"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="text-xs font-black text-[#13213c]">
              <span>{SHAMSI_MONTHS[viewMonth - 1]}</span>
              <span className="mr-1 text-amber-600 font-mono">{toFa(viewYear)}</span>
            </div>

            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
              title="ماه قبل"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-1">
            {WEEK_DAYS.map((wd, idx) => (
              <div key={idx} className={idx === 6 ? 'text-rose-500' : ''}>{wd}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-xs">
            {daysArray.map(d => {
              const isSelected = parsed.y === viewYear && parsed.m === viewMonth && parsed.d === d;
              const isToday = Number(toEn(today.year)) === viewYear && Number(toEn(today.month)) === viewMonth && Number(toEn(today.day)) === d;

              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleSelectDay(d)}
                  className={`h-7 w-7 rounded-lg flex items-center justify-center font-mono text-[11px] font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#13213c] text-white font-bold shadow-xs'
                      : isToday
                      ? 'border border-amber-500 text-amber-800 bg-amber-50 font-bold'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {toFa(d)}
                </button>
              );
            })}
          </div>

          {/* Bottom Actions */}
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={handleSelectToday}
              className="text-amber-700 hover:text-amber-900 font-bold px-2 py-0.5 rounded hover:bg-amber-50 cursor-pointer"
            >
              انتخاب امروز ({today.day} {SHAMSI_MONTHS[Number(toEn(today.month)) - 1]})
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 px-2 py-0.5 cursor-pointer"
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
