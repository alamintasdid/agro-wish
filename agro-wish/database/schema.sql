-- =====================================================================
-- agroWish - Smart Agricultural Decision Support System
-- Course: SE-331 Software Engineering Design Capstone Project
-- Module: Database Schema & Authentication (Member 2: Most Tasnim Jahan Rifa)
-- Database Engine: MySQL 8.0+ / MariaDB
-- Default Character Set: utf8mb4 (Full Unicode & Bangla script support)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `agrowish_db`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `agrowish_db`;

-- Drop existing tables in reverse dependency order if re-initializing
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `feedbacks`;
DROP TABLE IF EXISTS `cost_references`;
DROP TABLE IF EXISTS `knowledge_items`;
DROP TABLE IF EXISTS `knowledge_sources`;
DROP TABLE IF EXISTS `farm_options`;
DROP TABLE IF EXISTS `recommendations`;
DROP TABLE IF EXISTS `crop_varieties`;
DROP TABLE IF EXISTS `crops`;
DROP TABLE IF EXISTS `resources`;
DROP TABLE IF EXISTS `lands`;
DROP TABLE IF EXISTS `farmer_profiles`;
DROP TABLE IF EXISTS `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- 1. USER TABLE (SRS Section 7.4: Core User Accounts)
-- ---------------------------------------------------------------------
CREATE TABLE `users` (
  `user_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `full_name` VARCHAR(100) NOT NULL COMMENT 'Full name of the user/farmer (SRS 7.4)',
  `email` VARCHAR(150) NOT NULL UNIQUE COMMENT 'Unique contact/login email',
  `phone` VARCHAR(20) NOT NULL COMMENT 'Bangladeshi mobile contact number',
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'Bcrypt salted password hash',
  `role` ENUM('FARMER', 'ADMIN') NOT NULL DEFAULT 'FARMER' COMMENT 'Access control role (FR-02)',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_email` (`email`),
  INDEX `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 2. FARMER_PROFILE TABLE (SRS Section 7.4 & FR-03, FR-04, FR-05, FR-06)
-- ---------------------------------------------------------------------
CREATE TABLE `farmer_profiles` (
  `profile_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL UNIQUE,
  `district` VARCHAR(50) DEFAULT NULL COMMENT 'District name in Bangladesh',
  `upazila` VARCHAR(50) DEFAULT NULL COMMENT 'Upazila / Sub-district',
  `land_size` DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Farm land size in decimals (শতক/শতাংশ)',
  `soil_type` ENUM('দোআঁশ', 'বেলে', 'এঁটেল', 'পলি') DEFAULT 'দোআঁশ' COMMENT 'Soil classification in Bangla',
  `water_availability` ENUM('উচ্চ', 'মাঝারি', 'স্বল্প') DEFAULT 'মাঝারি' COMMENT 'Water irrigation accessibility',
  `season` ENUM('রবি', 'খরিপ-১', 'খরিপ-২') DEFAULT 'রবি' COMMENT 'Current agricultural season',
  `budget` DECIMAL(12, 2) DEFAULT 0.00 COMMENT 'Farming budget in BDT (টাকা)',
  `has_pond` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Whether the farm includes a pond',
  `pond_size` DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Pond size in decimals if present',
  `existing_resources` JSON DEFAULT NULL COMMENT 'Resource inventory e.g. ["poultry", "dairy", "crop_residues", "compost"]',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_farmer_profiles_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_farmer_profiles_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 3. LAND TABLE (SRS Section 7.4: Specific Land Plots)
-- ---------------------------------------------------------------------
CREATE TABLE `lands` (
  `land_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `plot_name` VARCHAR(100) NOT NULL COMMENT 'Identifier label e.g. উত্তরের মাঠ বা বিলের জমি',
  `area_decimals` DECIMAL(10, 2) NOT NULL COMMENT 'Size in decimals (শতক)',
  `soil_type` ENUM('CLAY', 'SANDY', 'LOAMY', 'CLAY_LOAM', 'SANDY_LOAM', 'SILTY') NOT NULL DEFAULT 'LOAMY',
  `elevation_level` ENUM('HIGH_LAND', 'MEDIUM_HIGH', 'MEDIUM_LOW', 'LOW_LAND') NOT NULL DEFAULT 'MEDIUM_HIGH',
  `irrigation_facility` BOOLEAN NOT NULL DEFAULT TRUE,
  `ownership_status` ENUM('OWNED', 'LEASED', 'SHARED') NOT NULL DEFAULT 'OWNED',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_lands_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_lands_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 4. CROPS TABLE (SRS Section 7.4: Crop Reference Master)
-- ---------------------------------------------------------------------
CREATE TABLE `crops` (
  `crop_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `crop_name` VARCHAR(100) NOT NULL COMMENT 'Crop name in English (e.g. Boro Rice)',
  `bengali_name` VARCHAR(100) NOT NULL COMMENT 'Crop name in Bengali (e.g. বোরো ধান)',
  `season` ENUM('Kharif-1', 'Kharif-2', 'Rabi', 'Year-round') NOT NULL COMMENT 'Bangladeshi agricultural cropping season',
  `crop_category` VARCHAR(50) NOT NULL COMMENT 'Cereal, Pulse, Tuber, Oilseed, Cash crop',
  `recommended_soil` VARCHAR(150) NOT NULL COMMENT 'Optimal soil classification',
  `water_requirement` VARCHAR(100) NOT NULL COMMENT 'High, Medium, Moderate, Low water requirements',
  `avg_cost_per_decimal` DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Estimated production cost per decimal in BDT',
  `avg_revenue_per_decimal` DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Estimated gross revenue per decimal in BDT',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 5. CROP_VARIETIES TABLE (SRS Section 7.4: Certified Crop Varieties)
-- ---------------------------------------------------------------------
CREATE TABLE `crop_varieties` (
  `variety_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `crop_id` INT UNSIGNED NOT NULL,
  `variety_name` VARCHAR(120) NOT NULL COMMENT 'Official name e.g. BRRI dhan28, BARI Gom-33',
  `bengali_name` VARCHAR(120) DEFAULT NULL COMMENT 'বাংলা জাতের নাম',
  `duration_days` INT UNSIGNED NOT NULL COMMENT 'Maturity duration from seed to harvest',
  `yield_per_decimal_kg` DECIMAL(8, 2) NOT NULL COMMENT 'Estimated yield in kg per decimal',
  `recommended_regions` VARCHAR(255) DEFAULT 'All Bangladesh' COMMENT 'Suitable agro-ecological regions in BD',
  `pest_resistance_notes` TEXT DEFAULT NULL COMMENT 'Resistance to blast, blight, drought, or saline',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_varieties_crop`
    FOREIGN KEY (`crop_id`) REFERENCES `crops` (`crop_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_varieties_crop_id` (`crop_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 6. RECOMMENDATIONS TABLE (SRS Section 7.4: Decision Engine Results)
-- ---------------------------------------------------------------------
CREATE TABLE `recommendations` (
  `recommendation_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `request_data` JSON NOT NULL COMMENT 'Snapshot of inputs: land size, season, budget, location',
  `recommendation_type` ENUM('MAX_PROFIT', 'LOW_RISK', 'LOW_WATER', 'BALANCED') NOT NULL DEFAULT 'BALANCED',
  `explanation_bn` TEXT NOT NULL COMMENT 'Bengali rationalization and agricultural advice',
  `uncertainty_note` VARCHAR(255) DEFAULT NULL COMMENT 'Confidence level and weather risks',
  `model_version` VARCHAR(50) DEFAULT 'v1.0-rules-engine',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_recommendations_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_recommendations_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 7. FARM_OPTIONS TABLE (SRS Section 7.4: Ranked Comparison Options)
-- ---------------------------------------------------------------------
CREATE TABLE `farm_options` (
  `option_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `recommendation_id` INT UNSIGNED NOT NULL,
  `crop_id` INT UNSIGNED NOT NULL,
  `variety_id` INT UNSIGNED DEFAULT NULL,
  `estimated_cost` DECIMAL(12, 2) NOT NULL COMMENT 'Projected total input costs in BDT',
  `potential_return_min` DECIMAL(12, 2) NOT NULL COMMENT 'Minimum projected gross revenue in BDT',
  `potential_return_max` DECIMAL(12, 2) NOT NULL COMMENT 'Maximum projected gross revenue in BDT',
  `assumptions` TEXT DEFAULT NULL COMMENT 'Yield and market price basis',
  CONSTRAINT `fk_farm_options_recommendation`
    FOREIGN KEY (`recommendation_id`) REFERENCES `recommendations` (`recommendation_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_farm_options_crop`
    FOREIGN KEY (`crop_id`) REFERENCES `crops` (`crop_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_farm_options_variety`
    FOREIGN KEY (`variety_id`) REFERENCES `crop_varieties` (`variety_id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 8. AUDIT_LOGS TABLE (SRS Section 7.4: Security & Audit Tracking)
-- ---------------------------------------------------------------------
CREATE TABLE `audit_logs` (
  `log_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED DEFAULT NULL,
  `action` VARCHAR(100) NOT NULL COMMENT 'LOGIN, REGISTER, PROFILE_UPDATE, GENERATE_RECOMMENDATION',
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` VARCHAR(255) DEFAULT NULL,
  `logged_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_audit_logs_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_audit_logs_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- SEED DATA: Bangladeshi Seasonal Crops & Official Certified Varieties
-- Crops: Boro Rice, Aman Rice, Wheat, Potato, Maize
-- Sources: BRRI (Bangladesh Rice Research Institute), BARI (Bangladesh Agricultural Research Institute)
-- =====================================================================

INSERT INTO `crops` 
  (`crop_id`, `crop_name`, `bengali_name`, `season`, `crop_category`, `recommended_soil`, `water_requirement`, `avg_cost_per_decimal`, `avg_revenue_per_decimal`)
VALUES
  (1, 'Boro Rice', 'বোরো ধান', 'Rabi', 'Cereal', 'Clayey or Clay Loam', 'High (Irrigation mandatory)', 420.00, 680.00),
  (2, 'Aman Rice', 'আমন ধান', 'Kharif-2', 'Cereal', 'Clay Loam to Silty Loam', 'Moderate (Partially Rain-fed)', 320.00, 520.00),
  (3, 'Wheat', 'গম', 'Rabi', 'Cereal', 'Well-drained Loamy to Sandy Loam', 'Low to Moderate (2-3 irrigations)', 300.00, 480.00),
  (4, 'Potato', 'আলু', 'Rabi', 'Tuber', 'Friable Sandy Loam rich in organic matter', 'Moderate (Consistent moisture)', 950.00, 1600.00),
  (5, 'Maize', 'ভুট্টা', 'Rabi', 'Cereal', 'Fertile Sandy Loam with good drainage', 'Moderate', 450.00, 800.00);

INSERT INTO `crop_varieties`
  (`variety_id`, `crop_id`, `variety_name`, `bengali_name`, `duration_days`, `yield_per_decimal_kg`, `recommended_regions`, `pest_resistance_notes`)
VALUES
  -- Boro Rice Varieties
  (1, 1, 'BRRI dhan28', 'ব্রি ধান২৮', 140, 22.50, 'All Agro-Ecological Zones (AEZ)', 'Susceptible to neck blast in late sowing; early maturity'),
  (2, 1, 'BRRI dhan29', 'ব্রি ধান২৯', 160, 28.00, 'All irrigated low and medium lands', 'High yield potential; resistant to leaf blight'),
  (3, 1, 'BRRI dhan89', 'ব্রি ধান৮৯', 155, 30.00, 'Dhaka, Mymensingh, Rangpur, Rajshahi', 'Mega-variety replacement for BRRI dhan29 with higher yield'),
  (4, 1, 'Bangabandhu dhan100', 'বঙ্গবন্ধু ধান১০০', 148, 26.50, 'All regions of Bangladesh', 'Zinc-enriched (25.7 mg/kg zinc); pest tolerant'),

  -- Aman Rice Varieties
  (5, 2, 'BRRI dhan49', 'ব্রি ধান৪৯', 135, 20.00, 'Medium high to medium low land', 'Known as popular Nizershail alternative; good grain quality'),
  (6, 2, 'BRRI dhan75', 'ব্রি ধান৭৫', 115, 18.50, 'Flood-free upland and medium land', 'Short duration; fragrant rice; escape early drought/flood'),
  (7, 2, 'BR11 (Mukta)', 'বিআর১১ (মুক্তা)', 145, 22.00, 'Rainfed lowland across Bangladesh', 'Widely adapted mega variety; strong tillering ability'),

  -- Wheat Varieties
  (8, 3, 'BARI Gom-28', 'বারি গম-২৮', 105, 16.00, 'Rajshahi, Dinajpur, Jessore, Kushtia', 'Heat-tolerant and early maturing'),
  (9, 3, 'BARI Gom-33', 'বারি গম-৩৩', 110, 18.50, 'Southern and South-Western districts', 'First blast-resistant and bio-fortified zinc-rich wheat variety in Bangladesh'),

  -- Potato Varieties
  (10, 4, 'Diamant', 'ডায়মন্ট', 90, 110.00, 'Munshiganj, Bogura, Rangpur, Dinajpur', 'Dutch high-yielding table variety; oval and yellow flesh'),
  (11, 4, 'Cardinal', 'কার্ডিনাল', 90, 105.00, 'Munshiganj, Chandpur, Cumilla, Bogura', 'Red skin table potato; good storage quality'),
  (12, 4, 'Granola', 'গ্রানোলা', 85, 95.00, 'Rangpur, Nilphamari, Bogura', 'Round yellow variety; moderately resistant to late blight'),

  -- Maize Varieties
  (13, 5, 'BARI Hybrid Maize-9', 'বারি হাইব্রিড ভুট্টা-৯', 145, 42.00, 'Dinajpur, Chuadanga, Manikganj, Bogura', 'High yield hybrid; strong lodging resistance'),
  (14, 5, 'Pioneer P3396', 'পায়োনিয়ার পি৩৩৯৬', 140, 45.00, 'Northern and Western districts', 'Commercial high-performing hybrid; high cob filling rate');

