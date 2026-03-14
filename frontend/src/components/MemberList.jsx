import { useState } from 'react';
import UserAvatar from './UserAvatar';

const roleMap = {
  0: 'Membro',
  1: 'Moderador',
  2: 'Admin',
};

function MemberList({
  members,
  currentUserId,
  currentUserRole,
  currentUserIsAdmin,
  onMuteMember,
  onExpelMember,
  onBanMember,
  onChangeRole,
  onPromoteAdmin,
  busyMemberId,
}) {
  const [activeMemberId, setActiveMemberId] = useState(null);

  const canManage = (targetRole) => {
    if (currentUserIsAdmin || currentUserRole === 2) {
      return targetRole <= 1;
    }

    if (currentUserRole === 1) {
      return targetRole === 0;
    }

    return false;
  };

  return (
    <section className="sidebar-card member-card">
      <h2>Membros</h2>
      <div className="sidebar-list">
        {members.length === 0 && (
          <p className="sidebar-empty">Entre em um grupo para ver quem esta la dentro.</p>
        )}

        {members.map((member) => {
          const isCurrentUser = member.id === currentUserId;
          const parsedRole = Number(member.role);
          const memberRole = Number.isInteger(parsedRole) ? parsedRole : 0;
          const showModerationActions = !isCurrentUser && canManage(memberRole);

          return (
            <div key={member.id} className="list-item member-item">
              <button
                type="button"
                className="list-avatar-button"
                onClick={() => setActiveMemberId((current) => (current === member.id ? null : member.id))}
                aria-label={`Acoes de ${member.name}`}
              >
                <UserAvatar name={member.name} color={member.avatarColor} className="list-avatar" />
              </button>

              <div>
                <strong>{isCurrentUser ? `${member.name} (Voce)` : member.name}</strong>
                <span className={`member-status ${member.status}`}>
                  {`${member.status === 'online' ? 'Online' : 'Offline'} - ${roleMap[memberRole] || 'Membro'}`}
                </span>

                {showModerationActions && activeMemberId === member.id && (
                  <div className="member-actions">
                    <button
                      type="button"
                      className="member-action-button"
                      onClick={() => onMuteMember(member.id)}
                      disabled={busyMemberId === member.id}
                    >
                      Mutar
                    </button>
                    <button
                      type="button"
                      className="member-action-button"
                      onClick={() => onExpelMember(member.id)}
                      disabled={busyMemberId === member.id}
                    >
                      Expulsar
                    </button>
                    <button
                      type="button"
                      className="member-action-button"
                      onClick={() => onBanMember(member.id)}
                      disabled={busyMemberId === member.id}
                    >
                      Banir
                    </button>
                    {currentUserIsAdmin && memberRole !== 2 && (
                      <button
                        type="button"
                        className="member-action-button"
                        onClick={() => onPromoteAdmin(member.id)}
                        disabled={busyMemberId === member.id}
                      >
                        Tornar admin
                      </button>
                    )}
                    {(currentUserIsAdmin || currentUserRole === 2) && memberRole !== 2 && (
                      <button
                        type="button"
                        className="member-action-button"
                        onClick={() => onChangeRole(member.id, memberRole === 0 ? 1 : 0)}
                        disabled={busyMemberId === member.id}
                      >
                        {memberRole === 0 ? 'Tornar mod' : 'Tornar membro'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default MemberList;
