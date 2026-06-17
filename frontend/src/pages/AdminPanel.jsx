import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const DEFAULT_INSTRUCTIONS = `1. Coloque seus pertences debaixo da carteira ou no chão. Não retire as carteiras de seus lugares.
2. É vedado o uso de calculadora, qualquer comunicação e troca de material entre os presentes.
3. Ao término da prova, o aluno poderá levar consigo o caderno de prova.
4. Não é permitido ao aluno ausentar-se da sala, em definitivo, antes de terminar sua prova.
5. Eventual deferimento da contestação pode acarretar atualização do gabarito ou anulação da questão.
6. Não faça perguntas no decorrer da prova, para não perturbar o ambiente de concentração. Nenhuma resposta ou esclarecimento oral será dado no horário da prova.
7. Cada questão discursiva deverá ser respondida em sua respectiva folha de resposta. Qualquer texto que ultrapasse o espaço destinado à resposta ou respondido na folha errada será desconsiderado.
8. Não serão consideradas as questões respondidas a lápis no Gabarito ou nas Folhas de Resposta.
9. Qualquer comportamento identificado, que represente uma burla à verificação da aprendizagem individual, acarreta resultado nulo para a respectiva prova individual.
10. As respostas rasuradas ou marcações múltiplas no Gabarito serão consideradas nulas.
11. No Gabarito, preencha toda a área destinada à marcação. Atenção: não faça X. Marque somente a área destinada à resposta.
12. O Gabarito e as Folhas de Resposta devem ser preenchidos com caneta esferográfica azul.
13. Não rasure o campo identificação e o código de barras do gabarito e das folhas de resposta, ou você os inutilizará.
14. Os equipamentos eletrônicos deverão estar desligados e debaixo da carteira.
15. Os cadernos de prova e de Folhas de Resposta não podem ser desgrampeados, rasgados ou amassados sem possibilidade de substituição.
16. Não são permitidos uso e/ou consulta a qualquer material impresso, manuscrito ou eletrônico (celular, relógio, protetores auriculares ou outros acessórios do gênero).
17. Esta prova é individual. Não se comunique com outros colegas.
18. Confira se você recebeu, com seu nome e matrícula impressos: o caderno de questões objetivas e discursivas; o gabarito das questões de múltipla escolha e as folhas de respostas para as questões discursivas.
19. A duração da prova será de 01h30. O tempo mínimo de permanência em sala é de 30 (trinta) minutos, após o início da prova.
20. Não será permitido o acesso à sala de prova ao aluno que se atrasar por mais de 30 (trinta) minutos do início da prova.
21. A contestação de alguma questão de prova, com as devidas justificativas teóricas, poderá ser solicitada via painel do aluno, no prazo de até 24 horas da divulgação do gabarito preliminar.
Sucesso em sua avaliação!`;

function loadLayout() {
  try { return JSON.parse(localStorage.getItem('avaliapro_layout') || '{}'); }
  catch { return {}; }
}

const ImageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
  </svg>
);

export default function AdminPanel() {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const logoRef = useRef();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' });
  const [creating, setCreating] = useState(false);
  const [exams, setExams] = useState([]);

  // Layout settings
  const saved = loadLayout();
  const [layout, setLayout] = useState({
    institution: saved.institution || '',
    department: saved.department || '',
    logo: saved.logo || '',
    instructions: saved.instructions || DEFAULT_INSTRUCTIONS,
  });
  const [savingLayout, setSavingLayout] = useState(false);

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return; }
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    try {
      const [usersRes, examsRes] = await Promise.all([api.get('/users'), api.get('/exams')]);
      setUsers(usersRes.data.users);
      setExams(examsRes.data.exams);
    } catch { setError('Erro ao carregar dados'); }
    finally { setLoading(false); }
  };

  const handleCreate = async e => {
    e.preventDefault(); setCreating(true); setError('');
    try {
      await api.post('/users', form);
      setSuccess('Usuário criado com sucesso!');
      setShowModal(false);
      setForm({ name: '', email: '', password: '', role: 'user' });
      loadData();
    } catch (err) { setError(err.response?.data?.error || 'Erro ao criar usuário'); }
    finally { setCreating(false); }
  };

  const handleDeleteUser = async (id, name) => {
    if (id === user?.id) { setError('Você não pode deletar sua própria conta'); return; }
    if (!confirm(`Deletar usuário "${name}"? Todos os dados serão perdidos.`)) return;
    try {
      await api.delete(`/users/${id}`);
      setUsers(u => u.filter(x => x.id !== id));
      setSuccess('Usuário deletado');
    } catch (err) { setError(err.response?.data?.error || 'Erro ao deletar'); }
  };

  const handleDeleteExam = async (id, title) => {
    if (!confirm(`Deletar a prova "${title}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/exams/${id}`);
      setExams(e => e.filter(x => x.id !== id));
      setSuccess('Prova deletada');
    } catch (err) { setError(err.response?.data?.error || 'Erro ao deletar prova'); }
  };

  const handleRoleChange = async (id, role) => {
    try {
      await api.put(`/users/${id}`, { role });
      setUsers(u => u.map(x => x.id === id ? { ...x, role } : x));
    } catch { setError('Erro ao atualizar perfil'); }
  };

  const handleLogoUpload = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setLayout(l => ({ ...l, logo: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleSaveLayout = () => {
    setSavingLayout(true);
    localStorage.setItem('avaliapro_layout', JSON.stringify(layout));
    setTimeout(() => { setSavingLayout(false); setSuccess('Configurações de layout salvas!'); }, 300);
  };

  if (loading) return <div className="page"><div className="spinner-wrap"><div className="spinner" /></div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Administração</h1>
        <p className="page-subtitle">Gerencie usuários, provas e configurações do sistema</p>
      </div>

      {error && <div className="alert alert-error" onClick={() => setError('')} style={{ cursor: 'pointer' }}>{error}</div>}
      {success && <div className="alert alert-success" onClick={() => setSuccess('')} style={{ cursor: 'pointer' }}>{success}</div>}

      {/* ── Usuários ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="actions-row" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Usuários ({users.length})</h2>
          <div className="spacer" />
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ Novo usuário</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nome</th><th>Email</th><th>Perfil</th><th>Cadastro</th><th></th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.name}</strong>
                    {u.id === user?.id && <span className="badge badge-blue" style={{ marginLeft: 6 }}>Você</span>}
                  </td>
                  <td style={{ color: '#6b7280' }}>{u.email}</td>
                  <td>
                    <select className="form-select" style={{ width: 'auto', padding: '4px 8px', fontSize: '.8rem' }}
                      value={u.role} disabled={u.id === user?.id}
                      onChange={e => handleRoleChange(u.id, e.target.value)}>
                      <option value="user">Professor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                  <td>
                    {u.id !== user?.id && (
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUser(u.id, u.name)}>
                        Deletar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Layout da Prova ── */}
      <div className="card">
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 4 }}>Layout da Prova (PDF)</h2>
        <p style={{ fontSize: '.85rem', color: '#6b7280', marginBottom: 20 }}>
          Configurações aplicadas automaticamente ao gerar o PDF das provas.
        </p>

        {/* Logo */}
        <div className="form-group">
          <label className="form-label">Logomarca da Instituição</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            {layout.logo
              ? <img src={layout.logo} alt="Logo" style={{ height: 64, borderRadius: 6, border: '1px solid #e5e7eb', objectFit: 'contain', background: '#f9fafb', padding: 4 }} />
              : <div style={{ width: 64, height: 64, background: '#f3f4f6', borderRadius: 6, border: '2px dashed #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}><ImageIcon /></div>
            }
            <div>
              <button className="btn btn-ghost btn-sm" onClick={() => logoRef.current.click()}>
                {layout.logo ? 'Trocar logomarca' : 'Selecionar imagem'}
              </button>
              {layout.logo && (
                <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8, color: 'var(--danger)' }}
                  onClick={() => setLayout(l => ({ ...l, logo: '' }))}>Remover</button>
              )}
              <p className="form-hint" style={{ marginTop: 4 }}>PNG ou JPG • Recomendado: 300×100 px</p>
            </div>
          </div>
          <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Nome da Instituição / Escola</label>
            <input type="text" className="form-input"
              placeholder="Ex: Universidade Federal de..."
              value={layout.institution}
              onChange={e => setLayout(l => ({ ...l, institution: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Departamento / Curso (opcional)</label>
            <input type="text" className="form-input"
              placeholder="Ex: Departamento de Ciências da Saúde"
              value={layout.department}
              onChange={e => setLayout(l => ({ ...l, department: e.target.value }))} />
          </div>
        </div>

        {/* Instruções */}
        <div className="form-group">
          <label className="form-label">Instruções ao aluno</label>
          <p className="form-hint" style={{ marginBottom: 8 }}>
            Texto exibido no cabeçalho de todas as provas impressas. Pré-preenchido com as instruções do modelo enviado.
          </p>
          <textarea
            className="form-textarea"
            rows={16}
            value={layout.instructions}
            onChange={e => setLayout(l => ({ ...l, instructions: e.target.value }))}
            style={{ fontFamily: 'inherit', fontSize: '.875rem', lineHeight: 1.7 }}
          />
        </div>

        <div className="actions-row">
          <button className="btn btn-ghost btn-sm"
            onClick={() => setLayout(l => ({ ...l, instructions: DEFAULT_INSTRUCTIONS }))}>
            Restaurar instruções padrão
          </button>
          <div className="spacer" />
          <button className="btn btn-primary" onClick={handleSaveLayout} disabled={savingLayout}>
            {savingLayout ? 'Salvando...' : 'Salvar configurações de layout'}
          </button>
        </div>
      </div>

      {/* Modal criar usuário */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <h2 className="modal-title">Novo Usuário</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Nome</label>
                <input type="text" className="form-input" required
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-input" required
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Senha</label>
                <input type="password" className="form-input" minLength={6} required
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Perfil</label>
                <select className="form-select" value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="user">Professor (acesso normal)</option>
                  <option value="admin">Administrador (acesso total)</option>
                </select>
              </div>
              <div className="actions-row">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                <div className="spacer" />
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Criando...' : 'Criar usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
