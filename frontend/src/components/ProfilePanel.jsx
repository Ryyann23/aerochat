import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import UserAvatar from './UserAvatar';

function ProfilePanel({ currentUser, onClose, onProfileUpdated }) {
  const [formData, setFormData] = useState({
    username: currentUser.name || '',
    avatarColor: currentUser.avatarColor || '#5FC9DE',
    bubbleColor: currentUser.bubbleColor || '#5C91E8',
    currentPassword: '',
    newPassword: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setFormData((current) => ({
      ...current,
      username: currentUser.name || '',
      avatarColor: currentUser.avatarColor || '#5FC9DE',
      bubbleColor: currentUser.bubbleColor || '#5C91E8',
    }));
  }, [currentUser.avatarColor, currentUser.bubbleColor, currentUser.name]);

  const createdAtLabel = useMemo(() => {
    if (!currentUser.createdAt) {
      return 'Não informado';
    }

    return new Date(currentUser.createdAt).toLocaleString('pt-BR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }, [currentUser.createdAt]);

  const colorPickerValue = /^#[0-9a-fA-F]{6}$/.test(formData.avatarColor)
    ? formData.avatarColor
    : '#5FC9DE';

  const bubbleColorPickerValue = /^#[0-9a-fA-F]{6}$/.test(formData.bubbleColor)
    ? formData.bubbleColor
    : '#5C91E8';

  const handleChange = (field, value) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    const payload = {};
    const trimmedUsername = formData.username.trim();

    if (!trimmedUsername) {
      setErrorMessage('O nome de usuário não pode ficar vazio.');
      setIsSaving(false);
      return;
    }

    if (trimmedUsername !== currentUser.name) {
      payload.username = trimmedUsername;
    }

    if (formData.avatarColor.toUpperCase() !== (currentUser.avatarColor || '').toUpperCase()) {
      payload.avatarColor = formData.avatarColor;
    }

    if (formData.bubbleColor.toUpperCase() !== (currentUser.bubbleColor || '').toUpperCase()) {
      payload.bubbleColor = formData.bubbleColor;
    }

    const shouldUpdatePassword = formData.currentPassword || formData.newPassword;

    if (shouldUpdatePassword) {
      if (!formData.currentPassword || !formData.newPassword) {
        setErrorMessage('Para mudar a senha, informe a senha atual e a nova senha.');
        setIsSaving(false);
        return;
      }

      payload.currentPassword = formData.currentPassword;
      payload.newPassword = formData.newPassword;
    }

    if (Object.keys(payload).length === 0) {
      setErrorMessage('Nenhuma alteração para salvar.');
      setIsSaving(false);
      return;
    }

    try {
      const response = await api.patch(`/users/${currentUser.id}/profile`, payload);
      onProfileUpdated(response.data);
      setFormData((current) => ({
        ...current,
        username: response.data.name,
        avatarColor: response.data.avatarColor,
        bubbleColor: response.data.bubbleColor,
        currentPassword: '',
        newPassword: '',
      }));
      setSuccessMessage('Perfil atualizado com sucesso.');
    } catch (error) {
      setErrorMessage(error.response?.data?.error || 'Não foi possível atualizar o perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="group-picker-inline-shell">
      <section className="modal-card group-picker-modal group-picker-modal-inline profile-panel-modal">
        <div className="group-picker-header profile-panel-header">
          <div>
            <h2>Perfil</h2>
            <p>Visualize e edite os dados da sua conta.</p>
          </div>
          <button
            type="button"
            className="action-button primary modal-close-button"
            onClick={onClose}
          >
            Voltar ao chat
          </button>
        </div>

        <div className="profile-panel-grid">
          <article className="profile-panel-card profile-overview-card">
            <div className="profile-avatar-wrap">
              <UserAvatar
                name={formData.username || currentUser.name}
                color={formData.avatarColor}
                className="profile-avatar-preview"
              />
            </div>

            <dl className="profile-overview-list">
              <div>
                <dt>Nome do Usuário</dt>
                <dd>{currentUser.name}</dd>
              </div>
              <div>
                <dt>ID</dt>
                <dd>{currentUser.publicId || currentUser.id}</dd>
              </div>
              <div>
                <dt>Conta criada em</dt>
                <dd>{createdAtLabel}</dd>
              </div>
            </dl>
          </article>

          <form className="profile-panel-card profile-form" onSubmit={handleSubmit}>
            <label className="profile-field">
              <span>Nome de usuário</span>
              <input
                type="text"
                value={formData.username}
                onChange={(event) => handleChange('username', event.target.value)}
                placeholder="Seu nome no AeroChat"
                required
              />
            </label>

            <label className="profile-field">
              <span>Cor do avatar</span>
              <div className="profile-color-field">
                <input
                  type="color"
                  value={colorPickerValue}
                  onChange={(event) => handleChange('avatarColor', event.target.value.toUpperCase())}
                />
                <input
                  type="text"
                  value={formData.avatarColor}
                  onChange={(event) => handleChange('avatarColor', event.target.value.toUpperCase())}
                  pattern="^#[0-9A-Fa-f]{6}$"
                  title="Use o formato #RRGGBB"
                />
              </div>
            </label>

            <label className="profile-field">
              <span>Cor do balão da mensagem</span>
              <div className="profile-color-field">
                <input
                  type="color"
                  value={bubbleColorPickerValue}
                  onChange={(event) => handleChange('bubbleColor', event.target.value.toUpperCase())}
                />
                <input
                  type="text"
                  value={formData.bubbleColor}
                  onChange={(event) => handleChange('bubbleColor', event.target.value.toUpperCase())}
                  pattern="^#[0-9A-Fa-f]{6}$"
                  title="Use o formato #RRGGBB"
                />
              </div>
            </label>

            <label className="profile-field">
              <span>Senha atual</span>
              <input
                type="password"
                value={formData.currentPassword}
                onChange={(event) => handleChange('currentPassword', event.target.value)}
                placeholder="Obrigatória para trocar senha"
              />
            </label>

            <label className="profile-field">
              <span>Nova senha</span>
              <input
                type="password"
                value={formData.newPassword}
                onChange={(event) => handleChange('newPassword', event.target.value)}
                placeholder="Digite uma nova senha"
              />
            </label>

            {errorMessage && <p className="profile-feedback error">{errorMessage}</p>}
            {successMessage && <p className="profile-feedback success">{successMessage}</p>}

            <button type="submit" className="action-button primary" disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

export default ProfilePanel;
