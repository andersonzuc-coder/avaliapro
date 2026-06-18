const fs = require('fs');
const { query } = require('../config/database');
const { performOCR } = require('../services/ocrService');

const correctExam = async (req, res, next) => {
  try {
    const { examId, studentName } = req.body;

    if (!examId) return res.status(400).json({ error: 'ID da prova é obrigatório' });
    if (!req.file) return res.status(400).json({ error: 'Imagem da prova respondida é obrigatória' });

    const exams = await query(
      'SELECT * FROM exams WHERE id = ? AND user_id = ?',
      [examId, req.user.id]
    );
    if (exams.length === 0) return res.status(404).json({ error: 'Prova não encontrada' });

    const questions = await query(
      'SELECT id, question_order, correct_answer FROM questions WHERE exam_id = ? ORDER BY question_order',
      [examId]
    );
    if (questions.length === 0) return res.status(400).json({ error: 'Esta prova não possui questões' });

    const imagePath = req.file.path;
    let ocrResult = '';
    let studentAnswers = {};

    try {
      ocrResult = await performOCR(imagePath);
      studentAnswers = parseAnswers(ocrResult, questions.length);
    } catch (ocrErr) {
      console.error('Erro no OCR:', ocrErr.message);
      ocrResult = 'Não foi possível processar a imagem automaticamente.';
    }

    const details = questions.map(q => {
      const answer = studentAnswers[q.question_order] || null;
      const isCorrect = answer !== null && answer.toLowerCase() === q.correct_answer.toLowerCase();
      return {
        questionNumber: q.question_order,
        studentAnswer: answer ? answer.toUpperCase() : '—',
        correctAnswer: q.correct_answer.toUpperCase(),
        isCorrect,
      };
    });

    const correctCount = details.filter(d => d.isCorrect).length;
    const total = questions.length;
    const score = parseFloat(((correctCount / total) * 10).toFixed(2));

    const result = await query(
      `INSERT INTO exam_corrections
       (exam_id, user_id, student_name, image_path, ocr_result, score, total_questions, correct_answers, answers)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [examId, req.user.id, studentName || 'Aluno', imagePath, ocrResult, score, total, correctCount, JSON.stringify(details)]
    );

    res.json({
      message: 'Correção realizada!',
      correction: {
        id: result.insertId,
        studentName: studentName || 'Aluno',
        score,
        correctAnswers: correctCount,
        totalQuestions: total,
        percentage: ((correctCount / total) * 100).toFixed(1),
        details,
        ocrText: ocrResult,
      },
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    next(error);
  }
};

const listCorrections = async (req, res, next) => {
  try {
    const { examId } = req.query;
    let sql = `
      SELECT c.id, c.student_name, c.score, c.total_questions, c.correct_answers, c.created_at,
             e.title AS exam_title
      FROM exam_corrections c
      JOIN exams e ON c.exam_id = e.id
      WHERE e.user_id = ?
    `;
    const params = [req.user.id];
    if (examId) { sql += ' AND c.exam_id = ?'; params.push(examId); }
    sql += ' ORDER BY c.created_at DESC';
    const corrections = await query(sql, params);
    res.json({ corrections });
  } catch (error) {
    next(error);
  }
};

const getCorrection = async (req, res, next) => {
  try {
    const corrections = await query(
      `SELECT c.*, e.title AS exam_title
       FROM exam_corrections c
       JOIN exams e ON c.exam_id = e.id
       WHERE c.id = ? AND e.user_id = ?`,
      [req.params.id, req.user.id]
    );
    if (corrections.length === 0) return res.status(404).json({ error: 'Correção não encontrada' });
    const c = corrections[0];
    if (typeof c.answers === 'string') c.answers = JSON.parse(c.answers);
    res.json({ correction: c });
  } catch (error) {
    next(error);
  }
};

// Parseia as respostas detectadas pelo OCR
function parseAnswers(text, numQuestions) {
  const answers = {};

  // Padrão: "1-A", "1.A", "1) A", "01-B"
  const pattern = /(\d{1,2})\s*[-.):\s]\s*([a-eA-E])\b/g;
  let m;
  while ((m = pattern.exec(text)) !== null) {
    const num = parseInt(m[1]);
    if (num >= 1 && num <= numQuestions) {
      answers[num] = m[2].toLowerCase();
    }
  }

  // Fallback: linha com apenas uma letra (resposta por linha)
  if (Object.keys(answers).length === 0) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    let questionNum = 1;
    for (const line of lines) {
      if (/^[a-eA-E]$/.test(line)) {
        if (questionNum <= numQuestions) {
          answers[questionNum] = line.toLowerCase();
          questionNum++;
        }
      }
    }
  }

  return answers;
}

const deleteCorrection = async (req, res, next) => {
  try {
    const corrections = await query(
      `SELECT c.id, c.image_path FROM exam_corrections c
       JOIN exams e ON c.exam_id = e.id
       WHERE c.id = ? AND e.user_id = ?`,
      [req.params.id, req.user.id]
    );
    if (corrections.length === 0) return res.status(404).json({ error: 'Correção não encontrada' });
    const c = corrections[0];
    if (c.image_path && fs.existsSync(c.image_path)) fs.unlinkSync(c.image_path);
    await query('DELETE FROM exam_corrections WHERE id = ?', [req.params.id]);
    res.json({ message: 'Correção removida' });
  } catch (error) {
    next(error);
  }
};

module.exports = { correctExam, listCorrections, getCorrection, deleteCorrection };
