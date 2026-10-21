import React, { useState, useEffect } from 'react';
import { NotificationPayload } from '../utils/browserNotifications';
import { Bell, CheckSquare, Mail, X, ExternalLink, Sparkles } from 'lucide-react';
import { Employee } from '../types';

interface ToastItem extends NotificationPayload {
  id: string;
  timestamp: string;
  targetUserId?: string;
  targetUserName?: string;
}

interface InAppNotificationToastProps {
  currentUser?: Employee | null;
  onNavigate?: (view: string) => void;
}

export const InAppNotificationToast: React.FC<InAppNotificationToastProps> = ({ 
  currentUser, 
  onNavigate 
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleNotificationEvent = (e: Event) => {
      const customEvent = e as CustomEvent<NotificationPayload & { targetUserId?: string; targetUserName?: string }>;
      if (!customEvent.detail) return;

      const detail = customEvent.detail;

      // Filter: If user is logged out, don't show internal toasts
      if (!currentUser) return;

      // User-specific filtering: If toast targets a specific person, non-managers only see their own
      if (!currentUser.isManager) {
        const targetId = detail.targetUserId || (detail.data as any)?.targetUserId || (detail.data as any)?.assigneeId;
        const targetName = detail.targetUserName || (detail.data as any)?.assigneeName;

        if (targetId && targetId !== currentUser.id) return;
        if (targetName && !targetName.includes(currentUser.name) && !currentUser.name.includes(targetName)) {
          // If neither ID nor Name matches, don't toast for irrelevant personnel
          if (targetId) return;
        }
      }

      const newToast: ToastItem = {
        ...detail,
        id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
      };

      setToasts(prev => [newToast, ...prev.slice(0, 2)]); // Keep at most 3 compact toasts on screen

      // Auto-dismiss after 6 seconds
      if (!newToast.requireInteraction) {
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== newToast.id));
        }, 6000);
      }
    };

    window.addEventListener('rabo-browser-notification', handleNotificationEvent);
    return () => {
      window.removeEventListener('rabo-browser-notification', handleNotificationEvent);
    };
  }, [currentUser]);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleAction = (toast: ToastItem) => {
    if (toast.actionType === 'task' || toast.data?.type === 'task') {
      onNavigate?.('tasks');
    } else if (toast.actionType === 'letter' || toast.data?.type === 'letter') {
      onNavigate?.('letters-inbox');
    }
    removeToast(toast.id);
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-3 right-3 left-3 sm:left-auto sm:right-5 sm:bottom-5 z-50 flex flex-col gap-2 sm:max-w-sm w-auto pointer-events-none text-right">
      {toasts.map(toast => {
        const isTask = toast.actionType === 'task' || toast.data?.type === 'task' || toast.title.includes('وظیفه');
        const isLetter = toast.actionType === 'letter' || toast.data?.type === 'letter' || toast.title.includes('نامه') || toast.title.includes('سررسید');

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto bg-white/98 backdrop-blur-md border rounded-xl shadow-xl p-3 sm:p-3.5 transition-all duration-300 animate-in slide-in-from-bottom-3 fade-in ${
              isTask
                ? 'border-indigo-400 bg-gradient-to-br from-white via-indigo-50/20 to-white'
                : isLetter
                ? 'border-rose-400 bg-gradient-to-br from-white via-rose-50/20 to-white'
                : 'border-amber-400 bg-gradient-to-br from-white via-amber-50/20 to-white'
            }`}
          >
            <div className="flex items-start justify-between gap-2.5 mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isTask
                      ? 'bg-indigo-600 text-white'
                      : isLetter
                      ? 'bg-[#800000] text-white'
                      : 'bg-[#13213c] text-white'
                  }`}
                >
                  {isTask ? (
                    <CheckSquare className="w-3.5 h-3.5" />
                  ) : isLetter ? (
                    <Mail className="w-3.5 h-3.5" />
                  ) : (
                    <Bell className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="text-[12px] font-black text-slate-900 leading-tight truncate">
                    {toast.title}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                    <span>{toast.timestamp}</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5 text-emerald-700 font-bold">
                      <Sparkles className="w-2.5 h-2.5" />
                      اعلان سازمانی
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                title="بستن اعلان"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-slate-700 leading-snug font-normal mb-2 pr-9 line-clamp-2 sm:line-clamp-3">
              {toast.body}
            </p>

            <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleAction(toast)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
                  isTask
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                    : isLetter
                    ? 'bg-[#800000] hover:bg-[#990000] text-white shadow-xs'
                    : 'bg-[#13213c] hover:bg-[#1f345c] text-white shadow-xs'
                }`}
              >
                <ExternalLink className="w-3 h-3" />
                <span>{isTask ? 'مشاهده وظیفه' : isLetter ? 'مشاهده نامه' : 'رسیدگی'}</span>
              </button>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-[10px] sm:text-[11px] text-slate-400 hover:text-slate-700 font-medium px-2 py-0.5 cursor-pointer"
              >
                نادیده‌گیری
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
