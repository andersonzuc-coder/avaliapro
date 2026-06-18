import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Turmas() {
  const [turmas, setTurmas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTurma, setSelectedTurma] = useState(null);
  const [alunos, setAlunos] = useState([]);
  const [loadingAlunos, setLoadingAlunos] = useState(false);

  // forms
  const [newTurmaName, setNewTurmaName] = useState('');
  const [newTurmaDesc, setNewTurmaDesc] = useState('');
  const [newAlunoName, setNewAlunoName] = useState('');
  const [newAlunoMat, setNewAlunoMat] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { loadTurmas(); }, []);

  const loadTurmas = async () => {
    try {
      const res = await api.get('/turmas');
      setTurmas(res.data.turmas);
    } catch { setError('Erro ao carregar turmas'); }
    finally { setLoading(false); }
  };

  const loadAlunos = async turma => {
    setSelectedTurma(turma);
    setAlunos([]);
    setLoadingAlunos(true);
    setShowBulk(false);
    setNewAlunoName(''); setNewAlunoMat('');
    try {
      const res = await api.get(`/turmas/${turma.id}/alunos`);
      setAlunos(res.data.alunos);
    } catch { setError('Erro ao carregar alunos'); }
    finally { setLoadingAlunos(false); }
  };

  const handleCreateTurma = async e => {
    e.preventDefault();
    if (!newTurmaName.trim()) return;
    setError(''); setSuccess('');
    try {
      const res = await api.post('/turmas', { name: newTurmaName, description: newTurmaDesc });
      setTurmas(prev => [...prev, { ...res.data.turma, total_alunos: 0 }]);
      setNewTurmaName(''); setNewTurmaDesc('');
      setSuccess('Turma criada com sucesso!');
    } catch (e) { setError(e.response?.data?.error || 'Erro ao criar turma'); }
  };

  const handleDeleteTurma = async id => {
    if (!confirm('Deletar esta turma e todos os alunos?')) return;
    try {
      await api.delete(`/turmas/${id}`);
      setTurmas(prev => prev.filter(t => t.id !== id));
      if (selectedTurma?.id === id) { setSelectedTurma(null); setAlunos([]); }
    } catch (e) { setError(e.response?.data?.error || 'Erro ao deletar'); }
  };

  const handleAddAluno = async e => {
    e.preventDefault();
    if (!newAlunoName.trim()) return;
    setError('');
    try {
      const res = await api.post(`/turmas/${selectedTurma.id}/alunos`, {
        name: newAlunoName.trim(), matricula: newAlunoMat.trim(),
      });
      setAlunos(prev => [...prev, res.data.aluno].sort((a, b) => a.name.localeCompare(b.name)));
      setTurmas(prev => prev.map(t => t.id === selectedTurma.id ? { ...t, total_alunos: Number(t.total_alunos) + 1 } : t));
      setNewAlunoName(''); setNewAlunoMat('');
    } catch (e) { setError(e.response?.data?.error || 'Erro ao adicionar aluno'); }
  };

  const handleBulkAdd = async () => {
    const names = bulkText.split('\n').map(s => s.trim()).filter(Boolean);
    if (!names.length) return;
    setError('');
    try {
      const res = await api.post(`/turmas/${selectedTurma.id}/alunos/bulk`, { names });
      setSuccess(`${res.data.inserted} aluno(s) adicionado(s)!`);
      setBulkText(''); setShowBulk(false);
      const r2 = await api.get(`/turmas/${selectedTurma.id}/alunos`);
      setAlunos(r2.data.alunos);
      setTurmas(prev => prev.map(t => t.id === selectedTurma.id
        ? { ...t, total_alunos: r2.data.alunos.length } : t));
    } catch (e) { setError(e.response?.data?.error || 'Erro ao importar'); }
  };

  const handleDeleteAluno = async id => {
    try {
      await api.delete(`/turmas/alunos/${id}`);
      setAlunos(prev => prev.filter(a => a.id !== id));
      setTurmas(prev => prev.map(t => t.id === selectedTurma.id
        ? { ...t, total_alunos: Number(t.total_alunos) - 1 } : t));
    } catch (e) { setError(e.response?.data?.error || 'Erro ao remover'); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Turmas e Alunos</h1>
        <p className="page-subtitle">Cadastre suas turmas e alunos para gerar provas personalizadas</p>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, alignItems: 'start' }}>

        {/* Coluna esquerda: lista de turmas */}
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 14 }}>Nova turma</h2>
            <form onSubmit={handleCreateTurma}>
              <div className="form-group">
                <label className="form-label">Nome da turma</label>
                <input className="form-input" placeholder="Ex: 3º Ano A — 2026"
                  value={newTurmaName} onChange={e => setNewTurmaName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Descrição (opcional)</label>
                <input className="form-input" placeholder="Ex: Turno matutino"
                  value={newTurmaDesc} onChange={e => setNewTurmaDesc(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary btn-full">Criar turma</button>
            </form>
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 14 }}>
              Minhas turmas ({turmas.length})
            </h2>
            {loading ? (
              <div className="spinner-wrap"><div className="spinner" /></div>
            ) : turmas.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: 14 }}>Nenhuma turma cadastrada.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {turmas.map(t => (
                  <div key={t.id}
                    onClick={() => loadAlunos(t)}
                    style={{
                      padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                      border: `2px solid ${selectedTurma?.id === t.id ? '#1e293b' : '#e5e7eb'}`,
                      background: selectedTurma?.id === t.id ? '#f0f9ff' : '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      transition: 'border .15s, background .15s',
                    }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{t.name}</div>
                      {t.description && <div style={{ fontSize: 12, color: '#9ca3af' }}>{t.description}</div>}
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                        {t.total_alunos} aluno{t.total_alunos !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <button className="btn btn-danger btn-sm"
                      onClick={e => { e.stopPropagation(); handleDeleteTurma(t.id); }}
                      style={{ flexShrink: 0 }}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Coluna direita: alunos da turma selecionada */}
        <div>
          {!selectedTurma ? (
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
              <p style={{ color: '#9ca3af' }}>Selecione uma turma para ver e gerenciar os alunos</p>
            </div>
          ) : (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>{selectedTurma.name}</h2>
                  <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{alunos.length} aluno(s)</p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowBulk(v => !v)}>
                  {showBulk ? 'Cancelar importação' : '+ Importar lista'}
                </button>
              </div>

              {/* Importar lista em massa */}
              {showBulk && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                  <label className="form-label">Cole os nomes (um por linha)</label>
                  <textarea className="form-textarea" rows={6}
                    placeholder={"João da Silva\nMaria Oliveira\nPedro Santos"}
                    value={bulkText} onChange={e => setBulkText(e.target.value)} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button className="btn btn-primary" onClick={handleBulkAdd}
                      disabled={!bulkText.trim()}>
                      Importar {bulkText.split('\n').filter(s => s.trim()).length} aluno(s)
                    </button>
                    <button className="btn btn-ghost" onClick={() => setShowBulk(false)}>Cancelar</button>
                  </div>
                </div>
              )}

              {/* Adicionar aluno individual */}
              <form onSubmit={handleAddAluno} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, marginBottom: 20, alignItems: 'end' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Nome do aluno</label>
                  <input className="form-input" placeholder="Nome completo"
                    value={newAlunoName} onChange={e => setNewAlunoName(e.target.value)} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0, width: 140 }}>
                  <label className="form-label">Matrícula</label>
                  <input className="form-input" placeholder="(opcional)"
                    value={newAlunoMat} onChange={e => setNewAlunoMat(e.target.value)} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ height: 40, alignSelf: 'end' }}>
                  + Adicionar
                </button>
              </form>

              {/* Lista de alunos */}
              {loadingAlunos ? (
                <div className="spinner-wrap"><div className="spinner" /></div>
              ) : alunos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af', fontSize: 14 }}>
                  Nenhum aluno cadastrado nesta turma.
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Nome</th>
                        <th>Matrícula</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {alunos.map((a, i) => (
                        <tr key={a.id}>
                          <td style={{ color: '#9ca3af', fontSize: 13 }}>{i + 1}</td>
                          <td><strong>{a.name}</strong></td>
                          <td style={{ color: '#6b7280', fontSize: 13 }}>{a.matricula || '—'}</td>
                          <td>
                            <button className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteAluno(a.id)}>✕</button>
                          </td>
                        </tr>
                      ))}
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
