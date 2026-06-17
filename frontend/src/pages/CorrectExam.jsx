import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';

const CameraIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--gray-400)' }}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

export default function CorrectExam() {
  const [searchParams] = useSearchParams();
  const [exams, setExams] = useState([]);
  const [form, setForm] = useState({ examId: searchParams.get('examId') || '', studentName: '' });
  const [selectedImage, setSelectedImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingExams, setLoadingExams] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef();

  useEffect(() => {
    api.get('/exams')
      .then(res => setExams(res.data.exams.filter(e => e.status !== 'draft')))
      .catch(() => setError('Erro ao carregar provas'))
      .finally(() => setLoadingExams(false));
  }, []);

  const handleImage = file => {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) { setError('Apenas imagens JPG, PNG ou WebP são aceitas.'); return; }
    setSelectedImage(file);
    setPreview(URL.createObjectURL(file));
    setError('');
    setResult(null);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.examId) { setError('Selecione a prova'); return; }
    if (!selectedImage) { setError('Selecione a foto da prova respondida'); return; }

    setLoading(true);
    setError('');
    setResult(null);

    const data = new FormData();
    data.append('image', selectedImage);
    data.append('examId', form.examId);
    data.append('studentName', form.studentName || 'Aluno');

    try {
      const res = await api.post('/corrections/correct', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(res.data.correction);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao corrigir prova');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Correção Automática por Foto</h1>
        <p className="page-subtitle">Tire uma foto da prova respondida e a IA irá corrigi-la</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: result ? '1fr 1fr' : '1fr', gap: 24 }}>
        <div className="card">
          {error && <div className="alert alert-error">{error}</div>}

          {loading && (
            <div className="alert alert-info">
              <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2, flexShrink: 0 }} />
              <div>
                <strong>Processando imagem com OCR...</strong><br />
                <small>Detectando e comparando as respostas com o gabarito.</small>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Prova aplicada</label>
              {loadingExams ? (
                <div className="spinner-wrap" style={{ padding: 16 }}><div className="spinner" /></div>
              ) : (
                <select className="form-select" value={form.examId} required
                  onChange={e => setForm(f => ({ ...f, examId: e.target.value }))}>
                  <option value="">— Selecione a prova —</option>
                  {exams.map(exam => (
                    <option key={exam.id} value={exam.id}>
                      {exam.title} ({exam.question_count} questões)
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Nome do aluno (opcional)</label>
              <input type="text" className="form-input" placeholder="Ex: João Silva"
                value={form.studentName} onChange={e => setForm(f => ({ ...f, studentName: e.target.value }))} />
            </div>

            <div className="form-group">
              <label className="form-label">Foto da prova respondida</label>
              <div className="upload-area" onClick={() => fileRef.current.click()}
                style={{ padding: 20, cursor: 'pointer' }}>
                {preview ? (
                  <img src={preview} alt="Preview" style={{ maxHeight: 200, borderRadius: 6 }} />
                ) : (
                  <>
                    <div className="upload-icon"><CameraIcon /></div>
                    <div className="upload-text"><strong>Clique para selecionar</strong> a foto da prova</div>
                    <div className="upload-hint">JPG, PNG, WebP • Máximo 15 MB</div>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" capture="environment"
                style={{ display: 'none' }} onChange={e => handleImage(e.target.files[0])} />
            </div>

            <div className="alert alert-info" style={{ marginBottom: 16 }}>
              <strong>Dica:</strong> Para melhor resultado, escreva as respostas no formato<br />
              <code>1-A  2-B  3-C  4-D  5-E</code> ou uma por linha.
            </div>

            <button type="submit" className="btn btn-primary btn-lg btn-full"
              disabled={loading || !selectedImage || !form.examId}>
              {loading ? 'Corrigindo...' : 'Corrigir Prova'}
            </button>
          </form>
        </div>

        {result && (
          <div>
            <div className="correction-score">
              <div className="score-number">{result.score}</div>
              <div className="score-label">Nota (0–10)</div>
              <div className="score-detail">
                {result.correctAnswers} de {result.totalQuestions} acertos ({result.percentage}%)
              </div>
              <div style={{ marginTop: 8, fontSize: '.9rem', opacity: .9 }}>
                Aluno: <strong>{result.studentName}</strong>
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>Detalhes da correção</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {result.details.map(d => (
                  <div key={d.questionNumber} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
                    borderRadius: 6, background: d.isCorrect ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${d.isCorrect ? '#bbf7d0' : '#fecaca'}`,
                  }}>
                    <span style={{ fontWeight: 700, color: '#6b7280', minWidth: 24 }}>{d.questionNumber}</span>
                    <span style={{ color: '#6b7280', fontSize: '.85rem' }}>
                      Aluno: <strong style={{ color: d.isCorrect ? '#16a34a' : '#dc2626' }}>{d.studentAnswer}</strong>
                    </span>
                    {!d.isCorrect && (
                      <span style={{ color: '#6b7280', fontSize: '.85rem' }}>
                        Gabarito: <strong style={{ color: '#16a34a' }}>{d.correctAnswer}</strong>
                      </span>
                    )}
                    <span style={{ marginLeft: 'auto', fontWeight: 700, color: d.isCorrect ? '#16a34a' : '#dc2626' }}>
                      {d.isCorrect ? '✓' : '✗'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {result.ocrText && (
              <div className="card" style={{ marginTop: 16 }}>
                <h3 style={{ fontSize: '.9rem', fontWeight: 600, marginBottom: 8 }}>Texto detectado pelo OCR</h3>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '.8rem', color: '#6b7280', maxHeight: 150, overflow: 'auto' }}>
                  {result.ocrText}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
