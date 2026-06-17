import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--gray-400)' }}>
    <polyline points="16 16 12 12 8 16"/>
    <line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
  </svg>
);
const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--success)' }}>
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

export default function UploadPDF() {
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dragover, setDragover] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewPdf, setPreviewPdf] = useState(null);
  const fileRef = useRef();

  useEffect(() => { loadPdfs(); }, []);

  const loadPdfs = async () => {
    try {
      const res = await api.get('/pdfs');
      setPdfs(res.data.pdfs);
    } catch {
      setError('Erro ao carregar PDFs');
    } finally {
      setLoading(false);
    }
  };

  const handleFile = file => {
    if (!file) return;
    if (file.type !== 'application/pdf') { setError('Apenas arquivos PDF são aceitos.'); return; }
    setSelectedFile(file);
    setError('');
    if (!form.title) setForm(f => ({ ...f, title: file.name.replace('.pdf', '') }));
  };

  const handleDrop = e => {
    e.preventDefault();
    setDragover(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async e => {
    e.preventDefault();
    if (!selectedFile) { setError('Selecione um arquivo PDF'); return; }
    setUploading(true);
    setError('');
    setSuccess('');
    const data = new FormData();
    data.append('pdf', selectedFile);
    data.append('title', form.title || selectedFile.name);
    data.append('description', form.description);
    try {
      await api.post('/pdfs/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSuccess('PDF enviado e texto extraído com sucesso!');
      setSelectedFile(null);
      setForm({ title: '', description: '' });
      fileRef.current.value = '';
      loadPdfs();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao enviar PDF');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Deletar "${name}"?`)) return;
    try {
      await api.delete(`/pdfs/${id}`);
      setPdfs(p => p.filter(pdf => pdf.id !== id));
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao deletar');
    }
  };

  const formatSize = bytes => {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Materiais PDF</h1>
        <p className="page-subtitle">Envie seus materiais de estudo para gerar provas automaticamente</p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>Enviar novo PDF</h2>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleUpload}>
          <div
            className={`upload-area${dragover ? ' dragover' : ''}`}
            onClick={() => fileRef.current.click()}
            onDragOver={e => { e.preventDefault(); setDragover(true); }}
            onDragLeave={() => setDragover(false)}
            onDrop={handleDrop}
            style={{ marginBottom: 16 }}
          >
            <div className="upload-icon">
              {selectedFile ? <CheckIcon /> : <UploadIcon />}
            </div>
            <div className="upload-text">
              {selectedFile
                ? <><strong>{selectedFile.name}</strong><br /><small>{formatSize(selectedFile.size)}</small></>
                : <><strong>Clique para selecionar</strong> ou arraste o PDF aqui</>
              }
            </div>
            <div className="upload-hint">PDF • Máximo 20 MB</div>
            <input ref={fileRef} type="file" accept=".pdf,application/pdf" style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files[0])} />
          </div>

          <div className="form-group">
            <label className="form-label">Título do material</label>
            <input type="text" className="form-input" placeholder="Ex: Biologia - Célula Animal"
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Descrição (opcional)</label>
            <textarea className="form-textarea" placeholder="Conteúdo, turma, unidade..." rows={2}
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          <button type="submit" className="btn btn-primary" disabled={uploading || !selectedFile}>
            {uploading ? 'Enviando e extraindo texto...' : 'Enviar PDF'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>
          Meus PDFs ({pdfs.length})
        </h2>

        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : pdfs.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum PDF enviado ainda.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Arquivo</th>
                  <th>Tamanho</th>
                  <th>Texto extraído</th>
                  <th>Data</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pdfs.map(pdf => (
                  <tr key={pdf.id}>
                    <td><strong>{pdf.title}</strong></td>
                    <td style={{ color: '#6b7280', fontSize: '.85rem' }}>{pdf.original_name}</td>
                    <td>{formatSize(pdf.file_size)}</td>
                    <td>
                      {pdf.text_length > 0
                        ? <span className="badge badge-green">{pdf.text_length.toLocaleString()} chars</span>
                        : <span className="badge badge-red">Sem texto</span>
                      }
                    </td>
                    <td>{new Date(pdf.created_at).toLocaleDateString('pt-BR')}</td>
                    <td>
                      <div className="actions-row">
                        <button className="btn btn-sm btn-ghost"
                          onClick={() => setPreviewPdf(previewPdf?.id === pdf.id ? null : pdf)}>
                          {previewPdf?.id === pdf.id ? 'Fechar' : 'Ver texto'}
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(pdf.id, pdf.title)}>
                          Deletar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {previewPdf && (
          <div style={{ marginTop: 16, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
            <h3 style={{ fontSize: '.9rem', fontWeight: 600, marginBottom: 8 }}>
              Texto extraído: {previewPdf.title}
            </h3>
            <PreviewText pdfId={previewPdf.id} />
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewText({ pdfId }) {
  const [text, setText] = useState('Carregando...');
  useEffect(() => {
    api.get(`/pdfs/${pdfId}`)
      .then(res => setText(res.data.pdf.extracted_text || '(Sem texto extraído)'))
      .catch(() => setText('Erro ao carregar texto'));
  }, [pdfId]);

  return (
    <pre style={{ whiteSpace: 'pre-wrap', fontSize: '.8rem', color: '#374151', maxHeight: 300, overflow: 'auto', lineHeight: 1.6 }}>
      {text}
    </pre>
  );
}
