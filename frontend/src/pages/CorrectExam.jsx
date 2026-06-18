import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';

const CameraIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--gray-400)' }}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

const PdfIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
  </svg>
);

function loadLayout() {
  try { return JSON.parse(localStorage.getItem('avaliapro_layout') || '{}'); }
  catch { return {}; }
}

/* ── Relatório off-screen para PDF ── */
function ReportTemplate({ exam, corrections, reportRef }) {
  const layout = loadLayout();
  const inst = layout.institution || 'AvaliaPro';
  const avg = corrections.length
    ? (corrections.reduce((s, c) => s + parseFloat(c.score), 0) / corrections.length).toFixed(2)
    : '—';
  const approved = corrections.filter(c => parseFloat(c.score) >= 6).length;

  return (
    <div ref={reportRef} style={{
      position: 'relative', width: '754px', background: '#fff', padding: '32px 28px',
      fontFamily: "'Arial','Helvetica',sans-serif", fontSize: '12px', lineHeight: 1.6, color: '#111',
    }}>
      {/* Cabeçalho */}
      <div style={{ borderBottom: '2px solid #1e293b', paddingBottom: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
          {layout.logo && <img src={layout.logo} alt="Logo" style={{ height: 52, objectFit: 'contain' }} crossOrigin="anonymous" />}
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', color: '#1e293b' }}>{inst}</div>
            {layout.department && <div style={{ fontSize: 11, color: '#4b5563' }}>{layout.department}</div>}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: '#1e293b' }}>
            Relatório de Correções
          </div>
          <div style={{ fontSize: 12, color: '#4b5563', marginTop: 3 }}>
            {exam?.title} — {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Resumo estatístico */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total de alunos', value: corrections.length },
          { label: 'Média da turma', value: avg },
          { label: 'Aprovados (≥ 6)', value: approved },
          { label: 'Taxa de aprovação', value: corrections.length ? `${((approved / corrections.length) * 100).toFixed(0)}%` : '—' },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center', border: '1.5px solid #e5e7eb', borderRadius: 6, padding: '8px 4px' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>{s.value}</div>
            <div style={{ fontSize: 9.5, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.04em', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabela de alunos */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
        <thead>
          <tr style={{ background: '#1e293b', color: '#fff' }}>
            {['#', 'Aluno(a)', 'Acertos', 'Total', 'Nota', 'Situação', 'Data'].map(h => (
              <th key={h} style={{ padding: '6px 8px', textAlign: h === '#' || h === 'Acertos' || h === 'Total' || h === 'Nota' ? 'center' : 'left', fontWeight: 700, fontSize: 11 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {corrections.map((c, i) => {
            const pass = parseFloat(c.score) >= 6;
            return (
              <tr key={c.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '5px 8px', textAlign: 'center', color: '#9ca3af' }}>{i + 1}</td>
                <td style={{ padding: '5px 8px', fontWeight: 600 }}>{c.student_name}</td>
                <td style={{ padding: '5px 8px', textAlign: 'center' }}>{c.correct_answers}</td>
                <td style={{ padding: '5px 8px', textAlign: 'center', color: '#6b7280' }}>{c.total_questions}</td>
                <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 800, color: pass ? '#166534' : '#991b1b' }}>
                  {parseFloat(c.score).toFixed(1)}
                </td>
                <td style={{ padding: '5px 8px' }}>
                  <span style={{
                    padding: '2px 7px', borderRadius: 4, fontSize: 10.5, fontWeight: 700,
                    background: pass ? '#dcfce7' : '#fee2e2', color: pass ? '#166534' : '#991b1b',
                  }}>
                    {pass ? 'Aprovado' : 'Reprovado'}
                  </span>
                </td>
                <td style={{ padding: '5px 8px', color: '#6b7280', fontSize: 10.5 }}>
                  {new Date(c.created_at).toLocaleDateString('pt-BR')}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Rodapé */}
      <div style={{ marginTop: 24, borderTop: '1px solid #e5e7eb', paddingTop: 10, fontSize: 10, color: '#9ca3af', textAlign: 'center' }}>
        Gerado em {new Date().toLocaleString('pt-BR')} — AvaliaPro
      </div>
    </div>
  );
}

export default function CorrectExam() {
  const [searchParams] = useSearchParams();
  const [exams, setExams] = useState([]);
  const [form, setForm] = useState({ examId: searchParams.get('examId') || '', studentName: '' });
  const [selectedImage, setSelectedImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [result, setResult] = useState(null);
  const [corrections, setCorrections] = useState([]);
  const [savingPdf, setSavingPdf] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();
  const reportRef = useRef();

  useEffect(() => {
    api.get('/exams')
      .then(res => setExams(res.data.exams.filter(e => e.status !== 'draft')))
      .catch(() => setError('Erro ao carregar provas'))
      .finally(() => setLoadingExams(false));
  }, []);

  // Recarregar lista sempre que trocar de prova
  useEffect(() => {
    if (!form.examId) { setCorrections([]); return; }
    setLoadingList(true);
    api.get(`/corrections?examId=${form.examId}`)
      .then(res => setCorrections(res.data.corrections))
      .catch(() => {})
      .finally(() => setLoadingList(false));
  }, [form.examId]);

  const selectedExam = exams.find(e => String(e.id) === String(form.examId));

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
    setLoading(true); setError(''); setResult(null);
    const data = new FormData();
    data.append('image', selectedImage);
    data.append('examId', form.examId);
    data.append('studentName', form.studentName || 'Aluno');
    try {
      const res = await api.post('/corrections/correct', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(res.data.correction);
      // Recarregar lista
      const listRes = await api.get(`/corrections?examId=${form.examId}`);
      setCorrections(listRes.data.corrections);
      // Limpar formulário de aluno/imagem para próxima correção
      setSelectedImage(null);
      setPreview(null);
      setForm(f => ({ ...f, studentName: '' }));
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao corrigir prova');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCorrection = async id => {
    if (!confirm('Remover esta correção?')) return;
    try {
      await api.delete(`/corrections/${id}`);
      setCorrections(prev => prev.filter(c => c.id !== id));
    } catch { alert('Erro ao remover correção'); }
  };

  const handleSaveReportPdf = async () => {
    setSavingPdf(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf()
        .set({
          margin: [8, 6, 14, 6],
          filename: `Relatório - ${selectedExam?.title || 'Prova'}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(reportRef.current)
        .toPdf()
        .get('pdf')
        .then(pdf => {
          const W = pdf.internal.pageSize.getWidth();
          const H = pdf.internal.pageSize.getHeight();
          const total = pdf.internal.getNumberOfPages();
          for (let i = 1; i <= total; i++) {
            pdf.setPage(i);
            pdf.setDrawColor(150, 150, 150);
            pdf.setLineWidth(0.3);
            pdf.line(6, H - 10, W - 6, H - 10);
            pdf.setFontSize(8);
            pdf.setTextColor(120, 120, 120);
            pdf.text(`Página ${i} de ${total}`, W / 2, H - 6, { align: 'center' });
          }
        })
        .save();
    } catch (e) {
      alert('Erro ao gerar PDF: ' + e.message);
    } finally {
      setSavingPdf(false);
    }
  };

  // Estatísticas da lista
  const avg = corrections.length
    ? (corrections.reduce((s, c) => s + parseFloat(c.score), 0) / corrections.length).toFixed(1)
    : null;
  const approved = corrections.filter(c => parseFloat(c.score) >= 6).length;

  return (
    <div className="page">
      {/* Template off-screen para PDF do relatório */}
      <div style={{ overflow: 'hidden', height: 0, position: 'relative' }}>
        <ReportTemplate exam={selectedExam} corrections={[...corrections].reverse()} reportRef={reportRef} />
      </div>

      <div className="page-header">
        <h1 className="page-title">Correção de Provas</h1>
        <p className="page-subtitle">Corrija e acompanhe o desempenho da turma</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Coluna esquerda: formulário de correção ── */}
        <div>
          <div className="card">
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 14 }}>Nova correção</h2>

            {error && <div className="alert alert-error">{error}</div>}
            {loading && (
              <div className="alert alert-info">
                <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2, flexShrink: 0 }} />
                <div><strong>Processando com OCR...</strong><br /><small>Comparando com o gabarito.</small></div>
              </div>
            )}

            {/* Resultado inline */}
            {result && (
              <div style={{
                background: parseFloat(result.score) >= 6 ? '#f0fdf4' : '#fef2f2',
                border: `1.5px solid ${parseFloat(result.score) >= 6 ? '#86efac' : '#fca5a5'}`,
                borderRadius: 10, padding: '14px 16px', marginBottom: 16, textAlign: 'center',
              }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: parseFloat(result.score) >= 6 ? '#16a34a' : '#dc2626' }}>
                  {result.score}
                </div>
                <div style={{ fontSize: 13, color: '#4b5563', marginTop: 2 }}>
                  {result.correctAnswers}/{result.totalQuestions} acertos • {result.percentage}%
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{result.studentName}</div>
                <div style={{ fontSize: 11, fontWeight: 700, marginTop: 6,
                  color: parseFloat(result.score) >= 6 ? '#16a34a' : '#dc2626' }}>
                  {parseFloat(result.score) >= 6 ? '✓ Aprovado' : '✗ Reprovado'}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Prova</label>
                {loadingExams ? (
                  <div className="spinner-wrap" style={{ padding: 12 }}><div className="spinner" /></div>
                ) : (
                  <select className="form-select" value={form.examId} required
                    onChange={e => { setForm(f => ({ ...f, examId: e.target.value })); setResult(null); }}>
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
                <label className="form-label">Nome do aluno</label>
                <input type="text" className="form-input" placeholder="Ex: João Silva"
                  value={form.studentName} onChange={e => setForm(f => ({ ...f, studentName: e.target.value }))} />
              </div>

              <div className="form-group">
                <label className="form-label">Foto da prova respondida</label>
                <div className="upload-area" onClick={() => fileRef.current.click()}
                  style={{ padding: 16, cursor: 'pointer' }}>
                  {preview ? (
                    <img src={preview} alt="Preview" style={{ maxHeight: 160, borderRadius: 6 }} />
                  ) : (
                    <>
                      <div className="upload-icon"><CameraIcon /></div>
                      <div className="upload-text" style={{ fontSize: 13 }}><strong>Clique para selecionar</strong> a foto</div>
                      <div className="upload-hint">JPG, PNG, WebP • Máx. 15 MB</div>
                    </>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" capture="environment"
                  style={{ display: 'none' }} onChange={e => handleImage(e.target.files[0])} />
              </div>

              <div className="alert alert-info" style={{ marginBottom: 14, fontSize: 12 }}>
                Escreva as respostas no formato <code>1-A  2-B  3-C</code> ou uma por linha.
              </div>

              <button type="submit" className="btn btn-primary btn-full"
                disabled={loading || !selectedImage || !form.examId}>
                {loading ? 'Corrigindo...' : 'Corrigir Prova'}
              </button>
            </form>
          </div>
        </div>

        {/* ── Coluna direita: lista de correções ── */}
        <div>
          {!form.examId ? (
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <p style={{ color: '#9ca3af' }}>Selecione uma prova para ver o relatório de correções</p>
            </div>
          ) : (
            <div className="card">
              {/* Cabeçalho do relatório */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
                    {selectedExam?.title}
                  </h2>
                  <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                    {corrections.length} correção{corrections.length !== 1 ? 'ões' : ''} registrada{corrections.length !== 1 ? 's' : ''}
                  </p>
                </div>
                {corrections.length > 0 && (
                  <button className="btn btn-ghost btn-sm" onClick={handleSaveReportPdf} disabled={savingPdf}>
                    <PdfIcon /> {savingPdf ? 'Gerando...' : 'Salvar Relatório PDF'}
                  </button>
                )}
              </div>

              {/* Cards de resumo */}
              {corrections.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
                  {[
                    { label: 'Corrigidas', value: corrections.length, color: '#1e293b' },
                    { label: 'Média', value: avg, color: avg >= 6 ? '#16a34a' : '#dc2626' },
                    { label: 'Aprovados', value: approved, color: '#16a34a' },
                    { label: 'Reprovados', value: corrections.length - approved, color: '#dc2626' },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center', background: '#f8fafc', borderRadius: 8, padding: '10px 8px', border: '1px solid #e5e7eb' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tabela de correções */}
              {loadingList ? (
                <div className="spinner-wrap"><div className="spinner" /></div>
              ) : corrections.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📝</div>
                  Nenhuma correção registrada para esta prova ainda.
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Aluno(a)</th>
                        <th style={{ textAlign: 'center' }}>Acertos</th>
                        <th style={{ textAlign: 'center' }}>Nota</th>
                        <th>Situação</th>
                        <th>Data</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {corrections.map((c, i) => {
                        const pass = parseFloat(c.score) >= 6;
                        return (
                          <tr key={c.id}>
                            <td style={{ color: '#9ca3af', fontSize: 13 }}>{i + 1}</td>
                            <td><strong>{c.student_name}</strong></td>
                            <td style={{ textAlign: 'center' }}>{c.correct_answers}/{c.total_questions}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{ fontWeight: 800, fontSize: 15, color: pass ? '#16a34a' : '#dc2626' }}>
                                {parseFloat(c.score).toFixed(1)}
                              </span>
                            </td>
                            <td>
                              <span style={{
                                padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                                background: pass ? '#dcfce7' : '#fee2e2',
                                color: pass ? '#166534' : '#991b1b',
                              }}>
                                {pass ? '✓ Aprovado' : '✗ Reprovado'}
                              </span>
                            </td>
                            <td style={{ color: '#6b7280', fontSize: 13 }}>
                              {new Date(c.created_at).toLocaleDateString('pt-BR')}
                            </td>
                            <td>
                              <button className="btn btn-sm btn-danger"
                                onClick={() => handleDeleteCorrection(c.id)}>✕</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
