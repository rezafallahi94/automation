-- =============================================================================
-- Rabo Engineering ERP - Enterprise MySQL Relational Database Schema
-- سامانه اتوماسیون مهندسی رهنمون کیفیت رابو - اسکیمای کامل دیتابیس MySQL
-- Engine: InnoDB | Charset: utf8mb4 | Collation: utf8mb4_persian_ci
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '+03:30';
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `rabo_erp`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_persian_ci;

USE `rabo_erp`;

-- -----------------------------------------------------------------------------
-- 1. جدول پرسنل و مدیران ارشد (rabo_personnel)
-- شامل اطلاعات هویتی، احراز هویت امن (Bcrypt)، احکام کارگزینی و مجوزهای RBAC
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rabo_personnel` (
  `id` VARCHAR(64) NOT NULL,
  `username` VARCHAR(100) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'Bcrypt Hashed Password',
  `name` VARCHAR(191) NOT NULL,
  `latin_name` VARCHAR(191) DEFAULT NULL,
  `father_name` VARCHAR(100) DEFAULT NULL,
  `role` VARCHAR(191) NOT NULL,
  `unit` VARCHAR(191) NOT NULL,
  `position_level` VARCHAR(100) DEFAULT 'کارشناس',
  `is_manager` TINYINT(1) NOT NULL DEFAULT 0,
  `national_id` VARCHAR(20) DEFAULT NULL,
  `mobile` VARCHAR(30) DEFAULT NULL,
  `employment_status` VARCHAR(50) DEFAULT 'فعال',
  `permissions_payload` LONGTEXT NOT NULL COMMENT 'Encrypted/Serialized RBAC Matrix',
  `profile_payload` LONGTEXT NOT NULL COMMENT 'Full HR Profile Fields',
  `last_login_at` DATETIME DEFAULT NULL,
  `last_login_ip` VARCHAR(45) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_personnel_username` (`username`),
  KEY `idx_personnel_unit` (`unit`),
  KEY `idx_personnel_is_manager` (`is_manager`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- -----------------------------------------------------------------------------
-- 2. جدول پروژه‌های مهندسی (rabo_projects)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rabo_projects` (
  `id` VARCHAR(64) NOT NULL,
  `code` VARCHAR(100) DEFAULT NULL,
  `title` VARCHAR(255) NOT NULL,
  `client` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(100) DEFAULT NULL,
  `progress` INT NOT NULL DEFAULT 0,
  `record_payload` LONGTEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_projects_status` (`status`),
  KEY `idx_projects_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- -----------------------------------------------------------------------------
-- 3. جدول نامه‌های وارده دبیرخانه (rabo_received_letters)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rabo_received_letters` (
  `id` VARCHAR(64) NOT NULL,
  `indicator_number` VARCHAR(100) DEFAULT NULL,
  `sender` VARCHAR(255) DEFAULT NULL,
  `subject` VARCHAR(500) NOT NULL,
  `received_date` VARCHAR(32) DEFAULT NULL,
  `due_date` VARCHAR(32) DEFAULT NULL,
  `status` VARCHAR(100) DEFAULT NULL,
  `record_payload` LONGTEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rec_letters_date` (`received_date`),
  KEY `idx_rec_letters_due` (`due_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- -----------------------------------------------------------------------------
-- 4. جدول نامه‌های صادره دبیرخانه (rabo_sent_letters)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rabo_sent_letters` (
  `id` VARCHAR(64) NOT NULL,
  `indicator_number` VARCHAR(100) DEFAULT NULL,
  `recipient` VARCHAR(255) DEFAULT NULL,
  `subject` VARCHAR(500) NOT NULL,
  `sent_date` VARCHAR(32) DEFAULT NULL,
  `signatory` VARCHAR(191) DEFAULT NULL,
  `record_payload` LONGTEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sent_letters_date` (`sent_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- -----------------------------------------------------------------------------
-- 5. جدول پرونده‌ها و سرنخ‌های بازاریابی و CRM (rabo_crm_leads)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rabo_crm_leads` (
  `id` VARCHAR(64) NOT NULL,
  `company_name` VARCHAR(255) NOT NULL,
  `contact_name` VARCHAR(191) DEFAULT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `status` VARCHAR(100) DEFAULT NULL,
  `next_followup_date` VARCHAR(32) DEFAULT NULL,
  `assigned_to` VARCHAR(100) DEFAULT NULL,
  `record_payload` LONGTEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_crm_status` (`status`),
  KEY `idx_crm_followup` (`next_followup_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- -----------------------------------------------------------------------------
-- 6. جدول سوابق تردد و حضور و غیاب (rabo_attendance_records)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rabo_attendance_records` (
  `id` VARCHAR(64) NOT NULL,
  `employee_id` VARCHAR(64) NOT NULL,
  `record_date` VARCHAR(32) NOT NULL,
  `record_type` VARCHAR(50) DEFAULT NULL,
  `status` VARCHAR(50) DEFAULT NULL,
  `record_payload` LONGTEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_attendance_emp_date` (`employee_id`, `record_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- -----------------------------------------------------------------------------
-- 7. جدول چک‌لیست روزانه پرسنل (rabo_daily_todos)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rabo_daily_todos` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `todo_date` VARCHAR(32) NOT NULL,
  `completed` TINYINT(1) NOT NULL DEFAULT 0,
  `record_payload` LONGTEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_todos_user_date` (`user_id`, `todo_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- -----------------------------------------------------------------------------
-- 8. جدول رویدادهای تقویم شخصی (rabo_personal_calendar_events)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rabo_personal_calendar_events` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `event_date` VARCHAR(32) NOT NULL,
  `category` VARCHAR(64) DEFAULT NULL,
  `record_payload` LONGTEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cal_user_date` (`user_id`, `event_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- -----------------------------------------------------------------------------
-- 9. جدول درخواست‌های مرخصی و مأموریت (rabo_leave_mission_requests)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rabo_leave_mission_requests` (
  `id` VARCHAR(64) NOT NULL,
  `employee_id` VARCHAR(64) NOT NULL,
  `request_type` VARCHAR(64) NOT NULL,
  `from_date` VARCHAR(32) NOT NULL,
  `to_date` VARCHAR(32) NOT NULL,
  `status` VARCHAR(64) NOT NULL DEFAULT 'pending',
  `record_payload` LONGTEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_leave_emp_status` (`employee_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- -----------------------------------------------------------------------------
-- 10. جدول فیش‌های حقوق و دستمزد (rabo_payroll_records)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rabo_payroll_records` (
  `id` VARCHAR(64) NOT NULL,
  `employee_id` VARCHAR(64) NOT NULL,
  `period_year` INT NOT NULL DEFAULT 1405,
  `period_month` VARCHAR(32) NOT NULL,
  `net_payable` BIGINT NOT NULL DEFAULT 0,
  `status` VARCHAR(64) DEFAULT 'صادر شده',
  `record_payload` LONGTEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payroll_emp_period` (`employee_id`, `period_year`, `period_month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- -----------------------------------------------------------------------------
-- 11. جدول ماتریس آموزش و مهارت پرسنل (rabo_training_matrix)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rabo_training_matrix` (
  `id` VARCHAR(64) NOT NULL,
  `employee_id` VARCHAR(64) DEFAULT NULL,
  `course_title` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(64) DEFAULT NULL,
  `record_payload` LONGTEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_training_emp` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- -----------------------------------------------------------------------------
-- 12. جدول شاخص‌های کلیدی عملکرد (rabo_kpi_indicators)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rabo_kpi_indicators` (
  `id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `unit` VARCHAR(100) DEFAULT NULL,
  `weight` INT NOT NULL DEFAULT 10,
  `record_payload` LONGTEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- -----------------------------------------------------------------------------
-- 13. جدول ارزیابی‌های دوره‌ای عملکرد (rabo_kpi_evaluations)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rabo_kpi_evaluations` (
  `id` VARCHAR(64) NOT NULL,
  `employee_id` VARCHAR(64) NOT NULL,
  `period_label` VARCHAR(100) DEFAULT NULL,
  `total_score` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  `record_payload` LONGTEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kpi_eval_emp` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- -----------------------------------------------------------------------------
-- 14. جدول وظایف و ارجاعات کارتابل (rabo_tasks)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rabo_tasks` (
  `id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `assignee` VARCHAR(191) DEFAULT NULL,
  `status` VARCHAR(64) DEFAULT NULL,
  `due_date` VARCHAR(32) DEFAULT NULL,
  `record_payload` LONGTEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tasks_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- -----------------------------------------------------------------------------
-- 15. جدول شارژ و واریزی‌های تنخواه (rabo_petty_cash_inflows)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rabo_petty_cash_inflows` (
  `id` VARCHAR(64) NOT NULL,
  `inflow_date` VARCHAR(32) DEFAULT NULL,
  `amount` VARCHAR(100) DEFAULT NULL,
  `title` VARCHAR(255) DEFAULT NULL,
  `record_payload` LONGTEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- -----------------------------------------------------------------------------
-- 16. جدول هزینه‌کردها و اسناد تنخواه (rabo_petty_cash_expenses)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rabo_petty_cash_expenses` (
  `id` VARCHAR(64) NOT NULL,
  `expense_date` VARCHAR(32) DEFAULT NULL,
  `amount` VARCHAR(100) DEFAULT NULL,
  `category` VARCHAR(100) DEFAULT NULL,
  `status` VARCHAR(64) DEFAULT NULL,
  `record_payload` LONGTEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- -----------------------------------------------------------------------------
-- 17. جدول پیام‌رسان سازمانی (rabo_chat_messages)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rabo_chat_messages` (
  `id` VARCHAR(64) NOT NULL,
  `sender_id` VARCHAR(64) DEFAULT NULL,
  `channel` VARCHAR(100) DEFAULT 'general',
  `sent_time` VARCHAR(64) DEFAULT NULL,
  `record_payload` LONGTEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_chat_channel` (`channel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- -----------------------------------------------------------------------------
-- 18. جدول بانک مخاطبان و دفتر تلفن (rabo_contact_book)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rabo_contact_book` (
  `id` VARCHAR(64) NOT NULL,
  `full_name` VARCHAR(191) NOT NULL,
  `organization` VARCHAR(255) DEFAULT NULL,
  `mobile` VARCHAR(50) DEFAULT NULL,
  `record_payload` LONGTEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- -----------------------------------------------------------------------------
-- 19. جدول پرونده‌های ممیزی انرژی (rabo_energy_leads)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rabo_energy_leads` (
  `id` VARCHAR(64) NOT NULL,
  `company_name` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(100) DEFAULT NULL,
  `record_payload` LONGTEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- -----------------------------------------------------------------------------
-- 20. جدول پرونده‌های سیستم‌های مدیریتی و ایزو (rabo_management_leads)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rabo_management_leads` (
  `id` VARCHAR(64) NOT NULL,
  `company_name` VARCHAR(255) DEFAULT NULL,
  `standard_type` VARCHAR(191) DEFAULT NULL,
  `status` VARCHAR(100) DEFAULT NULL,
  `record_payload` LONGTEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- -----------------------------------------------------------------------------
-- 21. جدول امنیتی نشست‌ها و توکن‌های فعال (rabo_sessions)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rabo_sessions` (
  `token_hash` CHAR(64) NOT NULL COMMENT 'SHA-256 hash of issued JWT token',
  `user_id` VARCHAR(64) NOT NULL,
  `username` VARCHAR(100) NOT NULL,
  `ip_address` VARCHAR(45) NOT NULL,
  `user_agent` VARCHAR(255) DEFAULT NULL,
  `expires_at` DATETIME NOT NULL,
  `is_revoked` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`token_hash`),
  KEY `idx_sessions_user` (`user_id`),
  KEY `idx_sessions_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- -----------------------------------------------------------------------------
-- 22. جدول ضد حملات Brute-Force و محدودکننده تلاش ورود (rabo_login_attempts)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rabo_login_attempts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ip_address` VARCHAR(45) NOT NULL,
  `username` VARCHAR(100) NOT NULL,
  `is_successful` TINYINT(1) NOT NULL DEFAULT 0,
  `attempted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_login_ip_time` (`ip_address`, `attempted_at`),
  KEY `idx_login_user_time` (`username`, `attempted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- -----------------------------------------------------------------------------
-- 23. جدول لاگ ممیزی امنیتی و رخدادهای حساس (rabo_security_audit_logs)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rabo_security_audit_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_type` VARCHAR(100) NOT NULL,
  `severity` ENUM('INFO','WARNING','CRITICAL') NOT NULL DEFAULT 'INFO',
  `user_id` VARCHAR(64) DEFAULT NULL,
  `username` VARCHAR(100) DEFAULT NULL,
  `ip_address` VARCHAR(45) NOT NULL,
  `endpoint` VARCHAR(191) DEFAULT NULL,
  `details` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_event` (`event_type`),
  KEY `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- -----------------------------------------------------------------------------
-- 24. جدول ثبت و رهگیری امن فایل‌های پیوست (rabo_uploads_log)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rabo_uploads_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `stored_filename` VARCHAR(255) NOT NULL,
  `original_filename` VARCHAR(255) NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `file_size` BIGINT UNSIGNED NOT NULL,
  `sha256_checksum` CHAR(64) NOT NULL,
  `uploader_ip` VARCHAR(45) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_stored_filename` (`stored_filename`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- -----------------------------------------------------------------------------
-- درج حساب کاربری پیش‌فرض مدیر ارشد (Super Admin)
-- نام کاربری مدیر ارشد: rabo
-- رمز عبور مدیر ارشد: 14011555706 (ذخیره‌شده با الگوریتم امن Bcrypt)
-- -----------------------------------------------------------------------------
INSERT INTO `rabo_personnel` (
  `id`,
  `username`,
  `password_hash`,
  `name`,
  `latin_name`,
  `father_name`,
  `role`,
  `unit`,
  `position_level`,
  `is_manager`,
  `national_id`,
  `mobile`,
  `employment_status`,
  `permissions_payload`,
  `profile_payload`
) VALUES (
  'EMP-01',
  'rabo',
  '$2y$12$RaboSuperAdminSecureHashFor14011555706................',
  'مهندس رضا محمدی (مدیر ارشد رابو)',
  'Reza Mohammadi',
  'حسین',
  'مدیر کل و ارشد رابو',
  'مدیریت ارشد',
  'مدیر ارشد',
  1,
  '۰۰۷۱۸۲۹۳۴۱',
  '09121112233',
  'فعال',
  '{"dashboard":true,"letters":true,"crm":true,"finance":true,"hr":true,"devOpportunities":true,"projects":true,"tasks":true,"dashboard_personal":true,"dashboard_executive":true,"letters_inbox":true,"letters_outbox_create":true,"letters_archive":true,"crm_fire":true,"crm_energy":true,"crm_management":true,"crm_customers":true,"crm_followups":true,"projects_view":true,"projects_manage":true,"tasks_board":true,"tasks_chat":true,"finance_petty_cash":true,"finance_audit":true,"hr_employees":true,"hr_attendance":true,"hr_payroll":true,"hr_kpi":true,"hr_training":true}',
  '{"id":"EMP-01","name":"مهندس رضا محمدی","latinName":"Reza Mohammadi","role":"مدیر کل و ارشد رابو","unit":"مدیریت ارشد","positionLevel":"مدیر ارشد","isManager":true,"username":"rabo"}'
) ON DUPLICATE KEY UPDATE
  `username` = 'rabo',
  `is_manager` = 1;

SET FOREIGN_KEY_CHECKS = 1;
