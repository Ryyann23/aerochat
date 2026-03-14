function MessageInput({ value, onChange, onClear, onSend, isSending, disabled }) {
  const handleSubmit = (event) => {
    event.preventDefault();
    if (disabled) {
      return;
    }
    onSend();
  };

  return (
    <form className="message-input-shell" onSubmit={handleSubmit}>
      <label className="message-input-wrap" htmlFor="message">
        <textarea
          id="message"
          className="message-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={disabled ? 'Entre em um grupo para enviar mensagens' : 'Digite sua mensagem no AeroChat'}
          rows={3}
          disabled={disabled}
        />
      </label>

      <div className="message-actions">
        <button type="submit" className="action-button primary" disabled={isSending || disabled}>
          {isSending ? 'Enviando...' : 'Enviar'}
        </button>
        <button type="button" className="action-button danger" onClick={onClear} disabled={disabled}>
          Apagar
        </button>
      </div>
    </form>
  );
}

export default MessageInput;
