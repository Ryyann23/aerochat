import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import GroupList from '../components/GroupList';
import MemberList from '../components/MemberList';
import ChatWindow from '../components/ChatWindow';
import MessageInput from '../components/MessageInput';
import UserPanel from '../components/UserPanel';
import GroupPickerModal from '../components/GroupPickerModal';
import ProfilePanel from '../components/ProfilePanel';
import logo from '../assets/img/logo.png';
import background1 from '../assets/img/bg_1.png';
import background2 from '../assets/img/bg_2.png';
import background3 from '../assets/img/bg_3.png';
import background4 from '../assets/img/bg_4.png';
import background5 from '../assets/img/bg_5.png';

const backgrounds = [background1, background2, background3, background4, background5];

function GroupChat({ currentUser, onLogout, onCurrentUserChange }) {
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [backgroundIndex, setBackgroundIndex] = useState(0);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [isUpdatingGroups, setIsUpdatingGroups] = useState(false);
  const [viewMode, setViewMode] = useState('chat');
  const [busyMemberId, setBusyMemberId] = useState(null);
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const [hasLoadedGroups, setHasLoadedGroups] = useState(false);

  const joinedGroups = useMemo(
    () => groups.filter((group) => group.joined),
    [groups],
  );

  const groupDetails = useMemo(
    () => joinedGroups.find((group) => group.id === selectedGroupId) || null,
    [joinedGroups, selectedGroupId],
  );
  const shouldShowGroupPicker = hasLoadedGroups && (
    joinedGroups.length === 0 || viewMode === 'groups' || showGroupPicker
  );
  const shouldShowProfile = viewMode === 'profile';
  const isOverlayViewOpen = shouldShowGroupPicker || shouldShowProfile;
  const currentUserRole = useMemo(() => {
    if (currentUser.isAdmin) {
      return 2;
    }

    const me = members.find((member) => member.id === currentUser.id);
    const parsedRole = Number(me?.role);
    return Number.isInteger(parsedRole) ? parsedRole : 0;
  }, [currentUser.id, currentUser.isAdmin, members]);

  useEffect(() => {
    const currentBackground = backgrounds[backgroundIndex];
    document.body.style.backgroundImage = `url("${currentBackground}")`;

    return () => {
      document.body.style.backgroundImage = '';
    };
  }, [backgroundIndex]);

  useEffect(() => {
    const loadProfile = async () => {
      const response = await api.get(`/users/${currentUser.id}/profile`);
      onCurrentUserChange(response.data);
    };

    loadProfile().catch((error) => {
      console.error('Erro ao carregar perfil do usuario', error);
    });
  }, [currentUser.id, onCurrentUserChange]);

  useEffect(() => {
    const loadGroups = async () => {
      const response = await api.get('/groups', {
        params: { userId: currentUser.id },
      });

      const nextGroups = response.data;
      const nextJoinedGroups = nextGroups.filter((group) => group.joined);

      setGroups(nextGroups);
      setSelectedGroupId((currentSelectedGroupId) => {
        if (currentSelectedGroupId && nextJoinedGroups.some((group) => group.id === currentSelectedGroupId)) {
          return currentSelectedGroupId;
        }

        return nextJoinedGroups[0]?.id || null;
      });

      if (nextJoinedGroups.length === 0) {
        setMessages([]);
        setMembers([]);
        setShowGroupPicker(true);
        setViewMode('groups');
      }

      setHasLoadedGroups(true);
    };

    loadGroups().catch((error) => {
      console.error('Erro ao carregar grupos', error);
      setLoading(false);
      setHasLoadedGroups(true);
    });
  }, [currentUser.id]);

  useEffect(() => {
    if (hasLoadedGroups && joinedGroups.length === 0) {
      setShowGroupPicker(true);
      setViewMode('groups');
    }
  }, [hasLoadedGroups, joinedGroups.length]);

  useEffect(() => {
    if (!selectedGroupId) {
      setLoading(false);
      setMembers([]);
      setMessages([]);
      return;
    }

    const loadGroupData = async () => {
      setLoading(true);
      const [membersResponse, messagesResponse] = await Promise.all([
        api.get(`/members/${selectedGroupId}`, {
          params: { userId: currentUser.id },
        }),
        api.get(`/groups/${selectedGroupId}/messages`, {
          params: { userId: currentUser.id },
        }),
      ]);

      setMembers(membersResponse.data);
      setMessages(messagesResponse.data);
      setLoading(false);
    };

    loadGroupData().catch((error) => {
      console.error('Erro ao carregar dados do grupo', error);
      setLoading(false);
    });
  }, [currentUser.id, selectedGroupId]);

  useEffect(() => {
    if (!selectedGroupId) {
      return undefined;
    }

    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const streamUrl = `${baseUrl}/groups/${selectedGroupId}/stream?userId=${currentUser.id}`;
    const eventSource = new EventSource(streamUrl);

    const syncGroupData = () => {
      Promise.all([
        api.get(`/members/${selectedGroupId}`, {
          params: { userId: currentUser.id },
        }),
        api.get(`/groups/${selectedGroupId}/messages`, {
          params: { userId: currentUser.id },
        }),
      ])
        .then(([membersResponse, messagesResponse]) => {
          setMembers(membersResponse.data);
          setMessages(messagesResponse.data);
        })
        .catch((error) => {
          console.error('Erro ao sincronizar grupo em tempo real', error);
        });
    };

    eventSource.addEventListener('group-update', syncGroupData);
    eventSource.onerror = (error) => {
      console.error('Erro de conexao em tempo real', error);
    };

    return () => {
      eventSource.removeEventListener('group-update', syncGroupData);
      eventSource.close();
    };
  }, [currentUser.id, selectedGroupId]);

  const refreshGroups = async (preferredGroupId = null) => {
    const response = await api.get('/groups', {
      params: { userId: currentUser.id },
    });

    const nextGroups = response.data;
    const nextJoinedGroups = nextGroups.filter((group) => group.joined);

    setGroups(nextGroups);
    setSelectedGroupId((currentSelectedGroupId) => {
      if (preferredGroupId && nextJoinedGroups.some((group) => group.id === preferredGroupId)) {
        return preferredGroupId;
      }

      if (currentSelectedGroupId && nextJoinedGroups.some((group) => group.id === currentSelectedGroupId)) {
        return currentSelectedGroupId;
      }

      return nextJoinedGroups[0]?.id || null;
    });

    return nextGroups;
  };

  const handleSendMessage = async () => {
    const content = draft.trim();
    if (!content || !selectedGroupId) {
      return;
    }

    setIsSending(true);

    try {
      const response = await api.post('/messages', {
        groupId: selectedGroupId,
        userId: currentUser.id,
        content,
      });

      setMessages((currentMessages) => [...currentMessages, response.data]);
      setDraft('');
    } catch (error) {
      console.error('Erro ao enviar mensagem', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleChangeBackground = () => {
    setBackgroundIndex((currentIndex) => (currentIndex + 1) % backgrounds.length);
  };

  const handleJoinGroup = async (groupId) => {
    setIsUpdatingGroups(true);

    try {
      await api.post(`/groups/${groupId}/join`, { userId: currentUser.id });
      await refreshGroups(groupId);
      setShowGroupPicker(false);
      setViewMode('chat');
    } catch (error) {
      console.error('Erro ao entrar no grupo', error);
    } finally {
      setIsUpdatingGroups(false);
    }
  };

  const handleLeaveGroup = async (groupId) => {
    setIsUpdatingGroups(true);

    try {
      await api.delete(`/groups/${groupId}/leave`, {
        params: { userId: currentUser.id },
      });

      const nextGroups = await refreshGroups();
      const nextJoinedGroups = nextGroups.filter((group) => group.joined);
      if (nextJoinedGroups.length === 0) {
        setShowGroupPicker(true);
        setViewMode('groups');
      }
    } catch (error) {
      console.error('Erro ao sair do grupo', error);
    } finally {
      setIsUpdatingGroups(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout', { userId: currentUser.id });
    } catch (error) {
      console.error('Erro ao sair da sessao', error);
    } finally {
      onLogout();
    }
  };

  const refreshCurrentGroupData = async () => {
    if (!selectedGroupId) {
      return;
    }

    const [membersResponse, messagesResponse] = await Promise.all([
      api.get(`/members/${selectedGroupId}`, {
        params: { userId: currentUser.id },
      }),
      api.get(`/groups/${selectedGroupId}/messages`, {
        params: { userId: currentUser.id },
      }),
    ]);

    setMembers(membersResponse.data);
    setMessages(messagesResponse.data);
  };

  const handleDeleteMessage = async (messageId) => {
    if (!selectedGroupId || !messageId) {
      return;
    }

    setDeletingMessageId(messageId);

    try {
      await api.delete(`/groups/${selectedGroupId}/messages/${messageId}`, {
        data: { userId: currentUser.id },
      });

      setMessages((currentMessages) => currentMessages.filter((message) => message.id !== messageId));
    } catch (error) {
      console.error('Erro ao apagar mensagem', error);
    } finally {
      setDeletingMessageId(null);
    }
  };

  const handleMuteMember = async (targetUserId) => {
    if (!selectedGroupId) {
      return;
    }

    const rawMinutes = window.prompt('Mutar por quantos minutos?', '10');
    if (!rawMinutes) {
      return;
    }

    const durationMinutes = Number(rawMinutes);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      return;
    }

    setBusyMemberId(targetUserId);

    try {
      await api.post(`/groups/${selectedGroupId}/members/${targetUserId}/mute`, {
        userId: currentUser.id,
        durationMinutes,
      });
      await refreshCurrentGroupData();
    } catch (error) {
      console.error('Erro ao mutar membro', error);
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleExpelMember = async (targetUserId) => {
    if (!selectedGroupId) {
      return;
    }

    setBusyMemberId(targetUserId);

    try {
      await api.post(`/groups/${selectedGroupId}/members/${targetUserId}/expel`, {
        userId: currentUser.id,
      });
      await refreshCurrentGroupData();
    } catch (error) {
      console.error('Erro ao expulsar membro', error);
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleBanMember = async (targetUserId) => {
    if (!selectedGroupId) {
      return;
    }

    setBusyMemberId(targetUserId);

    try {
      await api.post(`/groups/${selectedGroupId}/members/${targetUserId}/ban`, {
        userId: currentUser.id,
      });
      await refreshCurrentGroupData();
    } catch (error) {
      console.error('Erro ao banir membro', error);
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleChangeRole = async (targetUserId, nextRole) => {
    if (!selectedGroupId) {
      return;
    }

    setBusyMemberId(targetUserId);

    try {
      await api.patch(`/groups/${selectedGroupId}/members/${targetUserId}/role`, {
        userId: currentUser.id,
        role: nextRole,
      });
      await refreshCurrentGroupData();
    } catch (error) {
      console.error('Erro ao alterar cargo', error);
    } finally {
      setBusyMemberId(null);
    }
  };

  const handlePromoteAdmin = async (targetUserId) => {
    if (!selectedGroupId) {
      return;
    }

    setBusyMemberId(targetUserId);

    try {
      await api.patch(`/groups/${selectedGroupId}/members/${targetUserId}/role`, {
        userId: currentUser.id,
        role: 2,
      });
      await refreshCurrentGroupData();
    } catch (error) {
      console.error('Erro ao tornar admin', error);
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleEditGroup = async () => {
    if (!groupDetails || (currentUserRole !== 2 && !currentUser.isAdmin)) {
      return;
    }

    const nextName = window.prompt('Novo nome do grupo:', groupDetails.name || '');
    if (!nextName?.trim()) {
      return;
    }

    const nextDescription = window.prompt('Nova descricao do grupo:', groupDetails.description || '');
    if (!nextDescription?.trim()) {
      return;
    }

    try {
      await api.patch(`/groups/${groupDetails.id}`, {
        userId: currentUser.id,
        name: nextName,
        description: nextDescription,
      });

      await refreshGroups(groupDetails.id);
      await refreshCurrentGroupData();
    } catch (error) {
      console.error('Erro ao editar grupo', error);
    }
  };

  const handleProfileUpdated = (updatedUser) => {
    onCurrentUserChange(updatedUser);

    setMembers((currentMembers) => currentMembers.map((member) => {
      if (member.id !== updatedUser.id) {
        return member;
      }

      return {
        ...member,
        name: updatedUser.name,
        avatarColor: updatedUser.avatarColor,
      };
    }));

    setMessages((currentMessages) => currentMessages.map((message) => {
      if (message.userId !== updatedUser.id) {
        return message;
      }

      return {
        ...message,
        userName: updatedUser.name,
        avatarColor: updatedUser.avatarColor,
        bubbleColor: updatedUser.bubbleColor,
      };
    }));
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <img src={logo} alt="AeroChat" className="app-logo" />
      </header>

      <section className="chat-layout">
        <aside className="left-sidebar">
          <GroupList
            groups={joinedGroups}
            selectedGroupId={selectedGroupId}
            onSelectGroup={setSelectedGroupId}
          />
          <MemberList
            members={members}
            currentUserId={currentUser.id}
            currentUserRole={currentUserRole}
            currentUserIsAdmin={Boolean(currentUser.isAdmin)}
            onMuteMember={handleMuteMember}
            onExpelMember={handleExpelMember}
            onBanMember={handleBanMember}
            onChangeRole={handleChangeRole}
            onPromoteAdmin={handlePromoteAdmin}
            busyMemberId={busyMemberId}
          />
        </aside>

        <section className={`chat-column ${isOverlayViewOpen ? 'group-picker-open' : ''}`}>
          {shouldShowProfile ? (
            <ProfilePanel
              currentUser={currentUser}
              onClose={() => setViewMode(joinedGroups.length === 0 ? 'groups' : 'chat')}
              onProfileUpdated={handleProfileUpdated}
            />
          ) : shouldShowGroupPicker ? (
            <GroupPickerModal
              groups={groups}
              onJoinGroup={handleJoinGroup}
              onLeaveGroup={handleLeaveGroup}
              onClose={() => {
                setShowGroupPicker(false);
                setViewMode('chat');
              }}
              canClose={joinedGroups.length > 0}
              isSaving={isUpdatingGroups}
              inline
            />
          ) : (
            <>
              <ChatWindow
                group={groupDetails}
                messages={messages}
                members={members}
                loading={loading}
                currentUserRole={currentUserRole}
                currentUserIsAdmin={Boolean(currentUser.isAdmin)}
                currentUserId={currentUser.id}
                onEditGroup={handleEditGroup}
                onDeleteMessage={handleDeleteMessage}
                deletingMessageId={deletingMessageId}
              />
              <MessageInput
                value={draft}
                onChange={setDraft}
                onClear={() => setDraft('')}
                onSend={handleSendMessage}
                isSending={isSending}
                disabled={!groupDetails}
              />
            </>
          )}
        </section>

        <UserPanel
          onOpenProfile={() => {
            setShowGroupPicker(false);
            setViewMode('profile');
          }}
          onOpenGroupPicker={() => {
            setShowGroupPicker(true);
            setViewMode('groups');
          }}
          onChangeBackground={handleChangeBackground}
          onLogout={handleLogout}
        />
      </section>

    </main>
  );
}

export default GroupChat;
