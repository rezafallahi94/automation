/**
 * مدیریت تاریخچه اعلان‌های دریافتی (Notification Center Store)
 * شرکت مهندسی رهنمون کیفیت رابو
 * 
 * ذخیره‌سازی، بازیابی، مدیریت وضعیت خوانده‌شده/نشده و هماهنگی رویدادهای اعلان
 */

export type NotificationCategory = 'task' | 'letter' | 'finance' | 'crm' | 'system';
export type NotificationPriority = 'urgent' | 'high' | 'normal';

export interface NotificationHistoryItem {
  id: string;
  title: string;
  body: string;
  type: NotificationCategory;
  timestamp: string;
  createdAt: number;
  isRead: boolean;
  priority?: NotificationPriority;
  actionView?: string;
  actionTitle?: string;
  actionId?: string;
  data?: any;
}

export const NOTIFICATION_STORAGE_KEY = 'rabo_notification_history';
export const NOTIFICATIONS_CHANGED_EVENT = 'rabo-notifications-updated';

// تاریخچه پیش‌فرض و کاربردی سیستم رابو جهت نمایش بلافاصله پس از ورود
export const INITIAL_NOTIFICATIONS: NotificationHistoryItem[] = [
  {
    id: 'notif-seed-1',
    title: '📬 سررسید اقدام اداری | نامه RABO-IN-1405-1082',
    body: 'ابلاغیه نقص نقشه‌های تهویه و اطفا حریق از سوی سازمان آتش‌نشانی تهران به موعد سررسید رسیده است. پیگیری فوری الزامی است.',
    type: 'letter',
    timestamp: 'امروز - ۱۰:۱۵',
    createdAt: Date.now() - 1000 * 60 * 35,
    isRead: false,
    priority: 'urgent',
    actionView: 'letters-inbox',
    actionTitle: 'مشاهده در کارتابل نامه‌ها',
    actionId: 'RABO-IN-1405-1082'
  },
  {
    id: 'notif-seed-2',
    title: '📋 انتصاب وظیفه جدید: کنترل نقشه‌های تاسیسات مکانیکی و مدلسازی BIM',
    body: 'وظیفه به مهندس کاظمی ارجاع گردید | اولویت: فوری | مهلت اقدام: امروز',
    type: 'task',
    timestamp: 'امروز - ۰۹:۴۰',
    createdAt: Date.now() - 1000 * 60 * 70,
    isRead: false,
    priority: 'urgent',
    actionView: 'tasks',
    actionTitle: 'مشاهده کارتابل وظایف',
    actionId: 'task-1405-01'
  },
  {
    id: 'notif-seed-3',
    title: '📞 یادآوری پیگیری موعد امروز (CRM)',
    body: 'پرونده شهرسازی ۲۲-۰۹۸۱ (مالک: مهندس افشار) جهت هماهنگی جلسه حضوری کمیسیون توافقات نیازمند تماس تلفنی است.',
    type: 'crm',
    timestamp: 'امروز - ۰۸:۳۰',
    createdAt: Date.now() - 1000 * 60 * 140,
    isRead: false,
    priority: 'high',
    actionView: 'crm-due-today',
    actionTitle: 'مشاهده پیگیری‌های امروز'
  },
  {
    id: 'notif-seed-4',
    title: '💳 شارژ تنخواه‌گردان کارگاهی',
    body: 'مبلغ ۲۵,۰۰۰,۰۰۰ تومان توسط امور مالی به تنخواه پروژه برج آفتاب واریز شد.',
    type: 'finance',
    timestamp: 'دیروز - ۱۶:۳۰',
    createdAt: Date.now() - 1000 * 60 * 60 * 18,
    isRead: true,
    priority: 'normal',
    actionView: 'petty-cash',
    actionTitle: 'سامانه تنخواه'
  },
  {
    id: 'notif-seed-5',
    title: '📬 سررسید استعلام اداری | نامه RABO-IN-1405-1095',
    body: 'نامه استعلام مدارک ممیزی و گواهی انطباق کیفیت ISO 9001 و تاییدیه استحکام بنا نیازمند پاسخ نهایی است.',
    type: 'letter',
    timestamp: 'دیروز - ۱۴:۱۰',
    createdAt: Date.now() - 1000 * 60 * 60 * 20,
    isRead: true,
    priority: 'high',
    actionView: 'letters-inbox',
    actionTitle: 'مشاهده نامه',
    actionId: 'RABO-IN-1405-1095'
  },
  {
    id: 'notif-seed-6',
    title: '⚙️ پشتیبان‌گیری خودکار دیتابیس',
    body: 'پشتیبان پایگاه داده اتوماسیون رابو، سوابق شهرسازی و کارتابل پرسنل با موفقیت ذخیره گردید.',
    type: 'system',
    timestamp: 'دیروز - ۱۲:۰۰',
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
    isRead: true,
    priority: 'normal',
    actionView: 'dashboard',
    actionTitle: 'داشبورد مدیریت'
  }
];

/**
 * دریافت لیست کامل اعلان‌ها از حافظه
 */
export const getStoredNotifications = (): NotificationHistoryItem[] => {
  if (typeof window === 'undefined') return INITIAL_NOTIFICATIONS;
  try {
    const raw = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(INITIAL_NOTIFICATIONS));
      return INITIAL_NOTIFICATIONS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_NOTIFICATIONS;
  } catch (e) {
    console.error('Error reading notifications history', e);
    return INITIAL_NOTIFICATIONS;
  }
};

/**
 * ذخیره لیست اعلان‌ها در localStorage و انتشار رویداد به کامپوننت‌ها
 */
export const saveNotifications = (notifications: NotificationHistoryItem[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications));
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT, { detail: { notifications } }));
  } catch (e) {
    console.error('Error saving notifications', e);
  }
};

/**
 * افزودن یک اعلان جدید به تاریخچه مرکز اعلان‌ها
 */
export const addNotificationToHistory = (
  item: Omit<NotificationHistoryItem, 'id' | 'createdAt' | 'isRead' | 'timestamp'> & {
    timestamp?: string;
    isRead?: boolean;
  }
): NotificationHistoryItem => {
  const current = getStoredNotifications();
  
  const now = new Date();
  const timeStr = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  const displayTime = item.timestamp || `امروز - ${timeStr}`;

  const newNotif: NotificationHistoryItem = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: item.title,
    body: item.body,
    type: item.type || 'system',
    timestamp: displayTime,
    createdAt: Date.now(),
    isRead: item.isRead ?? false,
    priority: item.priority || 'normal',
    actionView: item.actionView,
    actionTitle: item.actionTitle,
    actionId: item.actionId,
    data: item.data
  };

  // جلوگیری از ثبت اعلان با عنوان و بدنه یکسان در کمتر از ۵ ثانیه
  const duplicate = current.find(
    n => n.title === newNotif.title && Math.abs(n.createdAt - newNotif.createdAt) < 5000
  );
  if (duplicate) {
    return duplicate;
  }

  const updated = [newNotif, ...current].slice(0, 60);
  saveNotifications(updated);
  return newNotif;
};

/**
 * علامت‌گذاری یک اعلان به عنوان خوانده‌شده
 */
export const markNotificationAsRead = (id: string): void => {
  const current = getStoredNotifications();
  const updated = current.map(item => (item.id === id ? { ...item, isRead: true } : item));
  saveNotifications(updated);
};

/**
 * علامت‌گذاری کلیه اعلان‌ها به عنوان خوانده‌شده
 */
export const markAllNotificationsAsRead = (): void => {
  const current = getStoredNotifications();
  const updated = current.map(item => ({ ...item, isRead: true }));
  saveNotifications(updated);
};

/**
 * حذف یک اعلان مشخص از تاریخچه
 */
export const deleteNotificationFromHistory = (id: string): void => {
  const current = getStoredNotifications();
  const updated = current.filter(item => item.id !== id);
  saveNotifications(updated);
};

/**
 * پاکسازی کامل تاریخچه اعلان‌ها
 */
export const clearAllNotificationsHistory = (): void => {
  saveNotifications([]);
};

/**
 * دریافت تعداد اعلان‌های خوانده نشده
 */
export const getUnreadNotificationsCount = (): number => {
  const current = getStoredNotifications();
  return current.filter(item => !item.isRead).length;
};

/**
 * گوش دادن به تغییرات اعلان‌ها در کامپوننت‌های ری‌اکت
 */
export const subscribeToNotifications = (callback: (notifications: NotificationHistoryItem[]) => void) => {
  const handler = () => {
    callback(getStoredNotifications());
  };
  window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
};
