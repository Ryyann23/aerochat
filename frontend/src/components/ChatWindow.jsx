import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

function ChatWindow({
  group,
  messages,
  members,
  loading,
  currentUserRole,
  currentUserIsAdmin,
  currentUserId,
  onEditGroup,
  onDeleteMessage,
  deletingMessageId,
}) {
  const messagesAreaRef = useRef(null);
  const stickToBottomRef = useRef(true);
  const previousGroupIdRef = useRef(group?.id ?? null);

  const updateStickToBottom = () => {
    const messagesArea = messagesAreaRef.current;
    if (!messagesArea) {
      return;
    }

    const distanceFromBottom =
      messagesArea.scrollHeight - messagesArea.scrollTop - messagesArea.clientHeight;

    stickToBottomRef.current = distanceFromBottom <= 150;
  };

  useEffect(() => {
    const messagesArea = messagesAreaRef.current;
    if (!messagesArea || loading) {
      return;
    }

    const groupChanged = previousGroupIdRef.current !== (group?.id ?? null);

    if (!groupChanged && !stickToBottomRef.current) {
      return;
    }

    messagesArea.scrollTo({
      top: messagesArea.scrollHeight,
      behavior: groupChanged ? 'auto' : 'smooth',
    });

    previousGroupIdRef.current = group?.id ?? null;
    stickToBottomRef.current = true;
  }, [group?.id, loading, messages]);

  useEffect(() => {
    if (!loading) {
      updateStickToBottom();
    }
  }, [loading]);

  return (
    <section className="chat-window">
      <header className="chat-header-card">
        <div className="chat-header-top">
          <div>
            <h2>{group?.name || 'Escolha um grupo'}</h2>
            <p>{group?.description || 'Entre em um grupo para comecar a conversar.'}</p>
          </div>
          {group && (currentUserRole === 2 || currentUserIsAdmin) && (
            <button
              type="button"
              className="action-button secondary chat-manage-group-button"
              onClick={onEditGroup}
            >
              Editar grupo
            </button>
          )}
        </div>
      </header>

      <div ref={messagesAreaRef} className="messages-area" onScroll={updateStickToBottom}>
        {loading ? (
          <p className="chat-placeholder">Carregando conversa...</p>
        ) : !group ? (
          <p className="chat-placeholder">Entre em um grupo pelo painel da esquerda para abrir o chat.</p>
        ) : messages.length === 0 ? (
          <p className="chat-placeholder">Nenhuma mensagem neste grupo.</p>
        ) : (
          messages.map((message) => {
            const directRole = Number(message.userRole);
            const fallbackRole = Number(members.find((member) => member.id === message.userId)?.role);
            const authorRole = Number.isInteger(directRole)
              ? directRole
              : Number.isInteger(fallbackRole)
                ? fallbackRole
                : 0;

            const canDeleteMessage =
              !message.isSystem
              && (
                message.userId === currentUserId
                || (currentUserRole === 1 && authorRole === 0)
                || ((currentUserRole === 2 || currentUserIsAdmin) && authorRole <= 1)
              );

            return (
              <MessageBubble
                key={message.id}
                message={message}
                canDelete={canDeleteMessage}
                onDelete={() => onDeleteMessage(message.id)}
                isDeleting={deletingMessageId === message.id}
              />
            );
          })
        )}
      </div>
    </section>
  );
}

export default ChatWindow;
