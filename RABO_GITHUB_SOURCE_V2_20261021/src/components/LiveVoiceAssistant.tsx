import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Radio, 
  Loader2, 
  Sparkles, 
  AlertCircle, 
  PhoneCall, 
  PhoneOff,
  User,
  Bot
} from 'lucide-react';
import { pcmToBase64, base64ToAudioBuffer } from '../utils/audioPcm';

interface LiveVoiceAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveVoiceAssistant: React.FC<LiveVoiceAssistantProps> = ({
  isOpen,
  onClose
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [statusText, setStatusText] = useState('آماده اتصال به Gemini Live');
  const [conversationLogs, setConversationLogs] = useState<Array<{ sender: 'user' | 'model'; text: string; time: string }>>([
    {
      sender: 'model',
      text: 'سلام! من دستیار صوتی زنده شرکت مهندسی رابو (مدل Gemini 3.8 Live) هستم. می‌توانید درباره استانداردهای آتش‌نشانی، نامه‌نگاری‌ها، یا پروژه‌ها صحبت کنید.',
      time: 'هم‌اکنون'
    }
  ]);

  // Audio Context refs
  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);

  // Start Live Audio Session
  const startLiveSession = async () => {
    try {
      setStatusText('در حال اتصال به سرور و راه‌اندازی Gemini 3.8 Live...');

      // Connect to WebSocket on same host
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        setStatusText('اتصال شبکه برقرار شد؛ در حال فعال‌سازی میکروفون...');
        setIsConnected(true);

        // Setup microphone capture (16kHz PCM for Gemini Live)
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              channelCount: 1,
              sampleRate: 16000,
              echoCancellation: true,
              noiseSuppression: true
            } 
          });
          mediaStreamRef.current = stream;

          const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
            sampleRate: 16000
          });
          inputAudioCtxRef.current = inputCtx;

          const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
            sampleRate: 24000
          });
          outputAudioCtxRef.current = outputCtx;
          nextStartTimeRef.current = outputCtx.currentTime;

          const source = inputCtx.createMediaStreamSource(stream);
          const processor = inputCtx.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;

          processor.onaudioprocess = (e) => {
            if (isMicMuted || !ws || ws.readyState !== WebSocket.OPEN) return;
            const inputData = e.inputBuffer.getChannelData(0);
            const base64Audio = pcmToBase64(inputData);
            ws.send(JSON.stringify({ audio: base64Audio }));
          };

          source.connect(processor);
          processor.connect(inputCtx.destination);

          setStatusText('گفتگوی صوتی زنده با Gemini 3.8 Live فعال است (صحبت کنید)');
        } catch (micErr: any) {
          console.error('Microphone access error:', micErr);
          setStatusText(`خطای دسترسی به میکروفون: ${micErr.message}`);
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.status === 'ready') {
            setStatusText('مدل Gemini 3.8 Live آماده پاسخگویی بلادرنگ است');
          }

          if (data.error) {
            setStatusText(`خطای مدل: ${data.error}`);
          }

          // Interruption: Model turn stopped by user speaking
          if (data.interrupted) {
            setIsTalking(false);
            audioQueueRef.current.forEach(sourceNode => {
              try { sourceNode.stop(); } catch {}
            });
            audioQueueRef.current = [];
            if (outputAudioCtxRef.current) {
              nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
            }
          }

          // Incoming audio chunk from Gemini Live
          if (data.audio && outputAudioCtxRef.current) {
            setIsTalking(true);
            const ctx = outputAudioCtxRef.current;
            const audioBuffer = base64ToAudioBuffer(ctx, data.audio, 24000);

            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);

            const startTime = Math.max(nextStartTimeRef.current, ctx.currentTime);
            source.start(startTime);
            nextStartTimeRef.current = startTime + audioBuffer.duration;

            audioQueueRef.current.push(source);

            source.onended = () => {
              const idx = audioQueueRef.current.indexOf(source);
              if (idx !== -1) audioQueueRef.current.splice(idx, 1);
              if (audioQueueRef.current.length === 0) {
                setIsTalking(false);
              }
            };
          }
        } catch (err) {
          console.error('Error handling WebSocket message:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setStatusText('خطای اتصال به سرور Live API');
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsTalking(false);
        setStatusText('جلسه صوتی پایان یافت');
      };
    } catch (err: any) {
      console.error('Failed to initiate live session:', err);
      setStatusText(`خطا در شروع گفتگو: ${err.message}`);
    }
  };

  // Stop session
  const stopLiveSession = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close().catch(() => {});
      outputAudioCtxRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    audioQueueRef.current = [];
    setIsConnected(false);
    setIsTalking(false);
    setStatusText('جلسه متوقف شد');
  };

  useEffect(() => {
    return () => {
      stopLiveSession();
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#13213c]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <Radio className={`w-4 h-4 ${isConnected ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`} />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-[#13213c]">
                دستیار صوتی زنده رابو (Gemini 3.8 Live API)
              </h3>
              <p className="text-[11px] text-slate-500">
                گفتگوی بلادرنگ صوتی دوطرفه و کم‌تأخیر (Real-Time Voice Streaming)
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopLiveSession();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Visualizer & Connection Banner */}
        <div className="p-6 flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
          {/* Pulsing Avatar */}
          <div className="relative mb-4">
            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                isTalking
                  ? 'bg-amber-500/20 ring-8 ring-amber-400/30 scale-105'
                  : isConnected
                  ? 'bg-blue-500/10 ring-4 ring-blue-400/20'
                  : 'bg-slate-100'
              }`}
            >
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-transform ${
                  isTalking
                    ? 'bg-gradient-to-tr from-amber-600 to-amber-400 text-white animate-pulse'
                    : isConnected
                    ? 'bg-[#13213c] text-white'
                    : 'bg-slate-300 text-slate-600'
                }`}
              >
                {isTalking ? (
                  <Volume2 className="w-8 h-8" />
                ) : (
                  <Mic className="w-8 h-8" />
                )}
              </div>
            </div>
          </div>

          {/* Status Label */}
          <div className="text-center space-y-1">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                isTalking
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : isConnected
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {isTalking ? 'دستیار در حال صحبت است...' : statusText}
            </span>
            <div className="text-[11px] text-slate-400">
              مدل فعال: <strong className="font-mono text-slate-600">gemini-3.8-live</strong> (صوت ۲۴ کیلوهرتز دوطرفه)
            </div>
          </div>

          {/* Live Action Buttons */}
          <div className="flex items-center gap-3 mt-5">
            {!isConnected ? (
              <button
                type="button"
                onClick={startLiveSession}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <PhoneCall className="w-4 h-4" />
                <span>شروع گفتگوی صوتی</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsMicMuted(!isMicMuted)}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    isMicMuted
                      ? 'bg-rose-50 border-rose-300 text-rose-700'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                  }`}
                  title={isMicMuted ? 'فعال کردن میکروفون' : 'بی‌صدا کردن میکروفون'}
                >
                  {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={stopLiveSession}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>پایان گفتگو</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Conversation Guidance & Instructions */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1 text-xs">
          <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>نمونه سوالات پیشنهادی که می‌توانید به صورت زنده بپرسید:</span>
          </div>

          <div className="space-y-2">
            {[
              'ضوابط دوربندی و تخلیه دود در طبقات منفی ساختمان طبق دستورالعمل آتش‌نشانی چیست؟',
              'چگونه باید یک نامه رسمی اعلام هزینه طراحی سامانه اطفا حریق تنظیم کنیم؟',
              'شرایط قانونی اضافه‌کاری و تعطیل‌کاری در قانون کار چطور محاسبه می‌شود؟',
              'شاخص‌های ارزیابی عملکرد مناسب برای کارشناس فروش و CRM در رابو چه مواردی هستند؟'
            ].map((q, idx) => (
              <div
                key={idx}
                className="bg-slate-50 hover:bg-slate-100 p-2.5 rounded-lg border border-slate-200 text-slate-700 text-[11.5px] leading-relaxed cursor-pointer"
                onClick={() => {
                  if (!isConnected) {
                    startLiveSession();
                  }
                }}
              >
                💬 "{q}"
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1">
            <Radio className="w-3 h-3 text-emerald-600" />
            <span>پشتیبانی از قطع گفتگوی دوطرفه (Barge-in / Interruption)</span>
          </div>
          <button
            onClick={() => {
              stopLiveSession();
              onClose();
            }}
            className="text-slate-600 hover:text-slate-800 font-bold"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
