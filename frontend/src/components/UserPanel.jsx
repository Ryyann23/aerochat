import profileButton from '../assets/img/bttn_profile.png';
import groupsButton from '../assets/img/bttn_groups.png';
import musicButton from '../assets/img/bttn_change_music.png';
import backgroundButton from '../assets/img/bttn_change_bg.png';

function UserPanel({ onOpenProfile, onOpenGroupPicker, onChangeBackground, onLogout }) {
  return (
    <aside className="right-sidebar">
      <div className="sidebar-card action-panel">
        <button
          type="button"
          className="icon-action-button"
          aria-label="Perfil"
          onClick={onOpenProfile}
        >
          <img src={profileButton} alt="Perfil" className="icon-action-image" />
        </button>
        <button
          type="button"
          className="icon-action-button"
          aria-label="Grupos"
          onClick={onOpenGroupPicker}
        >
          <img src={groupsButton} alt="Grupos" className="icon-action-image" />
        </button>
        <button type="button" className="icon-action-button" aria-label="Trocar musica">
          <img src={musicButton} alt="Trocar musica" className="icon-action-image" />
        </button>
        <button
          type="button"
          className="icon-action-button"
          aria-label="Trocar background"
          onClick={onChangeBackground}
        >
          <img src={backgroundButton} alt="Trocar background" className="icon-action-image" />
        </button>
      </div>
      <button type="button" className="action-button logout" onClick={onLogout}>Logout</button>
    </aside>
  );
}

export default UserPanel;
