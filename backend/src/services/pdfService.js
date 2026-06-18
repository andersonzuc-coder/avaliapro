const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

async function extractTextFromPdf(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);

  let text = data.text || '';
  text = text.replace(/\r\n/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/[ \t]{2,}/g, ' ');
  text = text.trim();

  return { text, numPages: data.numpages || 0 };
}

async function extractTextFromPptx(filePath) {
  const JSZip = require('jszip');
  const buffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);

  const slideFiles = Object.keys(zip.files)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const na = parseInt(a.match(/(\d+)\.xml$/)[1]);
      const nb = parseInt(b.match(/(\d+)\.xml$/)[1]);
      return na - nb;
    });

  let text = '';
  let slideCount = 0;
  for (const slideFile of slideFiles) {
    const content = await zip.files[slideFile].async('string');
    const texts = [];
    content.replace(/<a:t[^>]*>([^<]*)<\/a:t>/g, (_, t) => {
      if (t.trim()) texts.push(t.trim());
    });
    if (texts.length) {
      slideCount++;
      text += `[Slide ${slideCount}]\n${texts.join(' ')}\n\n`;
    }
  }

  return { text: text.trim(), numPages: slideCount };
}

async function extractTextFromFile(filePath, originalName) {
  const ext = path.extname(originalName || filePath).toLowerCase();
  if (ext === '.pptx') return extractTextFromPptx(filePath);
  if (ext === '.ppt') {
    return { text: '', numPages: 0, warning: 'Formato .ppt antigo não suportado. Salve como .pptx e reenvie.' };
  }
  return extractTextFromPdf(filePath);
}

module.exports = { extractTextFromPdf, extractTextFromPptx, extractTextFromFile };
