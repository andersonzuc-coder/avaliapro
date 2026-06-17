import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Credenciais inválidas. Verifique e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <img src="/logo.png" alt="AvaliaPro" style={{ width: '100%', maxHeight: 120, objectFit: 'contain', marginBottom: 10 }} />
          <p style={{ fontSize: '1rem' }}>Plataforma inteligente de avaliações</p>
        </div>

        {error && (
          <div className="login-error">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="login-form-group">
            <label className="login-label">Email</label>
            <input
              type="email"
              className="login-input"
              placeholder="seu@email.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
              autoFocus
            />
          </div>
          <div className="login-form-group">
            <label className="login-label">Senha</label>
            <input
              type="password"
              className="login-input"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
            />
          </div>
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="login-hint">
          Credenciais padrão: <strong>admin@examplatform.com</strong> / <strong>Admin@123</strong>
        </p>
      </div>
    </div>
  );
}
