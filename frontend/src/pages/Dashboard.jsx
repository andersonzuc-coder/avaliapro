import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const FileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
);
const ClipboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
  </svg>
);
const CheckSquareIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4"/>
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
  </svg>
);

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentExams, setRecentExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const examsRes = await api.get('/exams');
      setRecentExams(examsRes.data.exams || []);
    } catch (e) {
      console.error('Erro ao carregar provas:', e);
    }
    if (isAdmin) {
      try {
        const statsRes = await api.get('/users/stats');
        setStats(statsRes.data.stats);
      } catch (e) {
        console.error('Erro ao carregar stats:', e);
      }
    }
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async (id) => {
    if (!window.confirm('Deseja realmente deletar esta prova?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/exams/${id}`);
      loadData();
    } catch {
      alert('Erro ao deletar prova.');
    } finally {
      setDeletingId(null);
    }
  };

  const statusLabel = { draft: 'Rascunho', active: 'Ativa', closed: 'Encerrada' };
  const statusBadge = { draft: 'badge-gray', active: 'badge-green', closed: 'badge-red' };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Olá, {user?.name?.split(' ')[0]}!</h1>
        <p className="page-subtitle">Bem-vindo à Plataforma de Provas</p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>Ações rápidas</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/pdfs" className="btn btn-ghost">Enviar PDF</Link>
          <Link to="/exams/generate" className="btn btn-primary">Gerar Prova</Link>
          <Link to="/correct" className="btn btn-success">Corrigir Prova</Link>
        </div>
      </div>

      {isAdmin && stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon"><UsersIcon /></span>
            <div>
              <div className="stat-label">Usuários</div>
              <div className="stat-value">{stats.users}</div>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon"><FileIcon /></span>
            <div>
              <div className="stat-label">PDFs</div>
              <div className="stat-value">{stats.pdfs}</div>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon"><ClipboardIcon /></span>
            <div>
              <div className="stat-label">Provas</div>
              <div className="stat-value">{stats.exams}</div>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon"><CheckSquareIcon /></span>
            <div>
              <div className="stat-label">Correções</div>
              <div className="stat-value">{stats.corrections}</div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="actions-row" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>
            Todas as provas {recentExams.length > 0 && `(${recentExams.length})`}
          </h2>
          <div className="spacer" />
          <Link to="/exams/generate" className="btn btn-sm btn-primary">+ Nova prova</Link>
        </div>

        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : recentExams.length === 0 ? (
          <div className="empty-state">
            <p>Nenhuma prova criada ainda.</p>
            <Link to="/exams/generate" className="btn btn-primary" style={{ marginTop: 16 }}>
              Criar primeira prova
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Disciplina</th>
                  {isAdmin && <th>Professor</th>}
                  <th>Questões</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentExams.map(exam => (
                  <tr key={exam.id}>
                    <td><strong>{exam.title}</strong></td>
                    {isAdmin && <td style={{ color: '#6b7280', fontSize: '.85rem' }}>{exam.user_name || '—'}</td>}
                    <td>{exam.question_count || 0} questões</td>
                    <td>
                      <span className={`badge ${statusBadge[exam.status]}`}>
                        {statusLabel[exam.status]}
                      </span>
                    </td>
                    <td>{new Date(exam.created_at).toLocaleDateString('pt-BR')}</td>
                    <td style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn btn-sm btn-primary" onClick={() => navigate(`/exams/${exam.id}`)}>
                        Abrir
                      </button>
                      <button className="btn btn-sm btn-danger"
                        disabled={deletingId === exam.id}
                        onClick={() => handleDelete(exam.id)}>
                        {deletingId === exam.id ? '...' : 'Deletar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
