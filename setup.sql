-- Run this in your MySQL database: ebana_stuffhub

USE ebana_stuffhub;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  firstName VARCHAR(100) NOT NULL,
  lastName VARCHAR(100),
  phone VARCHAR(30),
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('employee', 'admin') DEFAULT 'employee',
  resetToken VARCHAR(255) DEFAULT NULL,
  resetTokenExpiry DATETIME DEFAULT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Requests table (vacation, suggestion, appeal, resignation)
CREATE TABLE IF NOT EXISTS requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT DEFAULT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) DEFAULT '',
  type ENUM('vacation','suggestion','appeal','resignation') NOT NULL,
  message TEXT DEFAULT NULL,
  start DATE DEFAULT NULL,
  end DATE DEFAULT NULL,
  days INT DEFAULT NULL,
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
);
