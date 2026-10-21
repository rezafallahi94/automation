import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  CheckSquare, 
  Mail, 
  X, 
  Trash2, 
  CheckCheck, 
  ExternalLink, 
  Clock, 
  DollarSign,
  PhoneCall,
  Settings,
  Sparkles
} from 'lucide-react';
import {
  NotificationHistoryItem,
  getStoredNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotificationFromHistory,
  clearAllNotificationsHistory,
  subscribeToNotifications
} from '../utils/notificationStore';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  const [notifications, setNotifications] = useState<NotificationHistoryItem[]>(getStoredNotifications);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'task' | 'letter' | 'crm' | 'finance'>('all');

  useEffect(() => {
    setNotifications(getStoredNotifications());
    const unsubscribe = subscribeToNotifications(updated => {
      setNotifications(updated);
    });
    return unsubscribe;
  }, []);

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filtered = notifications.filter(n => {
    if (activeFilter === 'unread') return !n.isRead;
    if (activeFilter === 'task') return n.type === 'task';
    if (activeFilter === 'letter') return n.type === 'letter';
    if (activeFilter === 'crm') return n.type === 'crm';
    if (activeFilter === 'finance') return n.type === 'finance';
    return true;
  });

  const handleMarkAllAsRead = () => {
    markAllNotificationsAsRead();
  };

  const handleClearAll = () => {
    if (window.confirm('آیا از پاکسازی تمام تاریخچه اعلان‌های دریافتی اطمینان دارید؟')) {
      clearAllNotificationsHistory();
    }
  };

  const handleItemClick = (item: NotificationHistoryItem) => {
    markNotificationAsRead(item.id);
    if (item.actionView) {
      onNavigate(item.actionView);
      onClose();
    }
  };

  const handleDeleteItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotificationFromHistory(id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="bg-[#13213c] text-white p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>مرکز تاریخچه اعلان‌های دریافتی (Notification Center)</span>
                {unreadCount > 0 && (
                  <span className="bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">
                    {unreadCount} جدید
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-300">
                مرور کامل کلیه هشدارها، موعد سررسید نامه‌ها، وظایف محوله و پیگیری‌های اداری
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar & Filters */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap shrink-0 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-[#13213c] text-white shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              همه ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('unread')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeFilter === 'unread'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              خوانده‌نشده ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('letter')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeFilter === 'letter'
                  ? 'bg-[#800000] text-white shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              نامه‌های اداری
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('task')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeFilter === 'task'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              وظایف تیمی
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('crm')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeFilter === 'crm'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              پیگیری‌های CRM
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('finance')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeFilter === 'finance'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              تنخواه و مالی
            </button>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-900 font-bold hover:underline cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>خواندن همه</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer"
                title="پاکسازی تاریخچه"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>پاکسازی</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Bell className="w-10 h-10 mx-auto text-slate-300" />
              <div className="text-xs font-bold text-slate-500">هیچ اعلانی در این دسته وجود ندارد.</div>
              <p className="text-[11px] text-slate-400">
                تمامی اعلان‌های جدید وظایف و موعد سررسید نامه‌ها به‌صورت لحظه‌ای در اینجا آرشیو خواهند شد.
              </p>
            </div>
          ) : (
            filtered.map(item => {
              const isTask = item.type === 'task';
              const isLetter = item.type === 'letter';
              const isFinance = item.type === 'finance';
              const isCrm = item.type === 'crm';

              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative group ${
                    item.isRead
                      ? 'bg-white hover:bg-slate-50 border-slate-200 opacity-80'
                      : 'bg-amber-50/40 hover:bg-amber-50/70 border-amber-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isTask
                            ? 'bg-indigo-100 text-indigo-700'
                            : isLetter
                            ? 'bg-rose-100 text-[#800000]'
                            : isCrm
                            ? 'bg-amber-100 text-amber-800'
                            : isFinance
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {isTask ? (
                          <CheckSquare className="w-3.5 h-3.5" />
                        ) : isLetter ? (
                          <Mail className="w-3.5 h-3.5" />
                        ) : isCrm ? (
                          <PhoneCall className="w-3.5 h-3.5" />
                        ) : isFinance ? (
                          <DollarSign className="w-3.5 h-3.5" />
                        ) : (
                          <Bell className="w-3.5 h-3.5" />
                        )}
                      </div>

                      <div>
                        <strong className={`text-xs block ${item.isRead ? 'text-slate-800' : 'text-slate-900 font-black'}`}>
                          {item.title}
                        </strong>
                        {item.priority === 'urgent' && (
                          <span className="inline-block mt-0.5 text-[9px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded">
                            اقدام فوری
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.timestamp}
                      </span>
                      {!item.isRead && (
                        <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" title="خوانده نشده" />
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteItem(e, item.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-1 rounded transition-opacity"
                        title="حذف اعلان"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed pr-9 mb-2">
                    {item.body}
                  </p>

                  {item.actionView && (
                    <div className="pr-9 flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900">
                      <span>{item.actionTitle || 'مشاهده و رسیدگی در سامانه'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-[11px] text-slate-500">
            مجموع اعلان‌ها: {notifications.length} مورد ({unreadCount} مورد خوانده‌نشده)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#13213c] hover:bg-[#1f345c] text-white font-bold rounded-lg text-xs cursor-pointer transition-colors"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
