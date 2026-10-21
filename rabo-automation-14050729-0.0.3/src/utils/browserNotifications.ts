/**
 * مدیریت سیستم اعلان‌های مرورگری (Browser Notifications API)
 * شرکت مهندسی رهنمون کیفیت رابو
 * 
 * این ماژول وظیفه ارسال اعلان‌های مرورگری هنگام:
 * ۱. تعریف و ارجاع وظیفه/تسک جدید برای کاربر
 * ۲. فرارسیدن موعد سررسید و مهلت اقدام نامه‌های اداری
 * را با پشتیبانی کامل از استاندارد W3C Notification API، Web Audio API و Fallback های تعاملی بر عهده دارد.
 */

import { addNotificationToHistory } from './notificationStore';

// تولید صدای زنگ ملایم سیستمی با استفاده از Web Audio API بدون نیاز به فایل صوتی خارجی
export const playNotificationChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // نت اول (D5 - 587.33Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.18, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.36);

    // نت دوم (A5 - 880Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.22, now + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.62);
  } catch (err) {
    console.debug('Audio chime skipped', err);
  }
};

/**
 * بررسی پشتیبانی مرورگر از اعلان‌ها
 */
export const isBrowserNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

/**
 * دریافت وضعیت فعلی مجوز اعلان مرورگر
 */
export const getBrowserNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  try {
    return Notification.permission;
  } catch {
    return 'unsupported';
  }
};

/**
 * درخواست مجوز اعلان از کاربر
 */
export const requestBrowserNotificationPermission = async (): Promise<boolean> => {
  if (!isBrowserNotificationSupported()) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      playNotificationChime();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('rabo-permission-changed', { detail: { permission: 'granted' } }));
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

export interface NotificationPayload {
  title: string;
  body: string;
  tag?: string;
  data?: any;
  icon?: string;
  badge?: string;
  requireInteraction?: boolean;
  actionType?: 'task' | 'letter' | 'system';
  actionUrl?: string;
}

/**
 * ارسال اعلان مستقیم به مرورگر (با پشتیبانی از Service Worker و Fallback مستقیم و In-App Event)
 */
export const sendBrowserNotification = async (payload: NotificationPayload): Promise<boolean> => {
  // همیشه صدای زنگ اعلان پخش می‌شود
  playNotificationChime();

  // ثبت در تاریخچه مرکز اعلان‌ها (Notification Center) جهت دسترسی و مرور بعدی کاربر
  try {
    const category = payload.actionType === 'task' || payload.title.includes('وظیفه') 
      ? 'task' 
      : (payload.actionType === 'letter' || payload.title.includes('نامه') || payload.title.includes('سررسید') ? 'letter' : 'system');
    
    const priority = payload.requireInteraction 
      ? 'urgent' 
      : (payload.body.includes('فوری') ? 'urgent' : (payload.body.includes('اولویت بالا') ? 'high' : 'normal'));

    const actionView = payload.actionType === 'task' 
      ? 'tasks' 
      : (payload.actionType === 'letter' ? 'letters-inbox' : (payload.actionUrl || 'dashboard'));

    const actionTitle = payload.actionType === 'task'
      ? 'مشاهده وظیفه'
      : (payload.actionType === 'letter' ? 'مشاهده نامه' : 'مشاهده در سامانه');

    addNotificationToHistory({
      title: payload.title,
      body: payload.body,
      type: category,
      priority,
      actionView,
      actionTitle,
      data: payload.data
    });
  } catch (err) {
    console.debug('Failed to record notification to history', err);
  }

  // ارسال رخداد داخلی برنامه برای نمایش آنی پاپ‌آپ داخل برنامه (تضمین ۱۰۰٪ نمایش در هر شرایط)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('rabo-browser-notification', { detail: payload }));
  }

  if (!isBrowserNotificationSupported()) {
    return false;
  }

  // در صورتی که هنوز تصمیم‌گیری نشده، درخواست مجوز می‌کنیم
  try {
    if (Notification.permission === 'default') {
      const granted = await requestBrowserNotificationPermission();
      if (!granted) return false;
    }
  } catch {
    // نادیده‌گیری خطای درخواست در صورت مسدود بودن در iframe
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  const options: NotificationOptions = {
    body: payload.body,
    icon: payload.icon || '/logo.svg',
    badge: payload.badge || '/logo.svg',
    tag: payload.tag || `rabo-notif-${Date.now()}`,
    data: payload.data,
    requireInteraction: payload.requireInteraction ?? false,
    dir: 'rtl',
    lang: 'fa'
  };

  // ۱. تلاش برای ارسال از طریق Service Worker (در موبایل، ویندوز و بک‌گراند پایدارتر است)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(payload.title, options);
        return true;
      }
    } catch {
      // ادامه به ارسال مستقیم
    }
  }

  // ۲. ارسال اعلان استاندارد سیستم‌عامل / مرورگر (Web Notifications API)
  try {
    const notif = new Notification(payload.title, options);
    notif.onclick = () => {
      window.focus();
      notif.close();
    };
    return true;
  } catch (err) {
    console.warn('Native Notification constructor failed:', err);
    return false;
  }
};

/**
 * ارسال اعلان تعریف وظیفه جدید برای پرسنل
 */
export const notifyTaskAssigned = async (params: {
  taskTitle: string;
  assigneeName: string;
  projectName?: string;
  dueDate?: string;
  priority?: string;
  taskId?: string;
}) => {
  const projectText = params.projectName ? ` در «${params.projectName}»` : '';
  const dueText = params.dueDate ? ` | مهلت اقدام: ${params.dueDate}` : '';
  const priorityBadge = params.priority === 'فوری' ? '🔥 فوری: ' : (params.priority === 'بالا' ? '⚡ اولویت بالا: ' : '');

  return sendBrowserNotification({
    title: `📋 انتصاب وظیفه جدید | اتوماسیون رابو`,
    body: `${priorityBadge}وظیفه «${params.taskTitle}» برای ${params.assigneeName}${projectText} ثبت گردید.${dueText}`,
    tag: params.taskId || `task-assigned-${Date.now()}`,
    requireInteraction: params.priority === 'فوری' || params.priority === 'بالا',
    actionType: 'task',
    data: {
      type: 'task',
      taskTitle: params.taskTitle,
      assigneeName: params.assigneeName,
      projectName: params.projectName,
      dueDate: params.dueDate,
      priority: params.priority
    }
  });
};

/**
 * ارسال اعلان فرارسیدن موعد سررسید یک نامه اداری
 */
export const notifyLetterDueDate = async (params: {
  letterId: string;
  subject: string;
  senderOrg?: string;
  dueDate: string;
  isUrgent?: boolean;
}) => {
  const senderText = params.senderOrg ? ` از سوی ${params.senderOrg}` : '';

  return sendBrowserNotification({
    title: `📬 سررسید اقدام اداری | نامه ${params.letterId}`,
    body: `نامه «${params.subject}»${senderText} به موعد سررسید (${params.dueDate}) رسیده است. لطفاً نسبت به اقدام یا ثبت پاسخ رسیدگی فرمایید.`,
    tag: `letter-due-${params.letterId}`,
    requireInteraction: true,
    actionType: 'letter',
    data: {
      type: 'letter',
      letterId: params.letterId,
      subject: params.subject,
      senderOrg: params.senderOrg,
      dueDate: params.dueDate
    }
  });
};

/**
 * نرمال‌سازی تاریخ شمسی به ارقام انگلیسی جهت مقایسه ریاضی دقیق
 */
export const normalizeShamsiDate = (d?: string): string => {
  if (!d) return '';
  return String(d)
    .replace(/[۰-۹]/g, c => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(c)])
    .trim();
};

/**
 * بررسی اینکه آیا تاریخ سررسید دقیقاً مصادف با امروز است
 */
export const isDueToday = (dueDateStr?: string, currentTodayStr?: string): boolean => {
  if (!dueDateStr || !currentTodayStr) return false;
  const d1 = normalizeShamsiDate(dueDateStr).replace(/\D/g, '');
  const d2 = normalizeShamsiDate(currentTodayStr).replace(/\D/g, '');
  return d1 !== '' && d1 === d2;
};

/**
 * بررسی اینکه آیا تاریخ سررسید فرارسیده است (امروز یا گذشته)
 */
export const isDueDateReached = (dueDateStr?: string, currentTodayStr?: string): boolean => {
  if (!dueDateStr || !currentTodayStr) return false;
  const d1 = normalizeShamsiDate(dueDateStr).replace(/\D/g, '');
  const d2 = normalizeShamsiDate(currentTodayStr).replace(/\D/g, '');
  if (!d1 || !d2) return false;
  return Number(d1) <= Number(d2);
};

export interface DueLetterStatus {
  letter: {
    id: string;
    subject: string;
    senderOrg?: string;
    dueDate?: string;
    issueDate?: string;
    projectName?: string;
    expertName?: string;
  };
  status: 'due_today' | 'overdue';
}

/**
 * بررسی دوره‌ای و ارسال خودکار نوتیفیکیشن برای نامه‌هایی که سررسید آنها فرا رسیده است
 * جلوگیری از ارسال تکراری با استفاده از حافظه نشست (sessionStorage)
 */
export const checkDueLettersAndNotify = (
  letters: Array<{
    id: string;
    subject: string;
    senderOrg?: string;
    dueDate?: string;
    issueDate?: string;
    projectName?: string;
    expertName?: string;
  }>,
  todayStr: string,
  options?: { force?: boolean }
): DueLetterStatus[] => {
  const dueItems: DueLetterStatus[] = [];

  letters.forEach(letter => {
    const targetDueDate = letter.dueDate || letter.issueDate;
    if (!targetDueDate) return;

    const dueToday = isDueToday(targetDueDate, todayStr);
    const reached = isDueDateReached(targetDueDate, todayStr);

    if (reached) {
      const status: 'due_today' | 'overdue' = dueToday ? 'due_today' : 'overdue';
      dueItems.push({ letter, status });

      const sessionKey = `rabo_notified_letter_${letter.id}_${status}_${normalizeShamsiDate(todayStr)}`;
      let alreadyNotified = false;
      try {
        alreadyNotified = !options?.force && !!sessionStorage.getItem(sessionKey);
      } catch {
        // نادیده‌گیری خطای sessionStorage
      }

      if (!alreadyNotified) {
        notifyLetterDueDate({
          letterId: letter.id,
          subject: letter.subject,
          senderOrg: letter.senderOrg,
          dueDate: targetDueDate,
          isUrgent: true
        });

        try {
          sessionStorage.setItem(sessionKey, 'true');
        } catch {
          // ignore
        }
      }
    }
  });

  return dueItems;
};
