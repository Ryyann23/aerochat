import { useState } from 'react';
import UserAvatar from './UserAvatar';

function MessageBubble({ message, canDelete = false, onDelete, isDeleting = false }) {
  const [showActions, setShowActions] = useState(false);

  if (message.isSystem) {
    return (
      <article className="system-message-row">
        <div className="system-message-bubble">{message.content}</div>
      </article>
    );
  }

  const isOwnMessage = message.isOwnMessage;
  const bubbleColor = /^#[0-9a-fA-F]{6}$/.test(message.bubbleColor || '')
    ? message.bubbleColor
    : isOwnMessage
      ? '#5C91E8'
      : '#5FC4E6';

  return (
    <article
      className={`message-row ${isOwnMessage ? 'own' : 'other'}`}
      onClick={() => setShowActions((current) => !current)}
    >
      {!isOwnMessage && (
        <UserAvatar name={message.userName} color={message.avatarColor} className="message-avatar" />
      )}

      <div className="message-content">
        <span className="message-author">{message.userName}</span>
        <div className="message-bubble" style={{ '--message-bubble-color': bubbleColor }}>
          {message.content}
        </div>
        {canDelete && showActions && (
          <button
            type="button"
            className="message-delete-button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            disabled={isDeleting}
          >
            {isDeleting ? 'Apagando...' : 'Apagar'}
          </button>
        )}
      </div>

      {isOwnMessage && (
        <UserAvatar name={message.userName} color={message.avatarColor} className="message-avatar" />
      )}
    </article>
  );
}

export default MessageBubble;
