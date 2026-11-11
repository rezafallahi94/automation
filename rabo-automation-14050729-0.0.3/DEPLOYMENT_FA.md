# انتشار رابو

راهنمای فعلی و معتبر: [آپدیت آسان رابو](../deploy/README_FA.md).

- کد اصلی در main است؛ GitHub Actions خروجی آماده را در cpanel-release می‌سازد.
- cPanel شاخه cpanel-release را دریافت و از طریق .cpanel.yml منتشر می‌کند.
- انتشار بدون SSH با دو دکمه Update from Remote و Deploy HEAD Commit است.
- انتشار کاملاً خودکار با SSH اختصاصی و Secrets فقط پس از راه‌اندازی اولیه فعال می‌شود.
- بسته فعلی فقط frontend است. PHP، تنظیمات هاست، uploads و دیتابیس خودکار کپی نمی‌شوند.
- به‌دلیل اختلاف احتمالی schema نصب‌شده با schema مخزن، تغییر بک‌اند و مهاجرت داده نیازمند بررسی جداست.
- دستورالعمل AI Studio در ریشه مخزن، فایل AI_STUDIO_INSTRUCTIONS_FA.md است.
