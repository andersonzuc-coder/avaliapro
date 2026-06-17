-- Plataforma de Provas — Schema MySQL
-- Execute este arquivo para criar o banco manualmente
-- Ou use o servidor Node que cria automaticamente ao iniciar

CREATE DATABASE IF NOT EXISTS exam_platform
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE exam_platform;

CREATE TABLE IF NOT EXISTS users (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  name         VARCHAR(255) NOT NULL,
  email        VARCHAR(255) UNIQUE NOT NULL,
  password     VARCHAR(255) NOT NULL,
  role         ENUM('admin', 'user') DEFAULT 'user',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pdf_uploads (
  id             INT PRIMARY KEY AUTO_INCREMENT,
  user_id        INT NOT NULL,
  filename       VARCHAR(255) NOT NULL,
  original_name  VARCHAR(255) NOT NULL,
  file_path      VARCHAR(500) NOT NULL,
  extracted_text LONGTEXT,
  file_size      INT,
  title          VARCHAR(255),
  description    TEXT,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS exams (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  user_id     INT NOT NULL,
  pdf_id      INT,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  status      ENUM('draft', 'active', 'closed') DEFAULT 'draft',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (pdf_id)  REFERENCES pdf_uploads(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS questions (
  id             INT PRIMARY KEY AUTO_INCREMENT,
  exam_id        INT NOT NULL,
  question_text  TEXT NOT NULL,
  option_a       TEXT NOT NULL,
  option_b       TEXT NOT NULL,
  option_c       TEXT NOT NULL,
  option_d       TEXT NOT NULL,
  option_e       TEXT NOT NULL,
  correct_answer ENUM('a','b','c','d','e') NOT NULL,
  difficulty     ENUM('easy','medium','hard') NOT NULL DEFAULT 'medium',
  question_order INT NOT NULL DEFAULT 1,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS exam_corrections (
  id               INT PRIMARY KEY AUTO_INCREMENT,
  exam_id          INT NOT NULL,
  user_id          INT NOT NULL,
  student_name     VARCHAR(255) DEFAULT 'Aluno',
  image_path       VARCHAR(500),
  ocr_result       TEXT,
  score            DECIMAL(5,2),
  total_questions  INT,
  correct_answers  INT,
  answers          JSON,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
