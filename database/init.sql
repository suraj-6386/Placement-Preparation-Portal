-- =======================================================
-- Placement Preparation Portal - MySQL Database Setup
-- =======================================================
-- Run this file once to create the database and tables:
--   mysql -u root -p < database/init.sql
-- =======================================================

CREATE DATABASE IF NOT EXISTS skillprep_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE skillprep_db;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(50) DEFAULT '',
    college VARCHAR(200) DEFAULT '',
    course VARCHAR(150) DEFAULT '',
    skills TEXT DEFAULT NULL,
    photo VARCHAR(255) DEFAULT '',
    resume VARCHAR(255) DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_username (username),
    INDEX idx_user_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(64) NOT NULL UNIQUE,
    user_id VARCHAR(36) NULL,
    username VARCHAR(100) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session_token (token),
    INDEX idx_session_username (username),
    CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. User activity events for dashboard progress
CREATE TABLE IF NOT EXISTS activity_events (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    item_key VARCHAR(150) NOT NULL,
    score INT NULL,
    details JSON NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_activity_user_created (user_id, created_at),
    INDEX idx_activity_user_type (user_id, event_type),
    CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Help & Contact Queries Table
CREATE TABLE IF NOT EXISTS help_queries (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    subject VARCHAR(255) DEFAULT 'No subject',
    message TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. FAQs Table
CREATE TABLE IF NOT EXISTS faqs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Interview Questions Table
CREATE TABLE IF NOT EXISTS interview_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    subject VARCHAR(100) NULL,
    question TEXT NOT NULL,
    display_order INT DEFAULT 0,
    INDEX idx_interview_category (category),
    INDEX idx_interview_subject (subject)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Learning Resources Table
CREATE TABLE IF NOT EXISTS learning_resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    url VARCHAR(500) NOT NULL,
    INDEX idx_resource_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Practice Questions Table
CREATE TABLE IF NOT EXISTS practice_questions (
    id VARCHAR(50) PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    chapter VARCHAR(100) NOT NULL,
    question TEXT NOT NULL,
    options JSON NOT NULL,
    answer VARCHAR(500) NOT NULL,
    difficulty VARCHAR(20) DEFAULT NULL,
    INDEX idx_practice_category (category),
    INDEX idx_practice_chapter (chapter)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Mock Tests Table
CREATE TABLE IF NOT EXISTS mock_tests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    level VARCHAR(20) NOT NULL,
    set_index INT NOT NULL DEFAULT 0,
    questions JSON NOT NULL,
    INDEX idx_mock_category (category),
    INDEX idx_mock_level (level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Coding Challenges Table
CREATE TABLE IF NOT EXISTS coding_challenges (
    id VARCHAR(50) PRIMARY KEY,
    language VARCHAR(50) NOT NULL,
    difficulty VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    tags JSON DEFAULT NULL,
    starter_code TEXT DEFAULT NULL,
    test_cases JSON DEFAULT NULL,
    INDEX idx_challenge_language (language),
    INDEX idx_challenge_difficulty (difficulty)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =======================================================
-- NOTE: Users are created through the app's Register page.
-- No demo user is seeded here because passwords are
-- bcrypt-hashed at runtime.
-- =======================================================
