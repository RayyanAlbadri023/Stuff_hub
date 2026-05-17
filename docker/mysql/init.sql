-- Initial schema for Ibana StuffHub
-- Runs automatically when the MySQL container starts for the first time.

CREATE DATABASE IF NOT EXISTS ebana_stuffhub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ebana_stuffhub;

CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  firstName   VARCHAR(100) NOT NULL,
  lastName    VARCHAR(100),
  email       VARCHAR(255) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  phone       VARCHAR(30),
  role        ENUM('employee','admin') NOT NULL DEFAULT 'employee',
  resetToken  VARCHAR(255) DEFAULT NULL,
  resetTokenExpiry DATETIME DEFAULT NULL,
  createdAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS requests (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  userId    INT,
  name      VARCHAR(200) NOT NULL DEFAULT 'Employee',
  email     VARCHAR(255) NOT NULL DEFAULT '',
  type      ENUM('suggestion','appeal','resignation') NOT NULL,
  message   TEXT,
  status    ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS vacations (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  userId    INT,
  name      VARCHAR(200) NOT NULL DEFAULT 'Employee',
  email     VARCHAR(255) NOT NULL DEFAULT '',
  startDate DATE,
  endDate   DATE,
  days      INT,
  status    ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
);
