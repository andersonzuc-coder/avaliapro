const { query } = require('../config/database');
const { generateExamQuestions } = require('../services/openaiService');

const generateExam = async (req, res, next) => {
  try {
    const { pdfId, title, numQuestions = 10 } = req.body;

    if (!pdfId || !title) {
      return res.status(400).json({ error: 'PDF e título são obrigatórios' });
    }

    const pdfs = await query(
      'SELECT * FROM pdf_uploads WHERE id = ? AND user_id = ?',
      [pdfId, req.user.id]
    );
    if (pdfs.length === 0) {
      return res.status(404).json({ error: 'PDF não encontrado' });
    }

    const pdf = pdfs[0];
    const textContent = pdf.extracted_text || '';

    if (textContent.trim().length < 100) {
      return res.status(400).json({
        error: 'O PDF não contém texto suficiente para gerar questões. Verifique se o PDF contém texto selecionável (não é uma imagem escaneada).',
      });
    }

    const { difficulty = 'mixed', instructions = '', codigo_prova = '', avaliacao = '', chamada = '' } = req.body;

    // Criar a prova no banco
    const examResult = await query(
      'INSERT INTO exams (user_id, pdf_id, title, status, codigo_prova, avaliacao, chamada) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, pdfId, title.trim(), 'draft', codigo_prova.trim(), avaliacao.trim(), chamada.trim()]
    );
    const examId = examResult.insertId;
    let questions;
    try {
      questions = await generateExamQuestions(textContent, parseInt(numQuestions) || 10, difficulty, instructions);
    } catch (aiError) {
      await query('DELETE FROM exams WHERE id = ?', [examId]);
      return res.status(502).json({
        error: 'Erro ao gerar questões com IA: ' + aiError.message,
      });
    }

    // Salvar questões
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await query(
        `INSERT INTO questions
         (exam_id, question_text, option_a, option_b, option_c, option_d, option_e, correct_answer, difficulty, question_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [examId, q.question, q.options.a, q.options.b, q.options.c, q.options.d, q.options.e,
         q.correctAnswer, q.difficulty, i + 1]
      );
    }

    await query('UPDATE exams SET status = ? WHERE id = ?', ['active', examId]);

    const exam = await fetchExamById(examId, req.user.id);
    res.status(201).json({ message: 'Prova gerada com sucesso!', exam });
  } catch (error) {
    next(error);
  }
};

const listExams = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const exams = isAdmin
      ? await query(
          `SELECT e.*, u.name AS user_name, p.original_name AS pdf_name,
                  (SELECT COUNT(*) FROM questions WHERE exam_id = e.id) AS question_count,
                  (SELECT COUNT(*) FROM exam_corrections WHERE exam_id = e.id) AS correction_count
           FROM exams e
           LEFT JOIN pdf_uploads p ON e.pdf_id = p.id
           LEFT JOIN users u ON e.user_id = u.id
           ORDER BY e.created_at DESC`
        )
      : await query(
          `SELECT e.*, p.original_name AS pdf_name,
                  (SELECT COUNT(*) FROM questions WHERE exam_id = e.id) AS question_count,
                  (SELECT COUNT(*) FROM exam_corrections WHERE exam_id = e.id) AS correction_count
           FROM exams e
           LEFT JOIN pdf_uploads p ON e.pdf_id = p.id
           WHERE e.user_id = ?
           ORDER BY e.created_at DESC`,
          [req.user.id]
        );
    res.json({ exams });
  } catch (error) {
    next(error);
  }
};

const getExam = async (req, res, next) => {
  try {
    const exam = await fetchExamById(req.params.id, req.user.id);
    if (!exam) return res.status(404).json({ error: 'Prova não encontrada' });
    res.json({ exam });
  } catch (error) {
    next(error);
  }
};

const updateExamStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['draft', 'active', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }
    const exams = await query(
      'SELECT id FROM exams WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (exams.length === 0) return res.status(404).json({ error: 'Prova não encontrada' });
    await query('UPDATE exams SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: 'Status atualizado' });
  } catch (error) {
    next(error);
  }
};

const deleteExam = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const exams = await query(
      isAdmin
        ? 'SELECT id FROM exams WHERE id = ?'
        : 'SELECT id FROM exams WHERE id = ? AND user_id = ?',
      isAdmin ? [req.params.id] : [req.params.id, req.user.id]
    );
    if (exams.length === 0) return res.status(404).json({ error: 'Prova não encontrada' });
    await query('DELETE FROM exams WHERE id = ?', [req.params.id]);
    res.json({ message: 'Prova deletada com sucesso' });
  } catch (error) {
    next(error);
  }
};

async function fetchExamById(examId, userId) {
  const exams = await query(
    `SELECT e.*, p.original_name AS pdf_name
     FROM exams e
     LEFT JOIN pdf_uploads p ON e.pdf_id = p.id
     WHERE e.id = ? AND e.user_id = ?`,
    [examId, userId]
  );
  if (exams.length === 0) return null;
  const exam = exams[0];
  exam.questions = await query(
    'SELECT * FROM questions WHERE exam_id = ? ORDER BY question_order',
    [examId]
  );
  return exam;
}

const uploadQuestionImage = async (req, res, next) => {
  try {
    const { questionId } = req.params;
    if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });

    const found = await query(
      `SELECT q.id FROM questions q JOIN exams e ON q.exam_id = e.id WHERE q.id = ? AND e.user_id = ?`,
      [questionId, req.user.id]
    );
    if (found.length === 0) return res.status(404).json({ error: 'Questão não encontrada' });

    const imagePath = `/uploads/questions/${req.file.filename}`;
    await query('UPDATE questions SET image_path = ? WHERE id = ?', [imagePath, questionId]);

    res.json({ imagePath });
  } catch (error) {
    next(error);
  }
};

const updateQuestion = async (req, res, next) => {
  try {
    const { questionId } = req.params;
    const { question_text, option_a, option_b, option_c, option_d, option_e, correct_answer, difficulty } = req.body;

    const found = await query(
      `SELECT q.id FROM questions q
       JOIN exams e ON q.exam_id = e.id
       WHERE q.id = ? AND e.user_id = ?`,
      [questionId, req.user.id]
    );
    if (found.length === 0) return res.status(404).json({ error: 'Questão não encontrada' });

    const { image_path } = req.body;
    await query(
      `UPDATE questions SET question_text=?, option_a=?, option_b=?, option_c=?, option_d=?, option_e=?, correct_answer=?, difficulty=?, image_path=? WHERE id=?`,
      [question_text, option_a, option_b, option_c, option_d, option_e, correct_answer, difficulty, image_path || null, questionId]
    );

    res.json({ message: 'Questão atualizada com sucesso' });
  } catch (error) {
    next(error);
  }
};

module.exports = { generateExam, listExams, getExam, updateExamStatus, deleteExam, updateQuestion, uploadQuestionImage };
