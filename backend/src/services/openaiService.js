const Anthropic = require('@anthropic-ai/sdk');

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY não configurada. Adicione sua chave no arquivo .env');
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

async function generateExamQuestions(text, numQuestions = 10, difficulty = 'mixed', instructions = '') {
  const client = getClient();

  const maxChars = 30000;
  const truncatedText = text.length > maxChars
    ? text.substring(0, maxChars) + '\n[Texto truncado...]'
    : text;

  const difficultyInstruction = {
    mixed:  'com dificuldade variada (mistura equilibrada de questões fáceis, médias e difíceis)',
    easy:   'de nível fácil, acessíveis a quem está iniciando no tema',
    medium: 'de nível médio, exigindo boa compreensão e interpretação do conteúdo',
    hard:   'de nível difícil, exigindo análise crítica, raciocínio aprofundado e capacidade de síntese',
  }[difficulty] || 'de nível universitário';

  const instructionsBlock = instructions
    ? `\nINSTRUÇÕES COMPLEMENTARES DO PROFESSOR:\n${instructions}\n`
    : '';

  const prompt = `Você é um professor universitário experiente. Com base no conteúdo abaixo, formule exatamente ${numQuestions} questões de múltipla escolha ${difficultyInstruction}.${instructionsBlock}

CONTEÚDO DO MATERIAL:
${truncatedText}

INSTRUÇÕES:
- As questões devem exigir raciocínio crítico, análise e compreensão aprofundada do conteúdo
- Cada questão deve ter exatamente 5 alternativas (a, b, c, d, e)
- Apenas UMA alternativa correta por questão
- As alternativas incorretas devem ser plausíveis e tecnicamente elaboradas
- As questões devem abordar diferentes partes e aspectos do material
- Distribua o gabarito entre as 5 letras (não concentre em "a")

Retorne APENAS o JSON abaixo, sem texto adicional:
{
  "questions": [
    {
      "question": "Enunciado da questão?",
      "options": {
        "a": "Alternativa A",
        "b": "Alternativa B",
        "c": "Alternativa C",
        "d": "Alternativa D",
        "e": "Alternativa E"
      },
      "correctAnswer": "a"
    }
  ]
}`;

  const stream = await client.messages.stream({
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });

  const response = await stream.finalMessage();

  // Extrair o bloco de texto da resposta
  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock) {
    throw new Error('Claude não retornou texto na resposta');
  }

  const raw = textBlock.text.trim();

  // Extrair JSON mesmo que venha com marcadores de código
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Resposta não contém JSON válido');
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('JSON retornado pelo Claude é inválido');
  }

  const questionsArray = Array.isArray(parsed)
    ? parsed
    : (parsed.questions || parsed.questoes || Object.values(parsed).find(v => Array.isArray(v)));

  if (!Array.isArray(questionsArray) || questionsArray.length === 0) {
    throw new Error('Nenhuma questão encontrada na resposta');
  }

  return questionsArray.slice(0, numQuestions).map((q, i) => {
    const opts = q.options || q.alternativas || {};
    const correct = (q.correctAnswer || q.correct_answer || q.resposta || 'a')
      .toString().toLowerCase().trim().charAt(0);

    return {
      question: (q.question || q.texto || q.enunciado || `Questão ${i + 1}`).trim(),
      options: {
        a: String(opts.a || opts.A || '').trim(),
        b: String(opts.b || opts.B || '').trim(),
        c: String(opts.c || opts.C || '').trim(),
        d: String(opts.d || opts.D || '').trim(),
        e: String(opts.e || opts.E || '').trim(),
      },
      correctAnswer: ['a', 'b', 'c', 'd', 'e'].includes(correct) ? correct : 'a',
      difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty)
        ? q.difficulty
        : (difficulty !== 'mixed' && ['easy','medium','hard'].includes(difficulty) ? difficulty : 'medium'),
    };
  });
}

module.exports = { generateExamQuestions };
