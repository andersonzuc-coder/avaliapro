const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

const listUsers = async (req, res, next) => {
  try {
    const users = await query(
      'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC',
      []
    );
    res.json({ users });
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role = 'user' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
    }

    const existing = await query('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing.length > 0) return res.status(409).json({ error: 'Email já cadastrado' });

    const hashed = await bcrypt.hash(password, 12);
    const validRole = ['admin', 'user'].includes(role) ? role : 'user';

    const result = await query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name.trim(), email.toLowerCase().trim(), hashed, validRole]
    );

    res.status(201).json({
      user: { id: result.insertId, name: name.trim(), email: email.toLowerCase().trim(), role: validRole },
    });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { name, role, password } = req.body;
    const updates = [];
    const params = [];

    if (name) { updates.push('name = ?'); params.push(name.trim()); }
    if (role && ['admin', 'user'].includes(role)) { updates.push('role = ?'); params.push(role); }
    if (password && password.length >= 6) {
      const hashed = await bcrypt.hash(password, 12);
      updates.push('password = ?');
      params.push(hashed);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });

    params.push(req.params.id);
    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ message: 'Usuário atualizado com sucesso' });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'Você não pode deletar sua própria conta' });
    }
    const users = await query('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (users.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    await query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'Usuário deletado com sucesso' });
  } catch (error) {
    next(error);
  }
};

const getStats = async (req, res, next) => {
  try {
    const [[{ users }]] = await query('SELECT COUNT(*) AS users FROM users', []);
    const [[{ pdfs }]] = await query('SELECT COUNT(*) AS pdfs FROM pdf_uploads', []);
    const [[{ exams }]] = await query('SELECT COUNT(*) AS exams FROM exams', []);
    const [[{ corrections }]] = await query('SELECT COUNT(*) AS corrections FROM exam_corrections', []);
    res.json({ stats: { users, pdfs, exams, corrections } });
  } catch (error) {
    next(error);
  }
};

module.exports = { listUsers, createUser, updateUser, deleteUser, getStats };
