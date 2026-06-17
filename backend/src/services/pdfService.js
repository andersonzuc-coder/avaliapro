const fs = require('fs');
const pdfParse = require('pdf-parse');

async function extractTextFromPdf(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);

  let text = data.text || '';

  // Normalizar espaços e quebras de linha excessivas
  text = text.replace(/\r\n/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/[ \t]{2,}/g, ' ');
  text = text.trim();

  return text;
}

module.exports = { extractTextFromPdf };
