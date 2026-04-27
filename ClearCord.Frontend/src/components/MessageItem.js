import { useEffect, useMemo, useState } from "react";
import { toAssetUrl } from "../services/api";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "👀"];

function formatTime(timestamp) {
  if (!timestamp) {
    return "";
  }

  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function groupReactions(reactions, currentUserId) {
  const grouped = new Map();

  for (const reaction of reactions ?? []) {
    const existing = grouped.get(reaction.emoji) ?? {
      emoji: reaction.emoji,
      count: 0,
      reactedByCurrentUser: false
    };

    existing.count += 1;
    existing.reactedByCurrentUser ||= reaction.user?.id === currentUserId;
    grouped.set(reaction.emoji, existing);
  }

  return Array.from(grouped.values());
}

function MessageItem({
  currentUserId,
  message,
  isOwnMessage,
  isEditing,
  canEdit,
  canDelete,
  canPin,
  onReply,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onTogglePin,
  onToggleReaction,
  onViewProfile
}) {
  const [editDraft, setEditDraft] = useState(message.content || "");
  const sender = message.sender ?? {};
  const initials =
    sender.displayName?.[0]?.toUpperCase() || sender.userName?.[0]?.toUpperCase() || "U";

  const groupedReactions = useMemo(
    () => groupReactions(message.reactions, currentUserId),
    [currentUserId, message.reactions]
  );

  useEffect(() => {
    if (isEditing) {
      setEditDraft(message.content || "");
    }
  }, [isEditing, message.content]);

  return (
    <article className={`message-item ${isOwnMessage ? "own" : ""}`}>
      <button
        type="button"
        className="avatar-badge message-avatar message-profile-trigger"
        onClick={() => onViewProfile?.(sender.id)}
        aria-label={`View ${sender.displayName || sender.userName || "user"} profile`}
      >
        {sender.avatarUrl ? (
          <img src={toAssetUrl(sender.avatarUrl)} alt={sender.displayName} className="avatar-image" />
        ) : (
          <span>{initials}</span>
        )}
      </button>

      <div className="message-body">
        <div className="message-meta">
          <button
            type="button"
            className="message-author-button"
            onClick={() => onViewProfile?.(sender.id)}
          >
            {sender.displayName || sender.userName || "Unknown user"}
          </button>
          <span>{formatTime(message.createdAt)}</span>
          {message.isEdited && <em>edited</em>}
          {message.isPinned && <span className="mini-pill">pinned</span>}
        </div>

        {message.replyTo && (
          <div className="reply-pill">
            Replying to {message.replyTo.sender?.displayName || message.replyTo.sender?.userName}:{" "}
            {message.replyTo.content || "attachment"}
          </div>
        )}

        <div className="message-actions">
          {!message.isDeleted && (
            <button type="button" className="chip-button" onClick={() => onReply(message)}>
              Reply
            </button>
          )}

          {canEdit && !message.isDeleted && (
            <button type="button" className="chip-button" onClick={() => onStartEdit(message)}>
              Edit
            </button>
          )}

          {canDelete && (
            <button type="button" className="chip-button danger" onClick={() => onDelete(message)}>
              Delete
            </button>
          )}

          {canPin && (
            <button type="button" className="chip-button" onClick={() => onTogglePin(message)}>
              {message.isPinned ? "Unpin" : "Pin"}
            </button>
          )}
        </div>

        {isEditing ? (
          <form
            className="message-edit-form"
            onSubmit={(event) => {
              event.preventDefault();
              onSaveEdit(message, editDraft);
            }}
          >
            <textarea
              value={editDraft}
              onChange={(event) => setEditDraft(event.target.value)}
              rows={3}
              required
            />
            <div className="inline-actions">
              <button type="submit" className="primary-button" disabled={!editDraft.trim()}>
                Save
              </button>
              <button type="button" className="ghost-button" onClick={onCancelEdit}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className={`message-bubble ${message.isDeleted ? "deleted" : ""}`}>
            {message.isDeleted ? "This message was deleted." : message.content || "Attachment only"}
          </div>
        )}

        {message.attachments?.length > 0 && (
          <div className="attachment-stack">
            {message.attachments.map((attachment) =>
              attachment.isImage ? (
                <a
                  key={attachment.id}
                  href={toAssetUrl(attachment.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="image-attachment"
                >
                  <img src={toAssetUrl(attachment.url)} alt={attachment.fileName} />
                </a>
              ) : (
                <a
                  key={attachment.id}
                  href={toAssetUrl(attachment.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="file-attachment"
                >
                  {attachment.fileName}
                </a>
              )
            )}
          </div>
        )}

        <div className="reaction-row">
          {groupedReactions.map((reaction) => (
            <button
              key={reaction.emoji}
              type="button"
              className={`reaction-chip ${reaction.reactedByCurrentUser ? "active" : ""}`}
              onClick={() => onToggleReaction(message, reaction.emoji, reaction.reactedByCurrentUser)}
            >
              <span>{reaction.emoji}</span>
              <strong>{reaction.count}</strong>
            </button>
          ))}

          {!message.isDeleted &&
            QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="reaction-picker"
                onClick={() => onToggleReaction(message, emoji, false)}
              >
                {emoji}
              </button>
            ))}
        </div>
      </div>
    </article>
  );
}

export default MessageItem;
