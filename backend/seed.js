require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function seed() {
  const cfg = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  };
  const dbName = process.env.DB_NAME || 'exam_platform';

  // 1. Criar banco
  let conn = await mysql.createConnection(cfg);
  await conn.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.end();
  console.log(`Banco '${dbName}' verificado/criado.`);

  // 2. Criar tabelas
  conn = await mysql.createConnection({ ...cfg, database: dbName });

  await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('admin','user') DEFAULT 'user',
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
      status ENUM('draft','active','closed') DEFAULT 'draft',
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
  console.log('Tabelas verificadas/criadas.');

  // 3. Criar usuários
  const users = [
    { name: 'Administrador', email: 'admin@examplatform.com', password: 'Admin@123', role: 'admin' },
    { name: 'Professor Teste', email: 'professor@teste.com', password: 'Teste@123', role: 'user' },
  ];

  for (const u of users) {
    const [exists] = await conn.execute('SELECT id FROM users WHERE email = ?', [u.email]);
    if (exists.length === 0) {
      const hashed = await bcrypt.hash(u.password, 12);
      await conn.execute(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [u.name, u.email, hashed, u.role]
      );
      console.log(`  [${u.role.padEnd(5)}] ${u.email}  =>  ${u.password}`);
    } else {
      console.log(`  Ja existe: ${u.email}`);
    }
  }

  await conn.end();
  console.log('\nSetup completo! Acesse http://localhost:5173');
}

seed().catch(err => { console.error('Erro:', err.message); process.exit(1); });
