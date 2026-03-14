import groupIcon from '../assets/img/icon_group.png';

function GroupPickerModal({
  groups,
  onJoinGroup,
  onLeaveGroup,
  onClose,
  canClose,
  isSaving,
  inline = false,
}) {
  const joinedCount = groups.filter((group) => group.joined).length;
  const containerClassName = inline ? 'group-picker-inline-shell' : 'modal-backdrop';
  const cardClassName = `modal-card group-picker-modal ${inline ? 'group-picker-modal-inline' : ''}`;

  return (
    <div className={containerClassName}>
      <section className={cardClassName}>
        <div className="group-picker-header">
          <div>
            <h2>Escolha seus grupos</h2>
            <p>Entre nos grupos que quer acompanhar. Voce pode sair de um grupo depois.</p>
          </div>
          <button
            type="button"
            className="action-button primary modal-close-button"
            onClick={onClose}
            disabled={!canClose}
          >
            Continuar
          </button>
        </div>

        <div className="group-picker-grid">
          {groups.map((group) => (
            <article key={group.id} className={`group-picker-item ${group.joined ? 'joined' : ''}`}>
              <div className="group-picker-title">
                <img src={group.icon || groupIcon} alt={group.name} className="group-picker-icon" />
                <div>
                  <strong>{group.name}</strong>
                  <span>{group.description}</span>
                </div>
              </div>

              <div className="group-picker-meta">
                <span>{group.onlineCount} online</span>
                <span>{group.memberCount} membros</span>
              </div>

              <button
                type="button"
                className={`group-picker-button ${group.joined ? 'leave' : 'join'}`}
                onClick={() => (group.joined ? onLeaveGroup(group.id) : onJoinGroup(group.id))}
                disabled={isSaving}
              >
                {group.joined ? 'Sair do grupo' : 'Entrar no grupo'}
              </button>
            </article>
          ))}
        </div>

        {!canClose && (
          <p className="group-picker-hint">
            Entre em pelo menos um grupo para continuar. Selecionados: {joinedCount}
          </p>
        )}
      </section>
    </div>
  );
}

export default GroupPickerModal;