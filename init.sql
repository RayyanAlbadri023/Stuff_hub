-- This file runs automatically when the MySQL container starts for the first time
-- It creates all the tables needed for Stuffhub

CREATE DATABASE IF NOT EXISTS ebana_stuffhub;
USE ebana_stuffhub;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  firstName   VARCHAR(100)  NOT NULL,
  lastName    VARCHAR(100),
  email       VARCHAR(255)  NOT NULL UNIQUE,
  password    VARCHAR(255)  NOT NULL,
  phone       VARCHAR(20),
  role        ENUM('admin', 'employee') DEFAULT 'employee',
  resetToken  VARCHAR(255),
  resetExpiry DATETIME,
  createdAt   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Requests table (suggestions, appeals, resignations)
CREATE TABLE IF NOT EXISTS requests (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  userId    INT,
  name      VARCHAR(200),
  email     VARCHAR(255),
  type      ENUM('suggestion', 'appeal', 'resignation') NOT NULL,
  message   TEXT,
  status    ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
);

-- Vacations table
CREATE TABLE IF NOT EXISTS vacations (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  userId    INT,
  name      VARCHAR(200),
  email     VARCHAR(255),
  startDate DATE NOT NULL,
  endDate   DATE NOT NULL,
  days      INT,
  status    ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
);
