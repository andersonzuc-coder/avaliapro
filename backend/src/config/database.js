const mysql = require('mysql2/promise');

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'exam_platform',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  multipleStatements: true,
};

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool(poolConfig);
  }
  return pool;
}

async function query(sql, params = []) {
  const p = getPool();
  const [results] = await p.execute(sql, params);
  return results;
}

async function initDatabase() {
  // Criar banco se não existir
  const conn = await mysql.createConnection({
    host: poolConfig.host,
    port: poolConfig.port,
    user: poolConfig.user,
    password: poolConfig.password,
  });

  await conn.execute(
    `CREATE DATABASE IF NOT EXISTS \`${poolConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await conn.end();

  // Criar tabelas
  const p = getPool();

  await p.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('admin', 'user') DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS pdf_uploads (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      filename VARCHAR(255) NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      extracted_text LONGTEXT,
      file_size INT,
      title VARCHAR(255),
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS exams (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      pdf_id INT,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      status ENUM('draft', 'active', 'closed') DEFAULT 'draft',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (pdf_id) REFERENCES pdf_uploads(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS questions (
      id INT PRIMARY KEY AUTO_INCREMENT,
      exam_id INT NOT NULL,
      question_text TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT NOT NULL,
      option_e TEXT NOT NULL,
      correct_answer ENUM('a','b','c','d','e') NOT NULL,
      difficulty ENUM('easy','medium','hard') NOT NULL DEFAULT 'medium',
      question_order INT NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS exam_corrections (
      id INT PRIMARY KEY AUTO_INCREMENT,
      exam_id INT NOT NULL,
      user_id INT NOT NULL,
      student_name VARCHAR(255) DEFAULT 'Aluno',
      image_path VARCHAR(500),
      ocr_result TEXT,
      score DECIMAL(5,2),
      total_questions INT,
      correct_answers INT,
      answers JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Migrações de colunas
  const migrations = [
    'ALTER TABLE questions ADD COLUMN image_path VARCHAR(500) NULL',
    'ALTER TABLE exams ADD COLUMN codigo_prova VARCHAR(100) NULL',
    'ALTER TABLE exams ADD COLUMN avaliacao VARCHAR(50) NULL',
    'ALTER TABLE exams ADD COLUMN chamada VARCHAR(30) NULL',
    'ALTER TABLE pdf_uploads ADD COLUMN num_pages INT DEFAULT 0',
  ];
  for (const sql of migrations) {
    try { await p.query(sql); } catch (e) { if (e.errno !== 1060) throw e; }
  }

  console.log('Banco de dados inicializado com sucesso');
  return p;
}

module.exports = { query, getPool, initDatabase };
