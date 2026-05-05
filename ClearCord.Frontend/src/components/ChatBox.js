import { useEffect, useRef, useState } from "react";
import MessageItem from "./MessageItem";
import { useI18n } from "../i18n";

function ChatBox({
  currentUser,
  currentServer,
  currentChannel,
  messages,
  isLoading,
  error,
  sendError,
  replyToMessage,
  editingMessageId,
  typingUsers,
  canManageMessages,
  canPinMessages,
  onCancelReply,
  onSendMessage,
  onTypingChange,
  onReplyMessage,
  onStartEditMessage,
  onCancelEditMessage,
  onSaveEditMessage,
  onDeleteMessage,
  onTogglePinMessage,
  onToggleReaction,
  onViewUserProfile
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const messageListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (!messageListRef.current) {
      return;
    }

    messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
  }, [messages, currentChannel?.id]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  if (!currentServer) {
    return (
      <section className="chat-panel empty-panel">
        <p>{t("chat.selectServer")}</p>
      </section>
    );
  }

  if (!currentChannel) {
    return (
      <section className="chat-panel empty-panel">
        <p>{t("chat.selectChannel")}</p>
      </section>
    );
  }

  const pinnedMessages = messages.filter((message) => message.isPinned && !message.isDeleted).slice(-3);

  async function handleSubmit(event) {
    event.preventDefault();

    if ((!draft.trim() && selectedFiles.length === 0) || !currentChannel || isSending) {
      return;
    }

    setIsSending(true);

    try {
      await onSendMessage({
        content: draft.trim(),
        files: selectedFiles,
        replyToMessageId: replyToMessage?.id ?? null
      });

      setDraft("");
      setSelectedFiles([]);
      if (isTypingRef.current) {
        isTypingRef.current = false;
        await onTypingChange(currentChannel.id, false);
      }
    } finally {
      setIsSending(false);
    }
  }

  async function handleDraftChange(nextValue) {
    setDraft(nextValue);

    if (!currentChannel) {
      return;
    }

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      await onTypingChange(currentChannel.id, true);
    }

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(async () => {
      isTypingRef.current = false;
      await onTypingChange(currentChannel.id, false);
    }, 1200);
  }

  return (
    <section className="chat-panel">
      <header className="chat-header">
        <div>
          <p className="eyebrow">{t("chat.liveChannel")}</p>
          <h2>#{currentChannel.name}</h2>
        </div>
        <p className="chat-topic">
          {currentChannel.topic || t("chat.conversationFallback")}
        </p>
        {typingUsers.length > 0 && (
          <div className="typing-line">
            {t("chat.typing", {
              users: typingUsers.map((user) => user.displayName || user.userName).join(", ")
            })}
          </div>
        )}
        {pinnedMessages.length > 0 && (
          <div className="pin-strip">
            {pinnedMessages.map((message) => (
              <button
                key={message.id}
                type="button"
                className="pin-chip"
                onClick={() =>
                  messageListRef.current?.querySelector(`[data-message-id="${message.id}"]`)?.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                  })
                }
                >
                {message.sender?.displayName}: {message.content || t("chat.attachment")}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="message-stream" ref={messageListRef}>
        {isLoading ? (
          <div className="empty-panel">
            <p>{t("chat.loadingHistory")}</p>
          </div>
        ) : error ? (
          <div className="empty-panel error-panel">
            <p>{error}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="empty-panel">
            <p>{t("chat.noMessages", { channel: currentChannel.name })}</p>
          </div>
        ) : (
          messages.map((message) => {
            const canEdit = !message.isDeleted && (message.sender?.id === currentUser.id || canManageMessages);
            const canDelete = message.sender?.id === currentUser.id || canManageMessages;
            const canPin = canPinMessages || canManageMessages;

            return (
              <div key={message.id} data-message-id={message.id}>
                <MessageItem
                  currentUserId={currentUser.id}
                  message={message}
                  isOwnMessage={message.sender?.id === currentUser.id}
                  isEditing={editingMessageId === message.id}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  canPin={canPin}
                  onReply={onReplyMessage}
                  onStartEdit={onStartEditMessage}
                  onCancelEdit={onCancelEditMessage}
                  onSaveEdit={onSaveEditMessage}
                  onDelete={onDeleteMessage}
                  onTogglePin={onTogglePinMessage}
                  onToggleReaction={onToggleReaction}
                  onViewProfile={onViewUserProfile}
                />
              </div>
            );
          })
        )}
      </div>

      <form className="composer" onSubmit={handleSubmit}>
        <div className="composer-main">
          {replyToMessage && (
            <div className="context-banner">
              <div>
                <strong>
                  {t("chat.replyTo", {
                    name: replyToMessage.sender?.displayName || replyToMessage.sender?.userName
                  })}
                </strong>
                <span>{replyToMessage.content || t("chat.attachment")}</span>
              </div>
              <button type="button" className="chip-button" onClick={onCancelReply}>
                {t("chat.clearReply")}
              </button>
            </div>
          )}

          {selectedFiles.length > 0 && (
            <div className="file-pill-row">
              {selectedFiles.map((file) => (
                <span key={`${file.name}-${file.size}`} className="file-pill">
                  {file.name}
                </span>
              ))}
            </div>
          )}

          <textarea
            value={draft}
            onChange={(event) => {
              handleDraftChange(event.target.value);
            }}
            placeholder={t("chat.messagePlaceholder", { channel: currentChannel.name })}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSubmit(event);
              }
            }}
            rows={1}
          />
        </div>

        <div className="composer-actions">
          <label className="file-upload-button">
            {t("chat.attach")}
            <input
              type="file"
              multiple
              onChange={(event) => {
                setSelectedFiles(Array.from(event.target.files || []));
              }}
            />
          </label>

          <button
            type="submit"
            className="primary-button"
            disabled={(!draft.trim() && selectedFiles.length === 0) || isSending}
          >
            {isSending ? t("chat.sending") : t("common.send")}
          </button>
        </div>
      </form>

      {sendError && <p className="form-error chat-error">{sendError}</p>}
    </section>
  );
}

export default ChatBox;
