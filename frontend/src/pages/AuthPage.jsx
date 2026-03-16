import { useEffect, useState } from 'react';
import api from '../api';
import logo from '../assets/img/logo.png';
import appIcon from '../assets/img/app_icon.png';
import { ensureBgmStarted } from '../bgmPlayer';

function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const tryPlay = () => {
      ensureBgmStarted().catch(() => {
      });
    };

    const handleFirstInteraction = () => {
      tryPlay();
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };

    tryPlay();
    window.addEventListener('pointerdown', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);

    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

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
      setErrorMessage(error.response?.data?.error || 'Não foi possível concluir a autenticação.');
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
            <span>Usuário</span>
            <input
              type="text"
              value={formData.username}
              onChange={(event) => handleChange('username', event.target.value)}
              placeholder="Seu usuário no AeroChat"
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