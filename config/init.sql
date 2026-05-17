// config/init.sql
// Run this file once to set up your MySQL database.
// Command: mysql -u root -p < config/init.sql

-- ─── Create & select database ─────────────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS sdsc_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sdsc_db;

-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name   VARCHAR(120)  NOT NULL,
  age         TINYINT UNSIGNED NOT NULL,
  gender      ENUM('Male','Female','Other') NOT NULL,
  username    VARCHAR(60)   NOT NULL UNIQUE,
  password    VARCHAR(255)  NOT NULL,          -- bcrypt hash
  created_at  DATETIME      DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ─── Medical Slips ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medical_slips (
  id            VARCHAR(40)   PRIMARY KEY,     -- SLIP-xxxxx
  user_id       INT UNSIGNED  NOT NULL,
  disease_name  VARCHAR(120)  NOT NULL,
  confidence    TINYINT UNSIGNED NOT NULL,
  symptoms      JSON          NOT NULL,         -- ["fever","cough",...]
  doctor_info   JSON          NOT NULL,
  medicines     JSON          NOT NULL,
  routine       TEXT,
  diet          TEXT,
  created_at    DATETIME      DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Analysis Logs (optional analytics) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS analysis_logs (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED,
  symptoms      JSON          NOT NULL,
  top_disease   VARCHAR(120),
  confidence    TINYINT UNSIGNED,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─── Optional: seed admin user (password: admin1234) ─────────────────────────
-- INSERT IGNORE INTO users (full_name, age, gender, username, password)
-- VALUES ('Admin User', 30, 'Male', 'admin',
--         '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lHHC');
