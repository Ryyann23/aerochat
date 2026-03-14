import { useState } from 'react';
import api from '../api';
import logo from '../assets/img/logo.png';
import appIcon from '../assets/img/app_icon.png';

function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (field, value) => {
    setFormData((currentData) => ({
      ...currentData,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload = {
        username: formData.username,
        password: formData.password,
      };

      const response = await api.post(endpoint, payload);
      onAuthenticated(response.data);
    } catch (error) {
      setErrorMessage(error.response?.data?.error || 'Nao foi possivel concluir a autenticacao.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-card auth-brand-card">
        <img src={logo} alt="AeroChat" className="auth-logo" />
        <div className="auth-brand-copy">
          <img src={appIcon} alt="App icon" className="auth-app-icon" />
          <h1>Entre no AeroChat</h1>
          <p>
            Crie sua conta, escolha os grupos que quer acompanhar e use o chat com a mesma
            interface do desktop.
          </p>
        </div>
      </section>

      <section className="auth-card auth-form-card">
        <div className="auth-mode-switch">
          <button
            type="button"
            className={`auth-mode-button ${mode === 'login' ? 'active' : ''}`}
            onClick={() => setMode('login')}
          >
            Login
          </button>
          <button
            type="button"
            className={`auth-mode-button ${mode === 'register' ? 'active' : ''}`}
            onClick={() => setMode('register')}
          >
            Registro
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Usuario</span>
            <input
              type="text"
              value={formData.username}
              onChange={(event) => handleChange('username', event.target.value)}
              placeholder="Seu usuario no AeroChat"
              required
            />
          </label>

          <label className="auth-field">
            <span>Senha</span>
            <input
              type="password"
              value={formData.password}
              onChange={(event) => handleChange('password', event.target.value)}
              placeholder="Digite sua senha"
              required
            />
          </label>

          {errorMessage && <p className="auth-error">{errorMessage}</p>}

          <button type="submit" className="auth-submit-button" disabled={isSubmitting}>
            {isSubmitting
              ? 'Processando...'
              : mode === 'login'
                ? 'Entrar'
                : 'Registrar'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default AuthPage;