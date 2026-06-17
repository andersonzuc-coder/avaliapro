const errorHandler = (err, req, res, next) => {
  console.error('[ERROR]', err.message || err);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Arquivo muito grande' });
  }
  if (err.message && (err.message.includes('Apenas') || err.message.includes('permitid'))) {
    return res.status(400).json({ error: err.message });
  }
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'Registro duplicado' });
  }

  const status = err.status || err.statusCode || 500;
  const message = status === 500 ? 'Erro interno do servidor' : (err.message || 'Erro desconhecido');

  res.status(status).json({ error: message });
};

module.exports = errorHandler;
