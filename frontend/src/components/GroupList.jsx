import groupIcon from '../assets/img/icon_group.png';

function GroupList({ groups, selectedGroupId, onSelectGroup }) {
  return (
    <section className="sidebar-card group-card">
      <h2>Grupos</h2>
      <div className="sidebar-list">
        {groups.length === 0 && (
          <p className="sidebar-empty">Voce ainda nao entrou em nenhum grupo.</p>
        )}

        {groups.map((group) => {
          const isActive = group.id === selectedGroupId;

          return (
            <button
              key={group.id}
              type="button"
              className={`list-item group-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectGroup(group.id)}
            >
              <img src={groupIcon} alt={group.name} className="list-avatar" />
              <div>
                <strong>{group.name}</strong>
                <span>Usuários Online: {group.onlineCount}</span>
              </div>
            </button>
          );
        })}
      </div>

    </section>
  );
}

export default GroupList;
