/**
 * Script de seed — executa de dentro da pasta backend/
 * Uso: cd backend && node ../database/seed.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'exam_platform',
  });

  try {
    // Admin
    const adminEmail = 'admin@examplatform.com';
    const adminPassword = 'Admin@123';
    const [existAdmin] = await conn.execute('SELECT id FROM users WHERE email = ?', [adminEmail]);
    if (existAdmin.length === 0) {
      const hashed = await bcrypt.hash(adminPassword, 12);
      await conn.execute(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        ['Administrador', adminEmail, hashed, 'admin']
      );
      console.log('Admin criado: ' + adminEmail + ' / ' + adminPassword);
    } else {
      console.log('Admin ja existe: ' + adminEmail);
    }

    // Usuário de teste
    const testEmail = 'professor@teste.com';
    const testPassword = 'Teste@123';
    const [existTest] = await conn.execute('SELECT id FROM users WHERE email = ?', [testEmail]);
    if (existTest.length === 0) {
      const hashed = await bcrypt.hash(testPassword, 12);
      await conn.execute(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        ['Professor Teste', testEmail, hashed, 'user']
      );
      console.log('Teste criado:  ' + testEmail + ' / ' + testPassword);
    } else {
      console.log('Teste ja existe: ' + testEmail);
    }

    console.log('\nPronto! Acesse http://localhost:5173');
  } finally {
    await conn.end();
  }
}

seed().catch(err => {
  console.error('Erro:', err.message);
  process.exit(1);
});
