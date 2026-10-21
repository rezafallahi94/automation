import React, { useState } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
  buttonText?: string;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onTranscript,
  className = '',
  buttonText = 'ورود صوتی با میکروفون'
}) => {
  const [isListening, setIsListening] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleToggleListening = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = 
      (window as unknown as { SpeechRecognition?: any }).SpeechRecognition || 
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg('مرورگر از گفتار به نوشتار پشتیبانی نمی‌کند.');
      setTimeout(() => setErrorMsg(null), 3500);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'fa-IR';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMsg(null);
      };

      recognition.onresult = (event: any) => {
        const spokenText = event.results[0]?.[0]?.transcript;
        if (spokenText) {
          onTranscript(spokenText);
        }
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMsg('دسترسی به میکروفون داده نشد.');
        } else if (event.error === 'no-speech') {
          setErrorMsg('صدایی شنیده نشد.');
        } else {
          setErrorMsg('خطا در دریافت صدا');
        }
        setIsListening(false);
        setTimeout(() => setErrorMsg(null), 3000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      setErrorMsg('عدم دسترسی به سرویس صوت');
      setTimeout(() => setErrorMsg(null), 3000);
    }
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={handleToggleListening}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs select-none ${
          isListening
            ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-300'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
        } ${className}`}
        title="تبدیل گفتار به متن فارسی (با میکروفون صحبت کنید)"
      >
        {isListening ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            <span>در حال ضبط صوت... صحبت کنید</span>
          </>
        ) : (
          <>
            <Mic className="w-3.5 h-3.5 text-amber-600" />
            <span>{buttonText}</span>
          </>
        )}
      </button>

      {errorMsg && (
        <span className="text-[11px] text-rose-600 font-medium animate-in fade-in">
          {errorMsg}
        </span>
      )}
    </div>
  );
};
