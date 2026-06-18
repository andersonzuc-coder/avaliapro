const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');
const { extractTextFromFile } = require('../services/pdfService');

const uploadPdf = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const { title, description } = req.body;
    const { path: filePath, filename, originalname: originalName, size: fileSize } = req.file;
    const ext = path.extname(originalName).toLowerCase().replace('.', '');
    const fileType = (ext === 'pptx' || ext === 'ppt') ? 'pptx' : 'pdf';

    let extractedText = '';
    let numPages = 0;
    let warning = '';
    try {
      const result = await extractTextFromFile(filePath, originalName);
      extractedText = result.text;
      numPages = result.numPages;
      warning = result.warning || '';
    } catch (err) {
      console.error('Erro ao extrair texto:', err.message);
    }

    const cleanTitle = title || originalName.replace(/\.(pdf|pptx|ppt)$/i, '');
    const result = await query(
      `INSERT INTO pdf_uploads (user_id, filename, original_name, file_path, extracted_text, file_size, title, description, num_pages, file_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, filename, originalName, filePath, extractedText, fileSize,
       cleanTitle, description || '', numPages, fileType]
    );

    const [pdf] = await query('SELECT * FROM pdf_uploads WHERE id = ?', [result.insertId]);

    res.status(201).json({ message: 'Material enviado com sucesso', pdf, warning });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    next(error);
  }
};

const listPdfs = async (req, res, next) => {
  try {
    const pdfs = await query(
      `SELECT id, user_id, filename, original_name, file_size, title, description, file_type,
              created_at, CHAR_LENGTH(extracted_text) AS text_length, num_pages
       FROM pdf_uploads WHERE user_id = ? ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ pdfs });
  } catch (error) {
    next(error);
  }
};

const getPdf = async (req, res, next) => {
  try {
    const pdfs = await query(
      'SELECT * FROM pdf_uploads WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (pdfs.length === 0) return res.status(404).json({ error: 'Material não encontrado' });
    res.json({ pdf: pdfs[0] });
  } catch (error) {
    next(error);
  }
};

const deletePdf = async (req, res, next) => {
  try {
    const pdfs = await query(
      'SELECT * FROM pdf_uploads WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (pdfs.length === 0) return res.status(404).json({ error: 'Material não encontrado' });

    if (fs.existsSync(pdfs[0].file_path)) fs.unlinkSync(pdfs[0].file_path);
    await query('DELETE FROM pdf_uploads WHERE id = ?', [req.params.id]);

    res.json({ message: 'Material deletado com sucesso' });
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadPdf, listPdfs, getPdf, deletePdf };
