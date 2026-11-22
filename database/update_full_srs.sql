-- =====================================================================
-- agroWish - Full SRS Database Expansion & Bangladesh Seed Data
-- Course: SE-331 Software Engineering Design Capstone Project
-- Target Engine: MySQL 8.0+ (utf8mb4_unicode_ci)
-- Idempotent Migration: Safe to execute multiple times
-- =====================================================================

USE `agrowish_db`;

SET NAMES utf8mb4;

-- =====================================================================
-- 1. BACKWARD-COMPATIBLE ALTER STATEMENTS (MySQL 8.0 Safe Dynamic SQL)
-- =====================================================================

-- 1a. farmer_profiles.farming_goal
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'farmer_profiles' AND COLUMN_NAME = 'farming_goal'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `farmer_profiles` ADD COLUMN `farming_goal` VARCHAR(120) DEFAULT ''সুষম মুনাফা ও খাদ্য নিরাপত্তা'' AFTER `budget`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1b. farmer_profiles.risk_preference
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'farmer_profiles' AND COLUMN_NAME = 'risk_preference'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `farmer_profiles` ADD COLUMN `risk_preference` ENUM(''LOW'', ''MEDIUM'', ''HIGH'') DEFAULT ''MEDIUM'' AFTER `farming_goal`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1c. recommendations.expert_verification_notice
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recommendations' AND COLUMN_NAME = 'expert_verification_notice'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `recommendations` ADD COLUMN `expert_verification_notice` TEXT DEFAULT NULL AFTER `uncertainty_note`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1d. audit_logs.target
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'target'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `audit_logs` ADD COLUMN `target` VARCHAR(255) DEFAULT NULL AFTER `action`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1e. audit_logs.details
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'details'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `audit_logs` ADD COLUMN `details` JSON DEFAULT NULL AFTER `target`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =====================================================================
-- 2. NEW SRS ERD TABLES (CREATE TABLE IF NOT EXISTS)
-- =====================================================================

-- 2a. RESOURCE TABLE (FR-06, FR-11)
CREATE TABLE IF NOT EXISTS `resources` (
  `resource_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `profile_id` INT UNSIGNED DEFAULT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `resource_name` VARCHAR(120) NOT NULL COMMENT 'নাম যেমন: বাড়ির পাশের পুকুর, দুগ্ধবতী গাভী',
  `resource_type` ENUM('pond', 'livestock', 'poultry', 'crop_residue', 'organic_material', 'water') NOT NULL,
  `quantity` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `unit` VARCHAR(40) NOT NULL DEFAULT 'টি',
  `notes` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_resources_profile`
    FOREIGN KEY (`profile_id`) REFERENCES `farmer_profiles` (`profile_id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_resources_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_resources_user_id` (`user_id`),
  INDEX `idx_resources_type` (`resource_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2b. COST_ITEM TABLE (FR-14, FR-25)
CREATE TABLE IF NOT EXISTS `cost_items` (
  `cost_item_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `crop_id` INT UNSIGNED NOT NULL,
  `item_name` VARCHAR(100) NOT NULL COMMENT 'উপকরণের নাম যেমন: বীজ, সার, সেচ, শ্রমিক',
  `item_category` ENUM('seed', 'fertilizer', 'irrigation', 'labor', 'pesticide', 'other') NOT NULL DEFAULT 'other',
  `cost_min_per_decimal` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `cost_max_per_decimal` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `unit_note` VARCHAR(120) DEFAULT 'প্রতি শতক (টাকা)',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_cost_items_crop`
    FOREIGN KEY (`crop_id`) REFERENCES `crops` (`crop_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_cost_items_crop_id` (`crop_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2c. INTEGRATED_COMBINATION TABLE (FR-12, FR-26)
CREATE TABLE IF NOT EXISTS `integrated_combinations` (
  `combo_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `combo_name` VARCHAR(180) NOT NULL,
  `description` TEXT NOT NULL,
  `compatibility_rule` VARCHAR(255) NOT NULL COMMENT 'Comma-separated required resource_types e.g. pond,poultry',
  `est_cost_min` DECIMAL(12, 2) NOT NULL DEFAULT 5000.00,
  `est_cost_max` DECIMAL(12, 2) NOT NULL DEFAULT 15000.00,
  `est_return_min` DECIMAL(12, 2) NOT NULL DEFAULT 12000.00,
  `est_return_max` DECIMAL(12, 2) NOT NULL DEFAULT 28000.00,
  `risk_note` TEXT NOT NULL,
  `expert_verification_needed` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2d. WASTE_TO_VALUE_RULE TABLE (FR-13, FR-22, FR-26)
CREATE TABLE IF NOT EXISTS `waste_to_value_rules` (
  `rule_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `source_activity` VARCHAR(120) NOT NULL COMMENT 'Matched resource_type or crop source',
  `by_product` VARCHAR(150) NOT NULL,
  `target_activity` VARCHAR(150) NOT NULL,
  `usage_method` TEXT NOT NULL,
  `safety_note` TEXT NOT NULL,
  `est_cost_min` DECIMAL(10, 2) NOT NULL DEFAULT 500.00,
  `est_cost_max` DECIMAL(10, 2) NOT NULL DEFAULT 3000.00,
  `est_return_min` DECIMAL(10, 2) NOT NULL DEFAULT 2000.00,
  `est_return_max` DECIMAL(10, 2) NOT NULL DEFAULT 8000.00,
  `expert_verification_needed` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2e. RECOMMENDATION_ITEM TABLE (FR-08, FR-12, FR-13, FR-14, FR-15, FR-23, FR-24)
CREATE TABLE IF NOT EXISTS `recommendation_items` (
  `item_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `recommendation_id` INT UNSIGNED NOT NULL,
  `item_type` ENUM('CROP', 'INTEGRATED', 'WASTE_TO_VALUE') NOT NULL DEFAULT 'CROP',
  `title` VARCHAR(200) DEFAULT NULL,
  `crop_id` INT UNSIGNED DEFAULT NULL,
  `variety_id` INT UNSIGNED DEFAULT NULL,
  `combo_id` INT UNSIGNED DEFAULT NULL,
  `rule_id` INT UNSIGNED DEFAULT NULL,
  `est_cost_min` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `est_cost_max` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `est_return_min` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `est_return_max` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `confidence_score` DECIMAL(5, 2) NOT NULL DEFAULT 75.00,
  `reason` TEXT DEFAULT NULL,
  `assumptions` TEXT DEFAULT NULL,
  `safety_note` TEXT DEFAULT NULL,
  `expert_verification_needed` BOOLEAN NOT NULL DEFAULT FALSE,
  `metadata` JSON DEFAULT NULL,
  CONSTRAINT `fk_rec_items_rec`
    FOREIGN KEY (`recommendation_id`) REFERENCES `recommendations` (`recommendation_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_rec_items_crop`
    FOREIGN KEY (`crop_id`) REFERENCES `crops` (`crop_id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_rec_items_variety`
    FOREIGN KEY (`variety_id`) REFERENCES `crop_varieties` (`variety_id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_rec_items_combo`
    FOREIGN KEY (`combo_id`) REFERENCES `integrated_combinations` (`combo_id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_rec_items_rule`
    FOREIGN KEY (`rule_id`) REFERENCES `waste_to_value_rules` (`rule_id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_rec_items_rec_id` (`recommendation_id`),
  INDEX `idx_rec_items_type` (`item_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2f. KNOWLEDGE_DOCUMENT TABLE (FR-18, FR-20, FR-26, FR-29)
CREATE TABLE IF NOT EXISTS `knowledge_documents` (
  `doc_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `admin_id` INT UNSIGNED DEFAULT NULL,
  `title` VARCHAR(255) NOT NULL,
  `source` VARCHAR(200) NOT NULL,
  `category` VARCHAR(80) DEFAULT 'সাধারণ কৃষি',
  `keywords` VARCHAR(255) DEFAULT NULL,
  `content` TEXT NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_knowledge_admin`
    FOREIGN KEY (`admin_id`) REFERENCES `users` (`user_id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  FULLTEXT INDEX `ft_knowledge_search` (`title`, `keywords`, `content`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2g. CHAT_SESSION & CHAT_MESSAGE TABLES (FR-18, FR-19, FR-27, FR-28, FR-29)
CREATE TABLE IF NOT EXISTS `chat_sessions` (
  `session_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(160) DEFAULT 'নতুন কৃষি পরামর্শ আলোচনা',
  `started_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_chat_sessions_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_chat_sessions_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `chat_messages` (
  `message_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `session_id` INT UNSIGNED NOT NULL,
  `sender` ENUM('USER', 'ASSISTANT') NOT NULL,
  `message_text` TEXT NOT NULL,
  `source_title` VARCHAR(255) DEFAULT NULL,
  `source_org` VARCHAR(200) DEFAULT NULL,
  `is_fallback` BOOLEAN NOT NULL DEFAULT FALSE,
  `sent_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_chat_messages_session`
    FOREIGN KEY (`session_id`) REFERENCES `chat_sessions` (`session_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_chat_messages_session` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2h. FEEDBACK TABLE (FR-32)
CREATE TABLE IF NOT EXISTS `feedbacks` (
  `feedback_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `recommendation_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `rating` TINYINT NOT NULL DEFAULT 5,
  `is_helpful` BOOLEAN DEFAULT NULL,
  `comment` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_feedbacks_rec`
    FOREIGN KEY (`recommendation_id`) REFERENCES `recommendations` (`recommendation_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_feedbacks_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY `uq_feedback_rec_user` (`recommendation_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 3. SEED TEST ACCOUNTS (ADMIN & DEMO FARMER)
-- =====================================================================

-- Admin: admin@agrowish.com / Admin@123
INSERT IGNORE INTO `users` (`full_name`, `email`, `phone`, `password_hash`, `role`)
VALUES (
  'agroWish অ্যাডমিন (Admin)',
  'admin@agrowish.com',
  '01700000002',
  '$2a$10$AYrHDr9cwg88UK5/qUSHrOfzViuKPLrz.JxaZXulkxz/CE4QxsZRq',
  'ADMIN'
);

-- Admin alias: admin@agrowish.bd / Admin@123
INSERT IGNORE INTO `users` (`full_name`, `email`, `phone`, `password_hash`, `role`)
VALUES (
  'সিস্টেম অ্যাডমিন (agroWish)',
  'admin@agrowish.bd',
  '01700000001',
  '$2a$10$AYrHDr9cwg88UK5/qUSHrOfzViuKPLrz.JxaZXulkxz/CE4QxsZRq',
  'ADMIN'
);

-- Demo Farmer: farmer@agrowish.bd / Farmer@123
INSERT IGNORE INTO `users` (`full_name`, `email`, `phone`, `password_hash`, `role`)
VALUES (
  'মোঃ করিম উদ্দিন (ডেমো কৃষক)',
  'farmer@agrowish.bd',
  '01711223344',
  '$2a$10$Opk3mKUCgy6/kiyzxumiTenRz1jWO7PhhpdGQ3eorKKmkf/BrtzX2',
  'FARMER'
);

SET @demo_farmer_id := (SELECT `user_id` FROM `users` WHERE `email` = 'farmer@agrowish.bd' LIMIT 1);
SET @admin_user_id := (SELECT `user_id` FROM `users` WHERE `email` = 'admin@agrowish.bd' LIMIT 1);

-- Ensure demo farmer has a complete farm profile
INSERT IGNORE INTO `farmer_profiles` (
  `user_id`, `district`, `upazila`, `land_size`, `soil_type`,
  `water_availability`, `season`, `budget`, `farming_goal`, `risk_preference`,
  `has_pond`, `pond_size`, `existing_resources`
)
VALUES (
  @demo_farmer_id,
  'বগুড়া (Bogura)',
  'শেরপুর',
  50.00,
  'দোআঁশ',
  'উচ্চ',
  'রবি',
  35000.00,
  'সুষম মুনাফা ও জৈব সম্পদ ব্যবহার',
  'MEDIUM',
  1,
  10.00,
  '["dairy","poultry","crop_residues"]'
);

SET @demo_profile_id := (SELECT `profile_id` FROM `farmer_profiles` WHERE `user_id` = @demo_farmer_id LIMIT 1);

-- Seed sample resources for demo farmer only if none exist yet
INSERT INTO `resources` (`profile_id`, `user_id`, `resource_name`, `resource_type`, `quantity`, `unit`, `notes`)
SELECT @demo_profile_id, @demo_farmer_id, 'বাড়ির পাশের মাছের পুকুর', 'pond', 10.00, 'শতক', 'সারা বছর পানি থাকে'
WHERE @demo_farmer_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM `resources` WHERE `user_id` = @demo_farmer_id AND `resource_type` = 'pond');

INSERT INTO `resources` (`profile_id`, `user_id`, `resource_name`, `resource_type`, `quantity`, `unit`, `notes`)
SELECT @demo_profile_id, @demo_farmer_id, 'দেশি দুগ্ধবতী গাভী', 'livestock', 2.00, 'টি', 'দৈনিক ১৫-২০ কেজি গোবর পাওয়া যায়'
WHERE @demo_farmer_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM `resources` WHERE `user_id` = @demo_farmer_id AND `resource_type` = 'livestock');

INSERT INTO `resources` (`profile_id`, `user_id`, `resource_name`, `resource_type`, `quantity`, `unit`, `notes`)
SELECT @demo_profile_id, @demo_farmer_id, 'সোনালী মুরগি ও হাঁস', 'poultry', 30.00, 'টি', 'পোল্ট্রি লিটার কম্পোস্ট ও মাছের খাদ্যে ব্যবহারযোগ্য'
WHERE @demo_farmer_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM `resources` WHERE `user_id` = @demo_farmer_id AND `resource_type` = 'poultry');

-- =====================================================================
-- 4. ADDITIONAL CROP (MUSTARD) & COST ITEMS SEED DATA
-- =====================================================================

INSERT IGNORE INTO `crops`
  (`crop_id`, `crop_name`, `bengali_name`, `season`, `crop_category`, `recommended_soil`, `water_requirement`, `avg_cost_per_decimal`, `avg_revenue_per_decimal`)
VALUES
  (6, 'Mustard', 'সরিষা', 'Rabi', 'Oilseed', 'Loamy to Sandy Loam & Silty', 'Low (1-2 light irrigations)', 220.00, 480.00);

INSERT IGNORE INTO `crop_varieties`
  (`variety_id`, `crop_id`, `variety_name`, `bengali_name`, `duration_days`, `yield_per_decimal_kg`, `recommended_regions`, `pest_resistance_notes`)
VALUES
  (15, 6, 'BARI Sarisha-14', 'বারি সরিষা-১৪', 80, 6.50, 'Tangail, Sirajganj, Bogura, Jamalpur, Pabna', 'Short-duration yellow mustard; fits between Aman and Boro rice'),
  (16, 6, 'BARI Sarisha-17', 'বারি সরিষা-১৭', 85, 7.20, 'All Rabi mustard belts of Bangladesh', 'High oil content (44%) and Alternaria blight tolerant');

-- Cost Items for Crops 1-6 (BDT per decimal min/max)
INSERT IGNORE INTO `cost_items` (`cost_item_id`, `crop_id`, `item_name`, `item_category`, `cost_min_per_decimal`, `cost_max_per_decimal`, `unit_note`) VALUES
  -- Crop 1: Boro Rice (avg ~420)
  (1,  1, 'উচ্চফলনশীল বীজ ও চারা তৈরি', 'seed',       55.00,  75.00, 'প্রতি শতক (টাকা)'),
  (2,  1, 'সুষম সার (ইউরিয়া, টিএসপি, এমওপি, জিপসাম)', 'fertilizer', 120.00, 165.00, 'প্রতি শতক (টাকা)'),
  (3,  1, 'সেচ ও পানির পাম্প খরচ', 'irrigation', 95.00,  130.00, 'প্রতি শতক (টাকা)'),
  (4,  1, 'জমি চাষ, রোপণ ও ফসল কাটার শ্রমিক', 'labor', 95.00,  125.00, 'প্রতি শতক (টাকা)'),
  (5,  1, 'বালাইনাশক ও আগাছা দমন', 'pesticide', 20.00,  35.00, 'প্রতি শতক (টাকা)'),
  -- Crop 2: Aman Rice (avg ~320)
  (6,  2, 'আমন বীজ ও বীজতলা', 'seed', 45.00, 60.00, 'প্রতি শতক (টাকা)'),
  (7,  2, 'সুষম সার ও জৈব সার', 'fertilizer', 90.00, 125.00, 'প্রতি শতক (টাকা)'),
  (8,  2, 'সম্পূরক সেচ খরচ', 'irrigation', 40.00, 75.00, 'প্রতি শতক (টাকা)'),
  (9,  2, 'রোপণ, নিড়ানি ও কাটা শ্রমিক', 'labor', 90.00, 115.00, 'প্রতি শতক (টাকা)'),
  (10, 2, 'রোগবালাই দমন', 'pesticide', 15.00, 30.00, 'প্রতি শতক (টাকা)'),
  -- Crop 3: Wheat (avg ~300)
  (11, 3, 'প্রত্যায়িত গম বীজ (বারি জাত)', 'seed', 50.00, 68.00, 'প্রতি শতক (টাকা)'),
  (12, 3, 'সার ও বোরন প্রয়োগ', 'fertilizer', 90.00, 120.00, 'প্রতি শতক (টাকা)'),
  (13, 3, '২-৩টি হালকা সেচ', 'irrigation', 55.00, 75.00, 'প্রতি শতক (টাকা)'),
  (14, 3, 'জমি তৈরি ও মাড়াই শ্রমিক', 'labor', 75.00, 100.00, 'প্রতি শতক (টাকা)'),
  -- Crop 4: Potato (avg ~950)
  (15, 4, 'মানসম্মত বীজ আলু', 'seed', 340.00, 440.00, 'প্রতি শতক (টাকা)'),
  (16, 4, 'সুষম সার ও জৈব কম্পোস্ট', 'fertilizer', 220.00, 280.00, 'প্রতি শতক (টাকা)'),
  (17, 4, 'নিয়মিত আর্দ্রতা ও সেচ', 'irrigation', 95.00, 130.00, 'প্রতি শতক (টাকা)'),
  (18, 4, 'বেড তৈরি, মাটি তোলা ও সংগ্রহ শ্রমিক', 'labor', 160.00, 210.00, 'প্রতি শতক (টাকা)'),
  (19, 4, 'নাবি ধসা প্রতিরোধী ছত্রাকনাশক', 'pesticide', 65.00, 95.00, 'প্রতি শতক (টাকা)'),
  -- Crop 5: Maize (avg ~450)
  (20, 5, 'হাইব্রিড ভুট্টা বীজ', 'seed', 80.00, 110.00, 'প্রতি শতক (টাকা)'),
  (21, 5, 'ইউরিয়া, টিএসপি, পটাশ ও জিংক সার', 'fertilizer', 140.00, 185.00, 'প্রতি শতক (টাকা)'),
  (22, 5, 'সেচ ব্যবস্থাপনা', 'irrigation', 85.00, 115.00, 'প্রতি শতক (টাকা)'),
  (23, 5, 'শ্রমিক ও মোচা ছাড়ানো খরচ', 'labor', 100.00, 135.00, 'প্রতি শতক (টাকা)'),
  -- Crop 6: Mustard (avg ~220)
  (24, 6, 'সরিষা বীজ (বারি সরিষা)', 'seed', 25.00, 40.00, 'প্রতি শতক (টাকা)'),
  (25, 6, 'সার ও সালফার/বোরন', 'fertilizer', 75.00, 100.00, 'প্রতি শতক (টাকা)'),
  (26, 6, '১-২টি হালকা সেচ', 'irrigation', 35.00, 50.00, 'প্রতি শতক (টাকা)'),
  (27, 6, 'জমি তৈরি ও মাড়াই শ্রমিক', 'labor', 55.00, 80.00, 'প্রতি শতক (টাকা)');

-- =====================================================================
-- 5. INTEGRATED FARMING COMBINATIONS SEED DATA (FR-12)
-- =====================================================================

INSERT IGNORE INTO `integrated_combinations`
  (`combo_id`, `combo_name`, `description`, `compatibility_rule`, `est_cost_min`, `est_cost_max`, `est_return_min`, `est_return_max`, `risk_note`, `expert_verification_needed`)
VALUES
  (
    1,
    'পুকুরপাড়ে সবজি ও কার্প জাতীয় মাছের সমন্বিত চাষ',
    'পুকুরের পাড়ে লাউ, শিম, কুমড়া, পেঁপে ও কলা মাচা করে চাষ করলে পাড়ের মাটির সঠিক ব্যবহার হয় এবং পুকুরে রুই, কাতলা, মৃগেল ও তেলাপিয়া চাষ থেকে দ্বিগুণ আয় পাওয়া যায়।',
    'pond',
    8000.00, 18000.00, 22000.00, 45000.00,
    'অতিবৃষ্টিতে পুকুরপাড় ভেঙে যাওয়া এবং পানির অক্সিজেন কমে যাওয়ার ঝুঁকি থাকতে পারে; পাড়ে অতিরিক্ত ছায়া এড়াতে মাচা সীমিত রাখুন।',
    1
  ),
  (
    2,
    'পুকুরের ওপর হাঁস-মুরগির ঘর ও সমন্বিত মাছ চাষ',
    'পুকুরের পাড়ে বা ওপর বাঁশের মাচায় হাঁস/মুরগির ঘর নির্মাণ করলে মুরগির বিষ্ঠা সরাসরি পুকুরে প্রাকৃতিক খাদ্য (প্লাঙ্কটন) তৈরি করে, যা মাছের কৃত্রিম খাদ্য খরচ ২৫-৩০% কমায়।',
    'pond,poultry',
    12000.00, 28000.00, 32000.00, 65000.00,
    'অতিরিক্ত বিষ্ঠা পুকুরের পানিতে অ্যামোনিয়া ও অক্সিজেন স্বল্পতা তৈরি করতে পারে। প্রতি শতকে মুরগির সংখ্যা সীমিত রাখা এবং মাঝে মাঝে চুন প্রয়োগ জরুরি।',
    1
  ),
  (
    3,
    'গবাদিপশু, বায়োগ্যাস/কেঁচো সার ও উচ্চফলনশীল ফসল চাষ',
    'গরু/মহিষের গোবর থেকে প্রথমে বায়োগ্যাস বা কেঁচো সার (ভার্মিকম্পোস্ট) উৎপাদন করে তা ফসলের জমিতে প্রয়োগ করলে রাসায়নিক সারের খরচ ৩০-৩৫% সাশ্রয় হয় এবং মাটির উর্বরতা বাড়ে।',
    'livestock',
    6000.00, 15000.00, 18000.00, 36000.00,
    'কাঁচা গোবর সরাসরি ফসলে প্রয়োগ করলে পোকার উপদ্রব বাড়তে পারে; কমপক্ষে ৩০-৪৫ দিন পচানোর পর ব্যবহার করুন।',
    1
  ),
  (
    4,
    'ধানক্ষেতে সমন্বিত মাছ ও হাঁস চাষ (Rice-Fish-Duck)',
    'জলাবদ্ধ বা মাঝারি নিচু আমন/বোরো ধানক্ষেতে এক পাশে মিনি গর্ত (রিফিউজ) রেখে তেলাপিয়া, শিং বা সরপুঁটি এবং ক্ষেতে হাঁস চরালে হাঁস আগাছা ও ক্ষতিকর পোকা খেয়ে ফেলে।',
    'water,poultry',
    5500.00, 12000.00, 14000.00, 28000.00,
    'ধানক্ষেতে মাছ ও হাঁস থাকা অবস্থায় কোনো বিষাক্ত রাসায়নিক কীটনাশক ব্যবহার করা যাবে না।',
    1
  ),
  (
    5,
    'গবাদিপশু ও জৈব সার ভিত্তিক বাণিজ্যিক সবজি খামার',
    'খামারের গোবর ও ফসলের উচ্ছিষ্ট থেকে ট্রাইকো-কম্পোস্ট তৈরি করে আলু বা শীতকালীন সবজি চাষে ব্যবহার করলে রাসায়নিক সারের ব্যয় কমে এবং নিরাপদ সবজির বাজারদর বেশি পাওয়া যায়।',
    'livestock,organic_material',
    7000.00, 16000.00, 20000.00, 40000.00,
    'সবজিতে ছত্রাকজনিত রোগ প্রতিরোধে ট্রাইকোডার্মা সমৃদ্ধ সুপচিত কম্পোস্ট ব্যবহার নিশ্চিত করুন।',
    1
  ),
  (
    6,
    'পুকুরের পানি দিয়ে সেচ ও পাড়ে ডাল/তৈলবীজ সাথী ফসল',
    'রবি মৌসুমে গম বা সরিষা চাষের জন্য পুকুরের সঞ্চিত পানি দিয়ে স্বল্প খরচে ১-২টি সম্পূরক সেচ প্রদান এবং পুকুরপাড়ে স্বল্পমেয়াদী শাকসবজি উৎপাদন।',
    'pond,water',
    4500.00, 11000.00, 12000.00, 24000.00,
    'খরা মৌসুমে পুকুরের পানির স্তর ৩ ফুটের নিচে নেমে গেলে সেচ ব্যবহারে সতর্ক থাকতে হবে যেন মাছ ক্ষতিগ্রস্ত না হয়।',
    1
  );

-- =====================================================================
-- 6. WASTE-TO-VALUE RULES SEED DATA (FR-13, FR-22)
-- =====================================================================

INSERT IGNORE INTO `waste_to_value_rules`
  (`rule_id`, `source_activity`, `by_product`, `target_activity`, `usage_method`, `safety_note`, `est_cost_min`, `est_cost_max`, `est_return_min`, `est_return_max`, `expert_verification_needed`)
VALUES
  (
    1,
    'livestock',
    'গরু/মহিষের গোবর (Cow Dung)',
    'কেঁচো সার (Vermicompost) ও বায়োগ্যাস স্লারি',
    'ছায়াযুক্ত চৌবাচ্চা বা রিং-স্ল্যাবে ১৫ দিন আংশিক পচানো গোবরের সাথে লাল কেঁচো (Eisenia fetida) ছেড়ে দিলে ৪৫-৬০ দিনে উন্নত কেঁচো সার তৈরি হয়।',
    'সতর্কতা: কাঁচা গরম গোবরে সরাসরি কেঁচো ছাড়লে কেঁচো মারা যাবে; গোবর ঠাণ্ডা ও ছায়াযুক্ত অবস্থায় রাখুন এবং শিশুদের নাগালের বাইরে হাত-ধোয়ার ব্যবস্থা রাখুন।',
    1500.00, 4000.00, 5000.00, 14000.00, 1
  ),
  (
    2,
    'poultry',
    'হাঁস-মুরগির বিষ্ঠা (Poultry Litter)',
    'পচানো জৈব সার ও পুকুরের প্লাঙ্কটন খাদ্য',
    'পোল্ট্রি বিষ্ঠার সাথে সমপরিমাণ ধানের তুষ/খড় এবং জল মিশিয়ে ৩০ দিন ঢেকে পচিয়ে ফসলের বেড তৈরিতে প্রয়োগ করুন অথবা পরিমিত হারে পুকুরে প্রয়োগ করুন।',
    'সতর্কতা: অপচনকৃত তাজা পোল্ট্রি লিটার ফসলের শিকড় পুড়িয়ে দিতে পারে এবং অ্যান্টিবায়োটিক বা রোগজীবাণু ছড়াতে পারে। ব্যবহারের সময় মাস্ক ও গ্লাভস পরুন।',
    800.00, 2500.00, 3000.00, 8500.00, 1
  ),
  (
    3,
    'crop_residue',
    'ধানের খড় ও নাড়া (Rice Straw & Stubble)',
    'ঝিনুক মাশরুম (Oyster Mushroom) চাষ ও ইউএমএস গো-খাদ্য',
    'পরিষ্কার শুকনো ধানের খড় ছোট টুকরো করে কেটে ৬০-৭০°C গরম পানিতে জীবাণুমুক্ত করে পলিপ্যাকে মাশরুম স্পন বপন করলে ২৫-৩০ দিনে ফলন পাওয়া যায়। অবশিষ্ট খড় ইউএমএস (ইউরিয়া-চিটাগুড়-খড়) হিসেবে গবাদিপশুকে খাওয়ানো যায়।',
    'সতর্কতা: খড় মাঠে পোড়াবেন না এতে মাটির অণুজীব ধ্বংস হয়। মাশরুমের জন্য ছত্রাকমুক্ত শুকনো খড় ব্যবহার করুন এবং ইউএমএস তৈরিতে ইউরিয়া অনুপাত প্রাণিসম্পদ কর্মকর্তার নির্দেশমতো মাপুন।',
    1200.00, 3500.00, 4500.00, 12000.00, 1
  ),
  (
    4,
    'organic_material',
    'সবজির উচ্ছিষ্ট, কচুরিপানা ও খামারের আবর্জনা',
    'ট্রাইকো-কম্পোস্ট (Tricho-Compost)',
    'কচুরিপানা, সবজির খোসা, গোবর ও ট্রাইকোডার্মা ভিরিডি ছত্রাক স্তরে স্তরে গর্তে বা হাউসে সাজিয়ে ৩৫-৪০ দিনে জৈব ছত্রাকনাশক সমৃদ্ধ কম্পোস্ট উৎপাদন করুন।',
    'সতর্কতা: প্লাস্টিক, কাচ বা রোগাক্রান্ত মরা গাছ (যেমন নাবি ধসা আক্রান্ত আলু গাছ) কম্পোস্টের গর্তে ফেলবেন না, এতে পরবর্তী ফসলে রোগ ছড়াতে পারে।',
    1000.00, 3000.00, 3500.00, 9000.00, 1
  ),
  (
    5,
    'pond',
    'পুকুরের তলদেশের পচা কাদা (Pond Bottom Silt)',
    'পুকুরপাড়ের সবজি ও ফলের বেড সার',
    'শুকনো মৌসুমে পুকুর সেচে তলদেশের জৈবসমৃদ্ধ উপরের ২-৩ ইঞ্চি কাদা তুলে পাড়ের সবজি ও পেঁপে বাগানের গোড়ায় প্রয়োগ করুন।',
    'সতর্কতা: পুকুরের কাদা অম্লীয় বা সালফারযুক্ত হতে পারে; মাটির পিএইচ অনুযায়ী সামান্য চুন মিশিয়ে এবং রোদে শুকিয়ে ব্যবহার করুন।',
    500.00, 1800.00, 2000.00, 6000.00, 1
  ),
  (
    6,
    'crop_residue',
    'ভুট্টার ডাঁটা ও সরিষার খৈল (Maize Stalk & Mustard Cake)',
    'মালচিং জৈব আবরণ ও পচানো তরল খৈল সার',
    'ভুট্টার কাটা ডাঁটা সবজি ক্ষেতে মালচিং (আর্দ্রতা ধরে রাখা) হিসেবে এবং সরিষার খৈল ৭-১০ দিন পানিতে পচিয়ে তরল জৈব সার হিসেবে প্রয়োগ করুন।',
    'সতর্কতা: না পচানো কাঁচা সরিষার খৈল সরাসরি গাছের গোড়ায় দিলে মাটিতে ছত্রাক ও পিঁপড়ার আক্রমণ হতে পারে।',
    600.00, 2000.00, 2500.00, 7000.00, 1
  );

-- =====================================================================
-- 7. CURATED BANGLA KNOWLEDGE BASE DOCUMENTS SEED DATA (FR-20, FR-29)
-- =====================================================================

INSERT IGNORE INTO `knowledge_documents` (`doc_id`, `admin_id`, `title`, `source`, `category`, `keywords`, `content`) VALUES
  (
    1, @admin_user_id,
    'বোরো ধান চাষ ও সুষম সার ব্যবস্থাপনা (ব্রি ধান২৮, ২৯, ৮৯ ও বঙ্গবন্ধু ধান১০০)',
    'বাংলাদেশ ধান গবেষণা ইনস্টিটিউট (BRRI)',
    'দানাদার ফসল',
    'বোরো ধান boro rice brri dhan28 dhan29 dhan89 bangabandhu 100 সার ইউরিয়া টিএসপি পটাশ জিংক সেচ',
    'বোরো মৌসুমে এঁটেল ও দোআঁশ মাটিতে ব্রি ধান৮৯ (ফলন শতকে প্রায় ৩০ কেজি) এবং জিংক সমৃদ্ধ বঙ্গবন্ধু ধান১০০ চাষ অত্যন্ত লাভজনক। চারা রোপণের জন্য ৩৫-৪০ দিন বয়সের সুস্থ চারা ২০x১৫ সেমি দূরত্বে রোপণ করুন। শতক প্রতি ইউরিয়া ১.১ কেজি (তিন কিস্তিতে: রোপণের ১৫, ৩০ ও ৪৫ দিন পর), টিএসপি ৪০০ গ্রাম, এমওপি ৫০০ গ্রাম এবং জিপসাম ৪৫০ গ্রাম প্রয়োগ করুন। ব্লাস্ট রোগ প্রতিরোধে জমিতে পর্যায়ক্রমে ভেজানো ও শুকানো (AWD) সেচ পদ্ধতি অনুসরণ করুন।'
  ),
  (
    2, @admin_user_id,
    'আমন ধান চাষ ও স্বল্পমেয়াদী জাত নির্বাচন (ব্রি ধান৪৯, ব্রি ধান৭৫ ও বিআর১১)',
    'বাংলাদেশ ধান গবেষণা ইনস্টিটিউট (BRRI)',
    'দানাদার ফসল',
    'আমন ধান aman rice brri dhan49 dhan75 br11 খরিপ-২ বৃষ্টি বন্যা',
    'খরিপ-২ মৌসুমে মধ্যম উঁচু জমিতে ব্রি ধান৭৫ মাত্র ১১০-১১৫ দিনে পাকে, ফলে আমন কাটার পর একই জমিতে অনায়াসে সরিষা বা আলু চাষ করা যায়। ব্রি ধান৪৯ মাঝারি ও নিচু জমির জন্য অত্যন্ত উপযোগী এবং নাজিরশাইল ধানের মতো সরু চাল দেয়। শতক প্রতি ইউরিয়া ৬৫০-৭৫০ গ্রাম, টিএসপি ৩০০ গ্রাম এবং এমওপি ৩৫০ গ্রাম ব্যবহার করুন।'
  ),
  (
    3, @admin_user_id,
    'আলু চাষ ও নাবি ধসা (Late Blight) রোগ প্রতিরোধ নির্দেশিকা',
    'বাংলাদেশ কৃষি গবেষণা ইনস্টিটিউট (BARI)',
    'কন্দজাত সবজি',
    'আলু potato late blight নাবি ধসা মড়ক ডায়মন্ট কার্ডিনাল গ্রানোলা ছত্রাকনাশক',
    'রবি মৌসুমে বেলে-দোআঁশ মাটিতে ডায়মন্ট ও কার্ডিনাল আলু শতকে ৯৫-১১০ কেজি পর্যন্ত ফলন দেয়। কুয়াশাচ্ছন্ন ও মেঘলা আবহাওয়ায় আলুর নাবি ধসা (মড়ক) রোগের ঝুঁকি বাড়ে। প্রতিরোধমূলক ব্যবস্থা হিসেবে আক্রান্ত গাছ তুলে মাটিতে পুঁতে ফেলুন এবং ম্যানকোজেব (২ গ্রাম/লিটার) বা অনুমোদিত ছত্রাকনাশক ৭-১০ দিন পরপর স্প্রে করুন। সেচ দেওয়ার সময় নালা ভিজিয়ে অতিরিক্ত পানি নিষ্কাশনের ব্যবস্থা রাখুন।'
  ),
  (
    4, @admin_user_id,
    'গম চাষ ও ব্লাস্ট রোগ প্রতিরোধী বারি গম-৩৩ ব্যবস্থাপনা',
    'বাংলাদেশ গম ও ভুট্টা গবেষণা ইনস্টিটিউট (BWMRI / BARI)',
    'দানাদার ফসল',
    'গম wheat blast বারি গম ৩৩ bari gom 33 28 সেচ বপন',
    'কম সেচ সুবিধাযুক্ত দোআঁশ ও বেলে-দোআঁশ জমিতে রবি মৌসুমে বোরো ধানের পরিবর্তে গম চাষ অত্যন্ত সাশ্রয়ী। ব্লাস্ট রোগ প্রতিরোধী এবং জিংক সমৃদ্ধ বারি গম-৩৩ বপনের উপযুক্ত সময় মধ্য নভেম্বর থেকে প্রথম সপ্তাহ ডিসেম্বর। গমের সারা জীবনকালে মাত্র ২-৩টি সেচ প্রয়োজন: প্রথম সেচ বপনের ১৭-২১ দিন পর (তিন পাতা অবস্থায়), দ্বিতীয় সেচ শীষ বের হওয়ার সময় এবং তৃতীয় সেচ দানা বাঁধার সময়।'
  ),
  (
    5, @admin_user_id,
    'ভুট্টা চাষ ও সমন্বিত পুষ্টি ব্যবস্থাপনা (বারি হাইব্রিড ভুট্টা-৯)',
    'বাংলাদেশ কৃষি গবেষণা ইনস্টিটিউট (BARI)',
    'অর্থকরী ফসল',
    'ভুট্টা maize corn bari hybrid 9 পোল্ট্রি খাদ্য সার',
    'পোল্ট্রি ও মৎস্য খাদ্যের ব্যাপক চাহিদার কারণে রবি ও খরিপ-১ মৌসুমে হাইব্রিড ভুট্টা চাষে উচ্চ মুনাফা পাওয়া যায়। শতক প্রতি ইউরিয়া ২ কেজি (তিন কিস্তিতে), টিএসপি ১ কেজি, এমওপি ৮০০ গ্রাম ও জিংক সালফেট ৫০ গ্রাম ব্যবহার করুন। মোচা আসার সময় এবং দানা বাঁধার সময় অবশ্যই সেচ নিশ্চিত করুন।'
  ),
  (
    6, @admin_user_id,
    'স্বল্পমেয়াদী সরিষা চাষ (বারি সরিষা-১৪ ও ১৭): আমন ও বোরোর মাঝে বোনাস ফসল',
    'বাংলাদেশ কৃষি গবেষণা ইনস্টিটিউট (BARI)',
    'তৈলবীজ',
    'সরিষা mustard bari sarisha 14 17 তেল মধু মৌমাছি',
    'আমন ধান কাটার পর এবং বোরো ধান রোপণের আগে মাত্র ৮০-৮৫ দিনের পতিত সময়ে বারি সরিষা-১৪ বা বারি সরিষা-১৭ চাষ করে শতকে ৬.৫-৭.২ কেজি সরিষা পাওয়া যায়। সরিষা ক্ষেতের পাশে মৌবাক্স স্থাপন করলে পরাগায়নের ফলে ফলন ১৫-২০% বৃদ্ধি পায় এবং বাড়তি মধু পাওয়া যায়। বোরন ও সালফার সার ব্যবহার করলে দানায় তেলের পরিমাণ বাড়ে।'
  ),
  (
    7, @admin_user_id,
    'পুকুরপাড়ে সবজি ও সমন্বিত মাছ-হাঁস চাষ পদ্ধতি',
    'মৎস্য অধিদপ্তর (DoF) ও কৃষি সম্প্রসারণ অধিদপ্তর (DAE)',
    'সমন্বিত খামার',
    'পুকুর মাছ সবজি হাঁস মুরগি সমন্বিত চাষ pond integrated fish poultry dyke',
    'একই পুকুরে রুই, কাতলা, মৃগেল, সিলভার কার্প ও তেলাপিয়া চাষের পাশাপাশি পাড়ে মাচা করে লাউ, শিম, করলা ও পেঁপে চাষ করা যায়। পুকুরের পাড়ে মুরগির ঘর রাখলে বিষ্ঠা থেকে প্রাকৃতিক প্লাঙ্কটন তৈরি হয়। তবে প্রতি শতকে সর্বোচ্চ ৩-৪টি হাঁস/মুরগির বেশি রাখা উচিত নয় এবং মাসে একবার শতকে ২৫০ গ্রাম হারে চুন প্রয়োগ করে পানির পিএইচ স্বাভাবিক রাখতে হবে।'
  ),
  (
    8, @admin_user_id,
    'কেঁচো সার (Vermicompost) ও ট্রাইকো-কম্পোস্ট উৎপাদন ও প্রয়োগ',
    'মৃত্তিকা সম্পদ উন্নয়ন ইনস্টিটিউট (SRDI) ও DAE',
    'জৈব সার ও বর্জ্য ব্যবস্থাপনা',
    'কেঁচো সার গোবর ভার্মিকম্পোস্ট ট্রাইকো কম্পোস্ট জৈব সার vermicompost cow dung compost',
    'গরু/মহিষের গোবর থেকে কেঁচো সার (ভার্মিকম্পোস্ট) তৈরি করলে রাসায়নিক সারের ব্যবহার ২৫-৩৫% কমে যায়। রিং-স্ল্যাবে ১৫ দিন পচানো ঠাণ্ডা গোবরে লাল কেঁচো ছেড়ে ৪৫-৬০ দিনে ঝুরঝুরে জৈব সার পাওয়া যায়। ট্রাইকো-কম্পোস্ট মাটির ফিউজারিয়াম ও স্কেলেরোশিয়াম ছত্রাকজনিত গোড়া পচা রোগ দমনে কার্যকর ভূমিকা রাখে।'
  ),
  (
    9, @admin_user_id,
    'ধানের খড় থেকে ঝিনুক মাশরুম চাষ ও ইউএমএস গো-খাদ্য তৈরি',
    'কৃষি তথ্য সার্ভিস (AIS) ও প্রাণিসম্পদ অধিদপ্তর (DLS)',
    'জৈব সার ও বর্জ্য ব্যবস্থাপনা',
    'খড় নাড়া মাশরুম ঝিনুক মাশরুম ইউএমএস গরু খাদ্য straw mushroom ums cattle feed',
    'ধানের খড় না পুড়িয়ে ৩-৪ ইঞ্চি করে কেটে ৬০-৭০ ডিগ্রি সেলসিয়াস গরম পানিতে ১ ঘণ্টা ভিজিয়ে জীবাণুমুক্ত করুন। অতঃপর পলিপ্যাকে মাশরুমের বীজ (স্পন) বপন করলে মাত্র ২৫ দিনে পুষ্টিকর ঝিনুক মাশরুম সংগ্রহ শুরু হয়। গবাদিপশুর জন্য খড়ের পুষ্টিগুণ বাড়াতে ১০০ কেজি খড়ে ৩ কেজি ইউরিয়া ও ১৫ কেজি চিটাগুড় পানিতে মিশিয়ে ইউএমএস তৈরি করা যায় (প্রাণিসম্পদ কর্মকর্তার পরামর্শ অনুযায়ী)।'
  ),
  (
    10, @admin_user_id,
    'মাটি পরীক্ষা, সেচ সাশ্রয়ী পদ্ধতি ও খরা ব্যবস্থাপনা',
    'মৃত্তিকা সম্পদ উন্নয়ন ইনস্টিটিউট (SRDI)',
    'মাটি ও পানি ব্যবস্থাপনা',
    'মাটি পরীক্ষা পিএইচ চুন সেচ খরা awd soil test irrigation water',
    'বৈজ্ঞানিক উপায়ে সার সাশ্রয় করতে চাষের পূর্বে উপজেলা কৃষি অফিসে বা SRDI ভ্রাম্যমাণ গবেষণাগারে মাটি পরীক্ষা করানো অত্যন্ত জরুরি। অম্লীয় মাটিতে (pH < 5.5) জমি চাষের সময় ডলোচুন প্রয়োগ করলে ফসলের পুষ্টি গ্রহণ ক্ষমতা বাড়ে। খরা বা স্বল্প পানি প্রাপ্যতা অঞ্চলে মালচিং এবং ফোঁটা সেচ (ড্রিপ ইরিগেশন) ব্যবহারে ৫০% পর্যন্ত পানি সাশ্রয় সম্ভব।'
  );


-- =====================================================================
-- 8. EXPANDED MAJOR BANGLADESH CROPS (TOMATO, LENTIL, JUTE) & KNOWLEDGE
-- =====================================================================

INSERT IGNORE INTO `crops`
  (`crop_id`, `crop_name`, `bengali_name`, `season`, `crop_category`, `recommended_soil`, `water_requirement`, `avg_cost_per_decimal`, `avg_revenue_per_decimal`)
VALUES
  (7, 'Tomato', 'টমেটো', 'Rabi', 'Vegetable', 'Well-drained Loamy to Sandy Loam', 'Moderate (Consistent moisture)', 780.00, 1550.00),
  (8, 'Lentil', 'মসুর ডাল', 'Rabi', 'Pulse', 'Loamy to Silty & Clay Loam', 'Low (Residual soil moisture)', 230.00, 510.00),
  (9, 'Jute', 'পাট', 'Kharif-1', 'Cash crop', 'Loamy to Silty Loam', 'Moderate (Rain-fed)', 360.00, 620.00);

INSERT IGNORE INTO `crop_varieties`
  (`variety_id`, `crop_id`, `variety_name`, `bengali_name`, `duration_days`, `yield_per_decimal_kg`, `recommended_regions`, `pest_resistance_notes`)
VALUES
  (17, 7, 'BARI Tomato-14', 'বারি টমেটো-১৪', 95, 130.00, 'Cumilla, Bogura, Jashore, Rajshahi, Dhaka', 'Semi-indeterminate winter variety; bacterial wilt tolerant'),
  (18, 7, 'BARI Tomato-15', 'বারি টমেটো-১৫', 100, 135.00, 'All Rabi tomato belts of Bangladesh', 'Good shelf life and TYLCV virus tolerant'),
  (19, 8, 'BARI Masur-6', 'বারি মসুর-৬', 108, 7.80, 'Faridpur, Jashore, Kushtia, Pabna, Rajshahi', 'Stemphylium blight and rust resistant'),
  (20, 8, 'BARI Masur-8', 'বারি মসুর-৮', 110, 8.20, 'South-Western and Northern pulse zones', 'Bio-fortified iron & zinc enriched lentil variety'),
  (21, 9, 'BJRI Tossa Pat-8 (Robi-1)', 'বিজেআরআই তোষা পাট-৮', 115, 13.50, 'Faridpur, Manikganj, Tangail, Jamalpur, Rangpur', 'High fiber strength; resistant to stem rot'),
  (22, 9, 'O-9897', 'ও-৯৮৯৭', 120, 12.80, 'All major jute-growing districts', 'Popular early-sowing tossa jute variety');

INSERT IGNORE INTO `cost_items` (`cost_item_id`, `crop_id`, `item_name`, `item_category`, `cost_min_per_decimal`, `cost_max_per_decimal`, `unit_note`) VALUES
  -- Crop 7: Tomato
  (28, 7, 'উচ্চফলনশীল টমেটো চারা ও বেড প্রস্তুতি', 'seed', 170.00, 230.00, 'প্রতি শতক (টাকা)'),
  (29, 7, 'জৈব কম্পোস্ট ও সুষম সার', 'fertilizer', 190.00, 250.00, 'প্রতি শতক (টাকা)'),
  (30, 7, 'খুঁটি, বাঁশ, সুতা ও বালাইনাশক', 'pesticide', 160.00, 220.00, 'প্রতি শতক (টাকা)'),
  (31, 7, 'সেচ ও ফসল সংগ্রহ শ্রমিক', 'labor', 160.00, 210.00, 'প্রতি শতক (টাকা)'),
  -- Crop 8: Lentil
  (32, 8, 'প্রত্যায়িত মসুর বীজ (বারি মসুর)', 'seed', 45.00, 65.00, 'প্রতি শতক (টাকা)'),
  (33, 8, 'সুষম সার ও রাইজোবিয়াম অণুজীব সার', 'fertilizer', 60.00, 85.00, 'প্রতি শতক (টাকা)'),
  (34, 8, 'হালকা সেচ ও আগাছা দমন', 'irrigation', 30.00, 45.00, 'প্রতি শতক (টাকা)'),
  (35, 8, 'চাষ, বপন ও মাড়াই শ্রমিক', 'labor', 65.00, 90.00, 'প্রতি শতক (টাকা)'),
  -- Crop 9: Jute
  (36, 9, 'তোষা পাট বীজ ও সারিবদ্ধ বপন', 'seed', 35.00, 50.00, 'প্রতি শতক (টাকা)'),
  (37, 9, 'সার ব্যবস্থাপনা (ইউরিয়া, টিএসপি, এমওপি)', 'fertilizer', 85.00, 115.00, 'প্রতি শতক (টাকা)'),
  (38, 9, 'নিড়ানি ও গাছ পাতলাকরণ শ্রমিক', 'labor', 120.00, 165.00, 'প্রতি শতক (টাকা)'),
  (39, 9, 'পাট কাটা, জাগ দেওয়া ও আঁশ ছাড়ানো', 'other', 80.00, 120.00, 'প্রতি শতক (টাকা)');

INSERT IGNORE INTO `knowledge_documents` (`doc_id`, `admin_id`, `title`, `source`, `category`, `keywords`, `content`) VALUES
  (
    11, @admin_user_id,
    'টমেটো (বারি টমেটো-১৪, ১৫) ও মসুর ডাল (বারি মসুর-৮) চাষ নির্দেশিকা',
    'বাংলাদেশ কৃষি গবেষণা ইনস্টিটিউট (BARI)',
    'সবজি ও ডাল ফসল',
    'টমেটো tomato bari tomato 14 15 মসুর ডাল lentil masur 6 8 উইল্ট ব্লাইট',
    'রবি মৌসুমে সুনিষ্কাশিত দোআঁশ মাটিতে বারি টমেটো-১৪ ও ১৫ চাষ করে শতকে ১৩০ কেজি পর্যন্ত ফলন পাওয়া যায়; ঢলে পড়া রোগ এড়াতে জৈব ট্রাইকো-কম্পোস্ট ব্যবহার করুন। কম সেচ ও স্বল্প পুঁজিতে মসুর ডাল (বারি মসুর-৮) চাষ লাভজনক; বপনের আগে বীজ রাইজোবিয়াম অণুজীব সার দিয়ে শোধন করলে ইউরিয়া খরচ সাশ্রয় হয়।'
  ),
  (
    12, @admin_user_id,
    'উন্নত তোষা পাট চাষ ও রিবন রেটিং পদ্ধতিতে আঁশ পচানো (বিজেআরআই তোষা পাট-৮)',
    'বাংলাদেশ পাট গবেষণা ইনস্টিটিউট (BJRI)',
    'অর্থকরী ফসল',
    'পাট jute bjri tossa pat 8 o-9897 খরিপ-১ জাগ রিবন রেটিং আঁশ',
    'খরিপ-১ (চৈত্র-বৈশাখ) মৌসুমে দোআঁশ ও পলি মাটিতে বিজেআরআই তোষা পাট-৮ বপন করলে শতকে ১২-১৩.৫ কেজি উন্নতমানের আঁশ পাওয়া যায়। জলাশয়ে পানি কম থাকলে রিবন রেটিং পদ্ধতিতে পাটের ছাল ছাড়িয়ে অল্প পানিতে পচালে উজ্জ্বল সোনালি আঁশ পাওয়া যায় এবং পচন সময় অর্ধেক কমে।'
  );
