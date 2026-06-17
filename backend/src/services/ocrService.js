const Tesseract = require('tesseract.js');

async function performOCR(imagePath) {
  const { data: { text } } = await Tesseract.recognize(
    imagePath,
    'por+eng', // Português + Inglês para reconhecer letras mistas
    {
      logger: () => {}, // Silenciar logs de progresso
      tessedit_char_whitelist: 'ABCDEabcde0123456789-.) \n', // Caracteres esperados numa prova
    }
  );

  return text.trim();
}

module.exports = { performOCR };
