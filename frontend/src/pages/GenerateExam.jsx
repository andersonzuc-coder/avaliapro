import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function GenerateExam() {
  const navigate = useNavigate();
  const [pdfs, setPdfs] = useState([]);
  const [form, setForm] = useState({ pdfId: '', title: '', codigo_prova: '', avaliacao: '', chamada: '', numQuestions: 10, difficulty: 'mixed', instructions: '' });
  const [loading, setLoading] = useState(false);
  const [loadingPdfs, setLoadingPdfs] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/pdfs')
      .then(res => setPdfs(res.data.pdfs.filter(p => p.text_length > 0)))
      .catch(() => setError('Erro ao carregar PDFs'))
      .finally(() => setLoadingPdfs(false));
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.pdfId) { setError('Selecione um PDF'); return; }
    if (!form.title.trim()) { setError('Informe a disciplina'); return; }

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/exams/generate', {
        pdfId: parseInt(form.pdfId),
        title: form.title.trim(),
        codigo_prova: form.codigo_prova.trim(),
        avaliacao: form.avaliacao,
        chamada: form.chamada,
        numQuestions: parseInt(form.numQuestions),
        difficulty: form.difficulty,
        instructions: form.instructions.trim(),
      });
      navigate(`/exams/${res.data.exam.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao gerar prova. Verifique sua chave de IA.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Gerar Prova</h1>
      </div>

      <div className="card" style={{ maxWidth: 600 }}>
        {error && <div className="alert alert-error">{error}</div>}

        {loading && (
          <div className="alert alert-info">
            <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2, flexShrink: 0 }} />
            <div>
              <strong>Gerando questões...</strong><br />
              <small>Isso pode levar 20–60 segundos dependendo do tamanho do material.</small>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Material de base (PDF)</label>
            {loadingPdfs ? (
              <div className="spinner-wrap" style={{ padding: 20 }}><div className="spinner" /></div>
            ) : pdfs.length === 0 ? (
              <div className="alert alert-warning">
                Nenhum PDF com texto disponível. <a href="/pdfs">Envie um PDF primeiro.</a>
              </div>
            ) : (
              <select className="form-select" value={form.pdfId} required
                onChange={e => setForm(f => ({ ...f, pdfId: e.target.value }))}>
                <option value="">— Selecione o PDF —</option>
                {pdfs.map(pdf => (
                  <option key={pdf.id} value={pdf.id}>
                    {pdf.title} ({pdf.text_length?.toLocaleString()} chars)
                  </option>
                ))}
              </select>
            )}
            <p className="form-hint">Apenas PDFs com texto extraído aparecem na lista.</p>
          </div>

          <div className="form-group">
            <label className="form-label">Disciplina</label>
            <input type="text" className="form-input" required
              placeholder="Ex: Biologia, Matemática, História..."
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>

          <div className="form-group">
            <label className="form-label">Código da Prova</label>
            <input type="text" className="form-input"
              placeholder="Ex: MAT-2024-01"
              value={form.codigo_prova} onChange={e => setForm(f => ({ ...f, codigo_prova: e.target.value }))} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Avaliação</label>
              <select className="form-select" value={form.avaliacao}
                onChange={e => setForm(f => ({ ...f, avaliacao: e.target.value }))}>
                <option value="">— Selecione —</option>
                <option value="1º Bimestre">1º Bimestre</option>
                <option value="2º Bimestre">2º Bimestre</option>
                <option value="3º Bimestre">3º Bimestre</option>
                <option value="4º Bimestre">4º Bimestre</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Chamada</label>
              <select className="form-select" value={form.chamada}
                onChange={e => setForm(f => ({ ...f, chamada: e.target.value }))}>
                <option value="">— Selecione —</option>
                <option value="1ª Chamada">1ª Chamada</option>
                <option value="2ª Chamada">2ª Chamada</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Número de questões</label>
            <select className="form-select" value={form.numQuestions}
              onChange={e => setForm(f => ({ ...f, numQuestions: e.target.value }))}>
              {[5, 8, 10, 12, 15, 20].map(n => (
                <option key={n} value={n}>{n} questões</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Nível de dificuldade</label>
            <select className="form-select" value={form.difficulty}
              onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}>
              <option value="mixed">Misto (fácil, médio e difícil)</option>
              <option value="easy">Fácil</option>
              <option value="medium">Médio</option>
              <option value="hard">Difícil</option>
            </select>
            <p className="form-hint">A IA formulará as questões conforme o nível selecionado.</p>
          </div>

          <div className="form-group">
            <label className="form-label">Instruções complementares <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>(opcional)</span></label>
            <textarea
              className="form-textarea"
              rows={4}
              placeholder={`Ex: Formule as questões no estilo ENADE, com textos introdutórios, gráficos descritos em texto e situações-problema contextualizadas. As questões devem exigir análise crítica e não apenas memorização.`}
              value={form.instructions}
              onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
            />
            <p className="form-hint">Descreva o estilo, formato ou critérios específicos que a IA deve seguir ao formular as questões.</p>
          </div>

          <div className="alert alert-info" style={{ marginBottom: 16 }}>
            Cada questão terá 5 alternativas (a–e) com gabarito completo.
          </div>

          <button type="submit" className="btn btn-primary btn-lg btn-full"
            disabled={loading || pdfs.length === 0}>
            {loading ? 'Gerando...' : 'Gerar Prova'}
          </button>
        </form>
      </div>
    </div>
  );
}
