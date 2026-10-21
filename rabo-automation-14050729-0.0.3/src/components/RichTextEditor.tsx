import React, { useRef, useEffect, useState } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  AlignRight, 
  AlignCenter, 
  AlignLeft, 
  AlignJustify, 
  List, 
  ListOrdered, 
  Table, 
  Type, 
  Undo, 
  Redo, 
  Sparkles, 
  Maximize2, 
  Minimize2,
  Highlighter,
  Palette,
  Indent,
  Outdent,
  RemoveFormatting,
  Quote
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (htmlContent: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const FONTS = [
  { id: 'IRANSans, sans-serif', label: 'ایران‌سنس (استاندارد رابو)' },
  { id: "'B Nazanin', Tahoma, sans-serif", label: 'بی‌نازنین (مکاتبات رسمی)' },
  { id: "'B Titr', sans-serif", label: 'بی‌تیتر (عناوین و سرفصل‌ها)' },
  { id: "'B Yekan', Tahoma, sans-serif", label: 'بی‌یکان (مدرن اداری)' },
  { id: 'Tahoma, sans-serif', label: 'تاهوما (Tahoma)' },
  { id: 'Arial, sans-serif', label: 'آریال (Arial)' }
];

const FONT_SIZES = [
  { val: '1', label: '۱۰ (ریز)' },
  { val: '2', label: '۱۱ (متوسط)' },
  { val: '3', label: '۱۲ (استاندارد متن نامه)' },
  { val: '4', label: '۱۴ (نیمه‌درشت)' },
  { val: '5', label: '۱۶ (سرفصل / تیتر)' },
  { val: '6', label: '۱۸ (درشت ویژه)' }
];

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'متن رسمی نامه را اینجا تایپ یا ویرایش فرمایید...',
  minHeight = '300px'
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedFont, setSelectedFont] = useState(FONTS[0].id);
  const [selectedFontSize, setSelectedFontSize] = useState('3');
  const [wordCount, setWordCount] = useState(0);

  // Sync incoming value to innerHTML when not focused
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      if (document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = value || '';
        updateWordCount(value || '');
      }
    }
  }, [value]);

  const updateWordCount = (html: string) => {
    const text = html.replace(/<[^>]*>/g, ' ').trim();
    const words = text ? text.split(/\s+/).filter(Boolean) : [];
    setWordCount(words.length);
  };

  const handleInput = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    onChange(html);
    updateWordCount(html);
  };

  const execCmd = (cmd: string, val: string | undefined = undefined) => {
    document.execCommand(cmd, false, val);
    if (editorRef.current) {
      editorRef.current.focus();
      handleInput();
    }
  };

  const insertTable = () => {
    const tableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0; border: 1.5px solid #13213c;">
        <thead>
          <tr style="background-color: #f1f5f9; color: #13213c;">
            <th style="border: 1px solid #13213c; padding: 8px; width: 10%;">ردیف</th>
            <th style="border: 1px solid #13213c; padding: 8px;">شرح خدمات / مشخصات فنی</th>
            <th style="border: 1px solid #13213c; padding: 8px; width: 25%;">مبلغ / مدت</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">۱</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">شرح بند اول خدمات مهندسی</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">توافقی</td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">۲</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">شرح بند دوم خدمات مهندسی</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">توافقی</td>
          </tr>
        </tbody>
      </table>
      <p></p>
    `;
    execCmd('insertHTML', tableHtml);
  };

  const insertClause = (clause: string) => {
    execCmd('insertHTML', `<p style="margin: 8px 0; line-height: 1.9;">${clause}</p>`);
  };

  return (
    <div className={`bg-white border border-slate-300 rounded-xl overflow-hidden shadow-xs flex flex-col transition-all ${
      isFullscreen ? 'fixed inset-4 z-50 shadow-2xl border-2 border-[#13213c]' : ''
    }`}>
      {/* Top Toolbar */}
      <div className="bg-slate-100/90 border-b border-slate-300 p-2 flex flex-wrap items-center gap-1 text-xs select-none">
        {/* Font Family */}
        <select
          value={selectedFont}
          onChange={e => {
            setSelectedFont(e.target.value);
            execCmd('fontName', e.target.value);
          }}
          className="text-xs p-1.5 border border-slate-300 rounded-lg bg-white font-medium outline-none"
          title="فونت نگارش نامه"
        >
          {FONTS.map(f => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>

        {/* Font Size */}
        <select
          value={selectedFontSize}
          onChange={e => {
            setSelectedFontSize(e.target.value);
            execCmd('fontSize', e.target.value);
          }}
          className="text-xs p-1.5 border border-slate-300 rounded-lg bg-white font-medium outline-none w-24"
          title="سایز فونت"
        >
          {FONT_SIZES.map(s => (
            <option key={s.val} value={s.val}>{s.label}</option>
          ))}
        </select>

        <span className="w-px h-5 bg-slate-300 mx-1" />

        {/* Formatting actions */}
        <button
          type="button"
          onClick={() => execCmd('bold')}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors font-bold cursor-pointer"
          title="ضخیم (Bold)"
        >
          <Bold className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => execCmd('italic')}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          title="کج (Italic)"
        >
          <Italic className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => execCmd('underline')}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          title="خط زیرین (Underline)"
        >
          <Underline className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => execCmd('strikeThrough')}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          title="خط‌خورده (Strike)"
        >
          <Strikethrough className="w-4 h-4" />
        </button>

        <span className="w-px h-5 bg-slate-300 mx-1" />

        {/* Alignments */}
        <button
          type="button"
          onClick={() => execCmd('justifyRight')}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          title="راست‌چین"
        >
          <AlignRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => execCmd('justifyCenter')}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          title="وسط‌چین"
        >
          <AlignCenter className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => execCmd('justifyLeft')}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          title="چپ‌چین"
        >
          <AlignLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => execCmd('justifyFull')}
          className="p-1.5 rounded hover:bg-amber-100 text-amber-900 border border-amber-300 transition-colors cursor-pointer font-bold"
          title="تراز کامل دوطرفه (Justify - استاندارد ورد مکاتبات اداری)"
        >
          <AlignJustify className="w-4 h-4" />
        </button>

        <span className="w-px h-5 bg-slate-300 mx-1" />

        {/* Lists & Indents */}
        <button
          type="button"
          onClick={() => execCmd('insertUnorderedList')}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          title="فهرست نشانه‌دار (Bullet List)"
        >
          <List className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => execCmd('insertOrderedList')}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          title="فهرست شماره‌دار (Numbered List)"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => execCmd('indent')}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          title="افزایش تورفتگی پاراگراف"
        >
          <Indent className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => execCmd('outdent')}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          title="کاهش تورفتگی پاراگراف"
        >
          <Outdent className="w-4 h-4" />
        </button>

        <span className="w-px h-5 bg-slate-300 mx-1" />

        {/* Colors & Highlights */}
        <label className="flex items-center p-1 rounded hover:bg-slate-200 text-slate-700 cursor-pointer" title="رنگ قلم">
          <Palette className="w-4 h-4 text-slate-600" />
          <input
            type="color"
            onChange={e => execCmd('foreColor', e.target.value)}
            className="w-4 h-4 p-0 opacity-0 absolute pointer-events-none"
          />
        </label>

        <label className="flex items-center p-1 rounded hover:bg-slate-200 text-slate-700 cursor-pointer" title="هایلایت زرد">
          <Highlighter className="w-4 h-4 text-amber-600" />
          <input
            type="color"
            defaultValue="#fef08a"
            onChange={e => execCmd('hiliteColor', e.target.value)}
            className="w-4 h-4 p-0 opacity-0 absolute pointer-events-none"
          />
        </label>

        <button
          type="button"
          onClick={insertTable}
          className="flex items-center gap-1 px-2 py-1 rounded bg-white hover:bg-slate-200 text-[#13213c] border border-slate-300 font-bold transition-colors cursor-pointer"
          title="درج جدول رسمی اقلام"
        >
          <Table className="w-3.5 h-3.5 text-blue-700" />
          <span>جدول</span>
        </button>

        <button
          type="button"
          onClick={() => execCmd('removeFormat')}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
          title="حذف فرمت و بازنشانی متن ساده"
        >
          <RemoveFormatting className="w-4 h-4" />
        </button>

        <span className="w-px h-5 bg-slate-300 mx-1" />

        <button
          type="button"
          onClick={() => execCmd('undo')}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer"
          title="بازگشت (Undo)"
        >
          <Undo className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => execCmd('redo')}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer"
          title="تکرار (Redo)"
        >
          <Redo className="w-3.5 h-3.5" />
        </button>

        {/* Fullscreen Toggle */}
        <div className="mr-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer"
            title={isFullscreen ? 'خروج از تمام صفحه' : 'ویرایش در تمام صفحه'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Quick Clauses Toolbar */}
      <div className="bg-amber-50/70 border-b border-amber-200/80 px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto text-[11px] text-amber-950 font-medium">
        <span className="text-amber-800 font-bold shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-600" />
          <span>درج سریع عبارات نگارشی:</span>
        </span>
        <button
          type="button"
          onClick={() => insertClause('<div style="text-align: center; font-weight: bold; margin-bottom: 12px;">بسمه تعالی</div>')}
          className="px-2 py-0.5 rounded bg-white hover:bg-amber-100 border border-amber-200 cursor-pointer shrink-0"
        >
          «بسمه تعالی»
        </button>
        <button
          type="button"
          onClick={() => insertClause('<strong>با سلام و احترام،</strong><br>بدین‌وسیله به استحضار می‌رساند که پیرو مذاکرات صورت‌پذیرفته، ')}
          className="px-2 py-0.5 rounded bg-white hover:bg-amber-100 border border-amber-200 cursor-pointer shrink-0"
        >
          «مقدمه و شروع رسمی نامه»
        </button>
        <button
          type="button"
          onClick={() => insertClause('<br><p style="margin-top: 15px;">خواهشمند است دستور فرمایید اقدامات مقتضی در این خصوص معمول و نتیجه به این شرکت اعلام گردد.</p>')}
          className="px-2 py-0.5 rounded bg-white hover:bg-amber-100 border border-amber-200 cursor-pointer shrink-0"
        >
          «درخواست صدور دستور مقتضی»
        </button>
        <button
          type="button"
          onClick={() => insertClause('<br><div style="margin-top: 25px; text-align: left; font-weight: bold;">با تجدید احترام و امتنان،<br><span style="color: #13213c;">شرکت مهندسی رهنمون کیفیت رابو</span></div>')}
          className="px-2 py-0.5 rounded bg-white hover:bg-amber-100 border border-amber-200 cursor-pointer shrink-0"
        >
          «پایان و احترامات رسمی رابو»
        </button>
      </div>

      {/* Editable Canvas (Word-like page) */}
      <div 
        className="p-6 bg-slate-50/50 flex-1 overflow-y-auto flex justify-center"
        onClick={() => editorRef.current?.focus()}
      >
        <div 
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          style={{ minHeight, direction: 'rtl', textAlign: 'justify', lineHeight: '2.1' }}
          className="w-full max-w-3xl bg-white border border-slate-300 rounded-lg p-6 sm:p-10 shadow-xs outline-none focus:ring-2 focus:ring-[#13213c] text-slate-900 text-sm leading-relaxed"
          data-placeholder={placeholder}
        />
      </div>

      {/* Bottom Status bar */}
      <div className="bg-slate-100 border-t border-slate-200 px-4 py-1.5 flex items-center justify-between text-[11px] text-slate-500 font-medium">
        <div className="flex items-center gap-3">
          <span>تعداد کلمات: <strong className="font-mono text-slate-700">{wordCount.toLocaleString('fa-IR')}</strong></span>
          <span className="text-slate-300">|</span>
          <span className="text-emerald-700 font-semibold">حالت نگارش رسمی سازمانی Word</span>
        </div>
        <div className="text-[10px] text-slate-400">
          کلیدهای میانبر: Ctrl+B (ضخیم) | Ctrl+I (کج) | Ctrl+U (خط زیر)
        </div>
      </div>
    </div>
  );
};
