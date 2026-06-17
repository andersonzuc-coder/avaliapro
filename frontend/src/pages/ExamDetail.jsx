import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const diffLabel = { easy: 'Fácil', medium: 'Médio', hard: 'Difícil' };
const diffBadge  = { easy: 'badge-green', medium: 'badge-yellow', hard: 'badge-red' };

// Quebra itens I. II. III. IV. em linhas separadas
function fmtQ(text) {
  if (!text) return text;
  return text
    .replace(/ (I{1,4}|IV|VI{0,4}|IX|XI{0,4}|XIV|XV)\. /g, '\n$1. ')
    .trim();
}

function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildVersion(questions, versionIdx) {
  const letters = ['a','b','c','d','e'];
  const shuffledQs = shuffleArr(questions).map((q, order) => {
    const correctText = q[`option_${q.correct_answer}`];
    const pairs = letters.map(l => ({ l, text: q[`option_${l}`] }));
    const shuffledPairs = shuffleArr(pairs);
    const newCorrect = letters[shuffledPairs.findIndex(p => p.text === correctText)];
    return {
      ...q,
      question_order: order + 1,
      option_a: shuffledPairs[0].text,
      option_b: shuffledPairs[1].text,
      option_c: shuffledPairs[2].text,
      option_d: shuffledPairs[3].text,
      option_e: shuffledPairs[4].text,
      correct_answer: newCorrect,
    };
  });
  return { label: String.fromCharCode(65 + versionIdx), questions: shuffledQs };
}

/* ── mini SVG icons ── */
const Ico = {
  Print:   () => <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  Pdf:     () => <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
  Eye:     () => <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  EyeOff:  () => <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  Check:   () => <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  Trash:   () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  Edit:    () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Layout:  () => <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>,
  Image:   () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  X:       () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
};

/* ── default layout settings ── */
const DEFAULT_LAYOUT = {
  institution: '',
  department: '',
  instructions: '1. Leia atentamente cada questão antes de responder.\n2. Marque apenas uma alternativa por questão.\n3. Não é permitido o uso de consultas externas.',
  logo: '',
};

function loadLayout() {
  try { return { ...DEFAULT_LAYOUT, ...JSON.parse(localStorage.getItem('avaliapro_layout') || '{}') }; }
  catch { return DEFAULT_LAYOUT; }
}

/* ── Layout settings modal ── */
function LayoutModal({ onClose }) {
  const [settings, setSettings] = useState(loadLayout);
  const logoRef = useRef();

  const handleLogo = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setSettings(s => ({ ...s, logo: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    localStorage.setItem('avaliapro_layout', JSON.stringify(settings));
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 540 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 className="modal-title" style={{ marginBottom: 0 }}>Configurar Layout da Prova</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><Ico.X /></button>
        </div>

        <div className="form-group">
          <label className="form-label">Logomarca da Instituição</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {settings.logo
              ? <img src={settings.logo} alt="Logo" style={{ height: 56, borderRadius: 4, border: '1px solid #e5e7eb' }} />
              : <div style={{ width: 56, height: 56, background: '#f3f4f6', borderRadius: 4, border: '1px dashed #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ico.Image /></div>
            }
            <div>
              <button className="btn btn-ghost btn-sm" onClick={() => logoRef.current.click()}>
                {settings.logo ? 'Trocar logomarca' : 'Selecionar imagem'}
              </button>
              {settings.logo && (
                <button className="btn btn-ghost btn-sm" style={{ marginLeft: 6, color: 'var(--danger)' }}
                  onClick={() => setSettings(s => ({ ...s, logo: '' }))}>Remover</button>
              )}
              <p className="form-hint">PNG, JPG • Recomendado: 200×80px</p>
            </div>
          </div>
          <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogo} />
        </div>

        <div className="form-group">
          <label className="form-label">Nome da Instituição / Escola</label>
          <input type="text" className="form-input" placeholder="Ex: Universidade Federal de..."
            value={settings.institution} onChange={e => setSettings(s => ({ ...s, institution: e.target.value }))} />
        </div>

        <div className="form-group">
          <label className="form-label">Departamento / Curso (opcional)</label>
          <input type="text" className="form-input" placeholder="Ex: Departamento de Engenharia Civil"
            value={settings.department} onChange={e => setSettings(s => ({ ...s, department: e.target.value }))} />
        </div>

        <div className="form-group">
          <label className="form-label">Instruções ao aluno</label>
          <textarea className="form-textarea" rows={4}
            placeholder="Instruções que aparecerão no cabeçalho da prova impressa..."
            value={settings.instructions}
            onChange={e => setSettings(s => ({ ...s, instructions: e.target.value }))} />
        </div>

        <div className="actions-row">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <div className="spacer" />
          <button className="btn btn-primary" onClick={handleSave}>Salvar configurações</button>
        </div>
      </div>
    </div>
  );
}

/* ── PDF print template (off-screen) ── */
function ExamPrintTemplate({ exam, layout, showGabarito, pdfRef, versionLabel }) {
  const inst = layout.institution || 'AvaliaPro';

  return (
    <div ref={pdfRef} style={{
      position: 'relative',
      width: '754px', background: '#fff', padding: '32px 28px',
      fontFamily: "'Arial', 'Helvetica', sans-serif", fontSize: '12px', lineHeight: 1.6, color: '#111',
    }}>
      {/* Header */}
      <div style={{ borderBottom: '2px solid #1e293b', paddingBottom: 12, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
          {layout.logo && (
            <img src={layout.logo} alt="Logo" style={{ height: 64, marginRight: 18, objectFit: 'contain' }} crossOrigin="anonymous" />
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{inst}</div>
            {layout.department && <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2 }}>{layout.department}</div>}
          </div>
        </div>

        {/* Linha: Cód. Prova | Disciplina */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: 11.5, marginBottom: 4 }}>
          <div>
            <span style={{ fontWeight: 700 }}>Cód. Prova: </span>{exam.codigo_prova || '___________'}
            {versionLabel && (
              <span style={{ marginLeft: 10, background: '#1e293b', color: '#fff', padding: '1px 8px', borderRadius: 3, fontWeight: 700, fontSize: 10.5, letterSpacing: '.07em' }}>
                MODELO {versionLabel}
              </span>
            )}
          </div>
          <div><span style={{ fontWeight: 700 }}>Data: </span>{new Date(exam.created_at).toLocaleDateString('pt-BR')}</div>
          <div style={{ gridColumn: '1 / -1' }}><span style={{ fontWeight: 700 }}>Disciplina: </span>{exam.title}</div>
        </div>

        {/* Linha: Aluno | Matrícula */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '4px 16px', fontSize: 11.5, marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Aluno(a):</span>
            <span style={{ borderBottom: '1px solid #000', flex: 1, display: 'inline-block' }}></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Matrícula:</span>
            <span style={{ borderBottom: '1px solid #000', flex: 1, display: 'inline-block' }}></span>
          </div>
        </div>

        {/* Linha: Avaliação | Chamada | Valor */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px 16px', fontSize: 11.5 }}>
          <div><span style={{ fontWeight: 700 }}>Avaliação: </span>{exam.avaliacao || '___________'}</div>
          <div><span style={{ fontWeight: 700 }}>Chamada: </span>{exam.chamada || '___________'}</div>
          <div><span style={{ fontWeight: 700 }}>Valor: </span>10,0</div>
        </div>
      </div>

      {/* Instructions — capa (página 1) */}
      <div style={{ pageBreakAfter: 'always', breakAfter: 'page' }}>
        {layout.instructions && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4, padding: '8px 12px', marginTop: 10, fontSize: 11 }}>
            <div style={{ fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Instruções:</div>
            <div style={{ whiteSpace: 'pre-wrap', color: '#374151' }}>{layout.instructions}</div>
          </div>
        )}
      </div>

      {/* Questions — a partir da página 2 */}
      {exam.questions.map(q => (
        <div key={q.id} style={{ marginBottom: 22, pageBreakInside: 'avoid' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
            <div style={{
              background: '#1e293b', color: '#fff', borderRadius: '50%',
              minWidth: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1,
            }}>
              {String(q.question_order).padStart(2, '0')}
            </div>
            <div style={{ textAlign: 'justify', flex: 1, fontWeight: 500, whiteSpace: 'pre-line' }}>{fmtQ(q.question_text)}</div>
          </div>
          {q.image_path && (
            <div style={{ margin: '8px 0 8px 32px' }}>
              <img src={`${API_URL}${q.image_path}`} alt="" style={{ maxWidth: '80%', maxHeight: 200, borderRadius: 4 }} crossOrigin="anonymous" />
            </div>
          )}
          <div style={{ paddingLeft: 32 }}>
            {['a','b','c','d','e'].map(l => (
              <div key={l} style={{ marginBottom: 4, display: 'flex', gap: 6 }}>
                <span style={{ fontWeight: 700, minWidth: 18 }}>{l.toUpperCase()})</span>
                <span>{q[`option_${l}`]}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

    </div>
  );
}

/* ── Gabarito template separado ── */
function GabaritoPrintTemplate({ exam, layout, gabRef, versionLabel }) {
  const inst = layout.institution || 'AvaliaPro';
  return (
    <div ref={gabRef} style={{
      position: 'relative',
      width: '754px', background: '#fff', padding: '32px 28px',
      fontFamily: "'Arial','Helvetica',sans-serif", fontSize: '12px', lineHeight: 1.6, color: '#111',
    }}>
      {/* Cabeçalho simplificado */}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid #1e293b', paddingBottom: 10, marginBottom: 16 }}>
        {layout.logo && <img src={layout.logo} alt="Logo" style={{ height: 52, marginRight: 16, objectFit: 'contain' }} crossOrigin="anonymous" />}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', textTransform: 'uppercase' }}>{inst}</div>
          {layout.department && <div style={{ fontSize: 11, color: '#4b5563' }}>{layout.department}</div>}
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 16, textTransform: 'uppercase', letterSpacing: '.08em' }}>
          Gabarito{versionLabel ? ` — Modelo ${versionLabel}` : ''}
        </div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{exam.title}</div>
        {exam.avaliacao && <div style={{ fontSize: 11, color: '#6b7280' }}>{exam.avaliacao}{exam.chamada ? ` — ${exam.chamada}` : ''}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 8 }}>
        {exam.questions.map(q => (
          <div key={q.id} style={{ textAlign: 'center', border: '1.5px solid #e5e7eb', borderRadius: 6, padding: '8px 4px' }}>
            <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>{String(q.question_order).padStart(2, '0')}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>{q.correct_answer?.toUpperCase()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════ main component ══════════════════════════════════ */
export default function ExamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const pdfRef = useRef(null);
  const gabRef = useRef(null);
  const imgInputRef = useRef(null);

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showGabarito, setShowGabarito] = useState(false);
  const [corrections, setCorrections] = useState([]);
  const [showLayoutModal] = useState(false);
  const [layout, setLayout] = useState(loadLayout);
  const [savingPdf, setSavingPdf] = useState(false);
  const [savingGab, setSavingGab] = useState(false);

  // Versions (shuffled models)
  const [numVersions, setNumVersions] = useState(1);
  const [versions, setVersions] = useState([]);
  const [activeVersion, setActiveVersion] = useState(0);

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [uploadingImg, setUploadingImg] = useState(false);

  useEffect(() => {
    Promise.all([api.get(`/exams/${id}`), api.get(`/corrections?examId=${id}`)])
      .then(([er, cr]) => { setExam(er.data.exam); setCorrections(cr.data.corrections); })
      .catch(e => setError(e.response?.data?.error || 'Erro ao carregar prova'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!exam?.questions?.length || numVersions <= 1) {
      setVersions([]);
      setActiveVersion(0);
      return;
    }
    setVersions(Array.from({ length: numVersions }, (_, i) => buildVersion(exam.questions, i)));
    setActiveVersion(0);
  }, [numVersions, exam]);

  const handleDelete = async () => {
    if (!confirm('Deletar esta prova e todas as correções?')) return;
    try { await api.delete(`/exams/${id}`); navigate('/'); }
    catch (e) { setError(e.response?.data?.error || 'Erro ao deletar'); }
  };

  /* PDF download */
  const handleSavePdf = async () => {
    setSavingPdf(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf()
        .set({
          margin: [8, 6, 14, 6],
          filename: `${exam.title}${versionLabel ? ` - Modelo ${versionLabel}` : ''}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'] },
        })
        .from(pdfRef.current)
        .toPdf()
        .get('pdf')
        .then(pdf => {
          const total = pdf.internal.getNumberOfPages();
          const W = pdf.internal.pageSize.getWidth();
          const H = pdf.internal.pageSize.getHeight();
          for (let i = 1; i <= total; i++) {
            pdf.setPage(i);
            // Linha do rodapé
            pdf.setDrawColor(150, 150, 150);
            pdf.setLineWidth(0.3);
            pdf.line(6, H - 10, W - 6, H - 10);
            // Número de página
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

  /* Gabarito PDF */
  const handleSaveGabaritoPdf = async () => {
    setSavingGab(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf()
        .set({
          margin: [8, 6, 14, 6],
          filename: `Gabarito${versionLabel ? ` Modelo ${versionLabel}` : ''} - ${exam.title}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(gabRef.current)
        .toPdf()
        .get('pdf')
        .then(pdf => {
          const W = pdf.internal.pageSize.getWidth();
          const H = pdf.internal.pageSize.getHeight();
          pdf.setDrawColor(150, 150, 150);
          pdf.setLineWidth(0.3);
          pdf.line(6, H - 10, W - 6, H - 10);
          pdf.setFontSize(8);
          pdf.setTextColor(120, 120, 120);
          pdf.text('Gabarito — ' + exam.title, W / 2, H - 6, { align: 'center' });
        })
        .save();
    } catch (e) {
      alert('Erro ao gerar gabarito: ' + e.message);
    } finally {
      setSavingGab(false);
    }
  };

  /* Edit helpers */
  const startEdit = q => {
    setEditingId(q.id);
    setEditError('');
    setEditForm({
      question_text: q.question_text,
      option_a: q.option_a, option_b: q.option_b, option_c: q.option_c,
      option_d: q.option_d, option_e: q.option_e,
      correct_answer: q.correct_answer,
      difficulty: q.difficulty,
      image_path: q.image_path || '',
    });
  };

  const cancelEdit = () => { setEditingId(null); setEditForm({}); setEditError(''); };

  const saveEdit = async questionId => {
    setSaving(true); setEditError('');
    try {
      await api.put(`/exams/questions/${questionId}`, editForm);
      setExam(prev => ({
        ...prev,
        questions: prev.questions.map(q => q.id === questionId ? { ...q, ...editForm } : q),
      }));
      setEditingId(null);
    } catch (e) { setEditError(e.response?.data?.error || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const setField = (k, v) => setEditForm(f => ({ ...f, [k]: v }));

  /* Question image upload */
  const handleQuestionImage = async e => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImg(true);
    const fd = new FormData();
    fd.append('image', file);
    try {
      const res = await api.post(`/exams/questions/${editingId}/image`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setField('image_path', res.data.imagePath);
    } catch (e) {
      setEditError('Erro ao enviar imagem: ' + (e.response?.data?.error || e.message));
    } finally {
      setUploadingImg(false);
      e.target.value = '';
    }
  };

  const closeLayoutModal = () => {};

  if (loading) return <div className="page"><div className="spinner-wrap"><div className="spinner" /><span className="spinner-text">Carregando prova...</span></div></div>;
  if (error)   return <div className="page"><div className="alert alert-error">{error}</div></div>;
  if (!exam)   return null;

  const activeQuestions = numVersions > 1 ? (versions[activeVersion]?.questions || exam.questions) : exam.questions;
  const versionLabel = numVersions > 1 ? (versions[activeVersion]?.label || 'A') : null;
  const activeExam = { ...exam, questions: activeQuestions };

  return (
    <div className="page">
      {/* off-screen PDF templates */}
      <div style={{ overflow: 'hidden', height: 0, position: 'relative' }}>
        <ExamPrintTemplate exam={activeExam} layout={layout} pdfRef={pdfRef} versionLabel={versionLabel} />
        <GabaritoPrintTemplate exam={activeExam} layout={layout} gabRef={gabRef} versionLabel={versionLabel} />
      </div>

      {/* Header — oculto na impressão */}
      <div className="no-print">
        <div className="page-header">
          <div className="actions-row">
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>← Voltar</button>
          </div>
          <h1 className="page-title" style={{ marginTop: 12 }}>{exam.title}</h1>
          <p className="page-subtitle">
            {exam.questions?.length} questões • PDF: {exam.pdf_name || 'N/A'} •{' '}
            {new Date(exam.created_at).toLocaleDateString('pt-BR')}
          </p>
        </div>

        <div className="actions-row" style={{ marginBottom: numVersions > 1 ? 12 : 20, flexWrap: 'wrap', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => window.print()}>
            <Ico.Print /> Imprimir
          </button>
          <button className="btn btn-ghost" onClick={handleSavePdf} disabled={savingPdf}>
            <Ico.Pdf /> {savingPdf ? 'Gerando PDF...' : 'Salvar Prova PDF'}
          </button>
          <button className="btn btn-ghost" onClick={handleSaveGabaritoPdf} disabled={savingGab}>
            <Ico.Check /> {savingGab ? 'Gerando...' : 'Salvar Gabarito PDF'}
          </button>
          <button className="btn btn-ghost" onClick={() => setShowGabarito(v => !v)}>
            {showGabarito ? <Ico.EyeOff /> : <Ico.Eye />}
            {showGabarito ? 'Ocultar gabarito' : 'Ver gabarito'}
          </button>
          <div className="spacer" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>Modelos:</span>
            <select className="form-select" style={{ width: 72, padding: '5px 8px' }}
              value={numVersions} onChange={e => setNumVersions(Number(e.target.value))}>
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>
            <Ico.Trash /> Deletar
          </button>
        </div>

        {numVersions > 1 && (
          <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: '2px solid #e5e7eb' }}>
            {versions.map((v, i) => (
              <button key={v.label} onClick={() => setActiveVersion(i)} style={{
                padding: '7px 22px', fontSize: 14, fontWeight: 600,
                border: 'none', cursor: 'pointer', borderRadius: '6px 6px 0 0',
                background: i === activeVersion ? '#1e293b' : '#f1f5f9',
                color: i === activeVersion ? '#fff' : '#64748b',
                marginBottom: -2, transition: 'background .15s, color .15s',
              }}>
                Prova {v.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Título na impressão */}
      <div className="print-only" style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{exam.title}</h1>
        <p style={{ color: '#6b7280', fontSize: '.9rem' }}>{exam.questions?.length} questões • {new Date(exam.created_at).toLocaleDateString('pt-BR')}</p>
        <hr style={{ margin: '12px 0' }} />
      </div>

      {/* Gabarito inline */}
      {showGabarito && (
        <div className="card no-print" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>
            Gabarito{versionLabel ? ` — Modelo ${versionLabel}` : ''}
          </h2>
          <div className="gabarito-grid">
            {activeQuestions.map(q => (
              <div key={q.id} className="gabarito-item">
                <div className="gabarito-num">Q{q.question_order}</div>
                <div className="gabarito-ans">{q.correct_answer?.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Questões */}
      <div>
        {activeQuestions.map(q => (
          <div key={q.id} className="question-card">
            {editingId === q.id ? (
              /* ── MODO EDIÇÃO ── */
              <div>
                {editError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{editError}</div>}

                <div className="form-group">
                  <label className="form-label">Enunciado</label>
                  <textarea className="form-textarea" rows={3}
                    value={editForm.question_text}
                    onChange={e => setField('question_text', e.target.value)} />
                </div>

                {/* Image upload */}
                <div className="form-group">
                  <label className="form-label">Imagem da questão (opcional)</label>
                  {editForm.image_path && (
                    <div style={{ marginBottom: 8, position: 'relative', display: 'inline-block' }}>
                      <img src={`${API_URL}${editForm.image_path}`} alt="Imagem da questão"
                        style={{ maxWidth: 320, maxHeight: 200, borderRadius: 6, border: '1px solid #e5e7eb', display: 'block' }} />
                      <button
                        onClick={() => setField('image_path', '')}
                        style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,.6)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', padding: '2px 6px', fontSize: 12 }}
                      >✕</button>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button type="button" className="btn btn-ghost btn-sm"
                      onClick={() => imgInputRef.current.click()} disabled={uploadingImg}>
                      <Ico.Image /> {uploadingImg ? 'Enviando...' : editForm.image_path ? 'Trocar imagem' : 'Adicionar imagem'}
                    </button>
                    <span className="form-hint">JPG, PNG • Máx. 5 MB</span>
                  </div>
                  <input ref={imgInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={handleQuestionImage} />
                </div>

                {['a','b','c','d','e'].map(l => (
                  <div className="form-group" key={l}>
                    <label className="form-label">Alternativa {l.toUpperCase()}</label>
                    <input type="text" className="form-input"
                      value={editForm[`option_${l}`]}
                      onChange={e => setField(`option_${l}`, e.target.value)} />
                  </div>
                ))}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Resposta correta</label>
                    <select className="form-select" value={editForm.correct_answer}
                      onChange={e => setField('correct_answer', e.target.value)}>
                      {['a','b','c','d','e'].map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Dificuldade</label>
                    <select className="form-select" value={editForm.difficulty}
                      onChange={e => setField('difficulty', e.target.value)}>
                      <option value="easy">Fácil</option>
                      <option value="medium">Médio</option>
                      <option value="hard">Difícil</option>
                    </select>
                  </div>
                </div>

                <div className="actions-row" style={{ marginTop: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={cancelEdit} disabled={saving}>Cancelar</button>
                  <div className="spacer" />
                  <button className="btn btn-primary btn-sm" onClick={() => saveEdit(q.id)} disabled={saving || uploadingImg}>
                    {saving ? 'Salvando...' : 'Salvar questão'}
                  </button>
                </div>
              </div>
            ) : (
              /* ── MODO VISUALIZAÇÃO ── */
              <>
                <div className="question-header">
                  <div className="question-number">{q.question_order}</div>
                  <div className="question-text" style={{ whiteSpace: 'pre-line' }}>{fmtQ(q.question_text)}</div>
                  <span className={`badge ${diffBadge[q.difficulty]} difficulty-badge no-print`}>
                    {diffLabel[q.difficulty]}
                  </span>
                  <button className="btn btn-ghost btn-sm no-print" style={{ marginLeft: 4, flexShrink: 0 }}
                    onClick={() => startEdit(q)}>
                    <Ico.Edit /> Editar
                  </button>
                </div>
                {q.image_path && (
                  <div style={{ margin: '8px 0 8px 38px' }}>
                    <img src={`${API_URL}${q.image_path}`} alt="Imagem da questão"
                      style={{ maxWidth: '70%', maxHeight: 240, borderRadius: 6, border: '1px solid #e5e7eb' }} />
                  </div>
                )}
                <ul className="options-list">
                  {['a','b','c','d','e'].map(l => (
                    <li key={l}
                      className={`option-item${showGabarito && q.correct_answer === l ? ' correct' : ''}`}>
                      <span className="option-letter">{l.toUpperCase()})</span>
                      <span style={{ textAlign: 'justify' }}>{q[`option_${l}`]}</span>
                      {showGabarito && q.correct_answer === l && (
                        <span style={{ marginLeft: 'auto', fontSize: '.8rem', color: '#16a34a', fontWeight: 600, flexShrink: 0 }}>
                          Correta
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Gabarito separado — visível na tela abaixo das questões */}
      <div className="card no-print" style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>
          Gabarito{versionLabel ? ` — Modelo ${versionLabel}` : ''}
        </h2>
        <div className="gabarito-grid">
          {activeQuestions.map(q => (
            <div key={q.id} className="gabarito-item">
              <div className="gabarito-num">Q{q.question_order}</div>
              <div className="gabarito-ans">{q.correct_answer?.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Correções */}
      {corrections.length > 0 && (
        <div className="card no-print" style={{ marginTop: 16 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>
            Correções realizadas ({corrections.length})
          </h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Aluno</th><th>Acertos</th><th>Nota</th><th>Data</th></tr></thead>
              <tbody>
                {corrections.map(c => (
                  <tr key={c.id}>
                    <td>{c.student_name}</td>
                    <td>{c.correct_answers}/{c.total_questions}</td>
                    <td><strong style={{ color: parseFloat(c.score) >= 6 ? '#16a34a' : '#dc2626' }}>{parseFloat(c.score).toFixed(1)}</strong></td>
                    <td>{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal layout */}
      {showLayoutModal && <LayoutModal onClose={closeLayoutModal} />}
    </div>
  );
}
