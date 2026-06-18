const { query } = require('../config/database');

const listTurmas = async (req, res, next) => {
  try {
    const turmas = await query(
      `SELECT t.*, COUNT(a.id) AS total_alunos
       FROM turmas t LEFT JOIN alunos a ON a.turma_id = t.id
       WHERE t.user_id = ? GROUP BY t.id ORDER BY t.name`,
      [req.user.id]
    );
    res.json({ turmas });
  } catch (e) { next(e); }
};

const createTurma = async (req, res, next) => {
  try {
    const { name, description = '' } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nome da turma é obrigatório' });
    const r = await query(
      'INSERT INTO turmas (user_id, name, description) VALUES (?, ?, ?)',
      [req.user.id, name.trim(), description.trim()]
    );
    const [turma] = await query('SELECT * FROM turmas WHERE id = ?', [r.insertId]);
    res.status(201).json({ turma });
  } catch (e) { next(e); }
};

const deleteTurma = async (req, res, next) => {
  try {
    const rows = await query('SELECT id FROM turmas WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Turma não encontrada' });
    await query('DELETE FROM turmas WHERE id = ?', [req.params.id]);
    res.json({ message: 'Turma deletada' });
  } catch (e) { next(e); }
};

const listAlunos = async (req, res, next) => {
  try {
    const rows = await query(
      'SELECT id FROM turmas WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Turma não encontrada' });
    const alunos = await query(
      'SELECT * FROM alunos WHERE turma_id = ? ORDER BY name',
      [req.params.id]
    );
    res.json({ alunos });
  } catch (e) { next(e); }
};

const addAluno = async (req, res, next) => {
  try {
    const { name, matricula = '' } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nome do aluno é obrigatório' });
    const rows = await query('SELECT id FROM turmas WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Turma não encontrada' });
    const r = await query(
      'INSERT INTO alunos (turma_id, name, matricula) VALUES (?, ?, ?)',
      [req.params.id, name.trim(), matricula.trim()]
    );
    const [aluno] = await query('SELECT * FROM alunos WHERE id = ?', [r.insertId]);
    res.status(201).json({ aluno });
  } catch (e) { next(e); }
};

const bulkAddAlunos = async (req, res, next) => {
  try {
    const { names } = req.body; // array de strings
    if (!Array.isArray(names) || !names.length) return res.status(400).json({ error: 'Lista de nomes vazia' });
    const rows = await query('SELECT id FROM turmas WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Turma não encontrada' });
    let inserted = 0;
    for (const raw of names) {
      const name = raw.trim();
      if (name) {
        await query('INSERT INTO alunos (turma_id, name) VALUES (?, ?)', [req.params.id, name]);
        inserted++;
      }
    }
    res.status(201).json({ inserted });
  } catch (e) { next(e); }
};

const deleteAluno = async (req, res, next) => {
  try {
    const rows = await query(
      'SELECT a.id FROM alunos a JOIN turmas t ON a.turma_id = t.id WHERE a.id = ? AND t.user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Aluno não encontrado' });
    await query('DELETE FROM alunos WHERE id = ?', [req.params.id]);
    res.json({ message: 'Aluno removido' });
  } catch (e) { next(e); }
};

module.exports = { listTurmas, createTurma, deleteTurma, listAlunos, addAluno, bulkAddAlunos, deleteAluno };
