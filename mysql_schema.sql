-- MySQL schema for the Family Tree & Ancestor Portal
-- Run this against your MySQL database before starting the backend.
-- Default database name: family_tree_portal

CREATE DATABASE IF NOT EXISTS family_tree_portal
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE family_tree_portal;

-- Users table (replaces Firebase Auth)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(128) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) DEFAULT NULL,
  display_name VARCHAR(255) DEFAULT NULL,
  google_id VARCHAR(255) DEFAULT NULL,
  dob VARCHAR(128) DEFAULT NULL,
  gender VARCHAR(64) DEFAULT NULL,
  created_at BIGINT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verification_otp VARCHAR(6) DEFAULT NULL,
  INDEX idx_users_email (email),
  INDEX idx_users_google_id (google_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Family members (replaces Firestore members collection)
CREATE TABLE IF NOT EXISTS family_members (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  birthdate TEXT DEFAULT NULL,
  birthplace VARCHAR(255) DEFAULT NULL,
  gender ENUM('male','female','other') NOT NULL,
  relationship_to_root VARCHAR(128) DEFAULT NULL,
  parents JSON DEFAULT NULL,
  siblings JSON DEFAULT NULL,
  children JSON DEFAULT NULL,
  contact_phone TEXT DEFAULT NULL,
  contact_email TEXT DEFAULT NULL,
  linked_user_id VARCHAR(128) DEFAULT NULL,
  address TEXT DEFAULT NULL,
  privacy ENUM('private','family','public') NOT NULL DEFAULT 'private',
  is_ancestor BOOLEAN NOT NULL DEFAULT FALSE,
  photos JSON DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at BIGINT NOT NULL,
  access_controls JSON DEFAULT NULL,
  advanced_privacy JSON DEFAULT NULL,
  synced BOOLEAN DEFAULT FALSE,
  pending_sync ENUM('create','update','delete') DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_members_user_id (user_id),
  INDEX idx_members_user_id_synced (user_id, synced),
  INDEX idx_members_pending_sync (pending_sync)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Historical documents (replaces Firestore docs collection)
CREATE TABLE IF NOT EXISTS historical_documents (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT DEFAULT NULL,
  date VARCHAR(32) DEFAULT NULL,
  file_data LONGTEXT DEFAULT NULL,
  tags JSON DEFAULT NULL,
  linked_member_ids JSON DEFAULT NULL,
  created_at BIGINT NOT NULL,
  synced BOOLEAN DEFAULT FALSE,
  pending_sync ENUM('create','update','delete') DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_docs_user_id (user_id),
  INDEX idx_docs_user_id_synced (user_id, synced),
  INDEX idx_docs_pending_sync (pending_sync)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Anniversary reminders (replaces Firestore reminders collection)
CREATE TABLE IF NOT EXISTS anniversary_reminders (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  member_id VARCHAR(128) NOT NULL,
  title VARCHAR(255) NOT NULL,
  date VARCHAR(32) DEFAULT NULL,
  type ENUM('birthday','wedding','death','anniversary') NOT NULL,
  remind_days_before INT NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  synced BOOLEAN DEFAULT FALSE,
  pending_sync ENUM('create','update','delete') DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_reminders_user_id (user_id),
  INDEX idx_reminders_user_id_synced (user_id, synced),
  INDEX idx_reminders_pending_sync (pending_sync)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lineage access requests (replaces Firestore lineage_requests collection)
CREATE TABLE IF NOT EXISTS lineage_access_requests (
  id VARCHAR(128) PRIMARY KEY,
  from_user_id VARCHAR(128) NOT NULL,
  from_user_email VARCHAR(255) NOT NULL,
  to_user_id VARCHAR(128) NOT NULL,
  member_id VARCHAR(128) NOT NULL,
  member_name VARCHAR(255) DEFAULT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  allowed_fields JSON DEFAULT NULL,
  created_at BIGINT NOT NULL,
  FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_requests_to_user_id (to_user_id),
  INDEX idx_requests_from_user_id (from_user_id),
  INDEX idx_requests_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- System-wide settings (replaces Firestore system_settings collection)
CREATE TABLE IF NOT EXISTS system_settings (
  id VARCHAR(128) PRIMARY KEY,
  data JSON NOT NULL,
  updated_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User subscriptions (replaces Firestore user_subscriptions collection)
CREATE TABLE IF NOT EXISTS user_subscriptions (
  user_id VARCHAR(128) PRIMARY KEY,
  data JSON NOT NULL,
  updated_at BIGINT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contact messages (replaces Firestore contact_messages collection)
CREATE TABLE IF NOT EXISTS contact_messages (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(128) DEFAULT NULL,
  name VARCHAR(255) DEFAULT NULL,
  email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) DEFAULT NULL,
  message TEXT NOT NULL,
  status ENUM('open','in_progress','resolved') NOT NULL DEFAULT 'open',
  created_at BIGINT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_messages_status (status),
  INDEX idx_messages_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Donations (replaces Firestore donations collection)
CREATE TABLE IF NOT EXISTS donations (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(128) DEFAULT NULL,
  email VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(8) NOT NULL,
  status ENUM('pending','completed','failed') NOT NULL DEFAULT 'pending',
  razorpay_order_id VARCHAR(255) DEFAULT NULL,
  razorpay_payment_id VARCHAR(255) DEFAULT NULL,
  razorpay_signature VARCHAR(255) DEFAULT NULL,
  created_at BIGINT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_donations_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
