import { useEffect, useMemo, useRef, useState } from "react";
import MessageItem from "./MessageItem";
import { useI18n } from "../i18n";
import { getGifUrlFromContent, makeGifMessage } from "../utils/messageContent";

const EMOJI_GROUPS = [
  ["😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😎"],
  ["😭", "😡", "😱", "😴", "🤔", "🙄", "😅", "😇"],
  ["👍", "👎", "👏", "🙏", "💪", "🔥", "✨", "🎉"],
  ["❤️", "💙", "💚", "💛", "💜", "💯", "✅", "⭐"]
];

const GIF_OPTIONS = [
  { id: "happy-cat", label: "Happy cat", tags: "happy cat smile vui meo", url: "https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif" },
  { id: "clap", label: "Clap", tags: "clap applause bravo vo tay", url: "https://media.giphy.com/media/l3q2XhfQ8oCkm1Ts4/giphy.gif" },
  { id: "nice", label: "Nice", tags: "nice good yes ok tuyet", url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif" },
  { id: "typing-cat", label: "Typing cat", tags: "cat typing work meo go phim", url: "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif" },
  { id: "dance", label: "Dance", tags: "dance party nhay vui", url: "https://media.giphy.com/media/GeimqsH0TLDt4tScGw/giphy.gif" },
  { id: "wow", label: "Wow", tags: "wow surprise shock bat ngo", url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif" },
  { id: "excited", label: "Excited", tags: "excited happy vui mung", url: "https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif" },
  { id: "celebrate", label: "Celebrate", tags: "celebrate party win chien thang", url: "https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif" },
  { id: "thumbs-up", label: "Thumbs up", tags: "thumbs up like ok dong y", url: "https://media.giphy.com/media/GCvktC0KFy9l6/giphy.gif" },
  { id: "mind-blown", label: "Mind blown", tags: "mind blown wow shock soc", url: "https://media.giphy.com/media/Um3ljJl8jrnHy/giphy.gif" },
  { id: "laugh", label: "Laugh", tags: "laugh lol haha cuoi", url: "https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif" },
  { id: "cry", label: "Cry", tags: "cry sad buon khoc", url: "https://media.giphy.com/media/OPU6wzx8JrHna/giphy.gif" },
  { id: "facepalm", label: "Facepalm", tags: "facepalm fail loi chan", url: "https://media.giphy.com/media/3o7btYLAW7doynq3p6/giphy.gif" },
  { id: "confused", label: "Confused", tags: "confused question khong hieu hoi cham", url: "https://media.giphy.com/media/3o7aTskHEUdgCQAXde/giphy.gif" },
  { id: "thinking", label: "Thinking", tags: "thinking think nghi hmm", url: "https://media.giphy.com/media/a5viI92PAF89q/giphy.gif" },
  { id: "nope", label: "Nope", tags: "no nope khong tu choi", url: "https://media.giphy.com/media/xiMUwBRn5RDLhzwO80/giphy.gif" },
  { id: "yes", label: "Yes", tags: "yes dong y ok chuan", url: "https://media.giphy.com/media/3o6UB3VhArvomJHtdK/giphy.gif" },
  { id: "hello", label: "Hello", tags: "hello hi chao wave", url: "https://media.giphy.com/media/ASd0Ukj0y3qMM/giphy.gif" },
  { id: "bye", label: "Bye", tags: "bye goodbye tam biet", url: "https://media.giphy.com/media/l0MYGb1LuZ3n7dRnO/giphy.gif" },
  { id: "sleepy", label: "Sleepy", tags: "sleepy tired ngu met", url: "https://media.giphy.com/media/3oEduNEbTtAHABX0dy/giphy.gif" },
  { id: "rage", label: "Rage", tags: "rage angry tuc gian", url: "https://media.giphy.com/media/11tTNkNy1SdXGg/giphy.gif" },
  { id: "deal", label: "Deal with it", tags: "deal cool sunglasses ngau", url: "https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif" },
  { id: "loading", label: "Loading", tags: "loading wait doi dang tai", url: "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif" },
  { id: "coffee", label: "Coffee", tags: "coffee cafe work sang", url: "https://media.giphy.com/media/687qS11pXwjCM/giphy.gif" },
  { id: "coding", label: "Coding", tags: "coding code dev lap trinh", url: "https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif" },
  { id: "bug", label: "Bug", tags: "bug error loi fix", url: "https://media.giphy.com/media/YQitE4YNQNahy/giphy.gif" },
  { id: "ship-it", label: "Ship it", tags: "ship deploy push done xong", url: "https://media.giphy.com/media/26u4lOMA8JKSnL9Uk/giphy.gif" },
  { id: "popcorn", label: "Popcorn", tags: "popcorn drama xem", url: "https://media.giphy.com/media/tyqcJoNjNv0Fq/giphy.gif" },
  { id: "fire", label: "Fire", tags: "fire lit hot chay", url: "https://media.giphy.com/media/yr7n0u3qzO9nG/giphy.gif" },
  { id: "dog-happy", label: "Happy dog", tags: "dog happy cho vui", url: "https://media.giphy.com/media/4Zo41lhzKt6iZ8xff9/giphy.gif" }
];

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
  onViewUserProfile,
  unreadNotificationCount,
  onOpenNotifications,
  onOpenFriends
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [messageSearchTerm, setMessageSearchTerm] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState("");
  const [activePicker, setActivePicker] = useState(null);
  const [gifSearchTerm, setGifSearchTerm] = useState("");
  const messageListRef = useRef(null);
  const textareaRef = useRef(null);
  const composerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordingStreamRef = useRef(null);
  const isMountedRef = useRef(true);
  const lastChannelIdRef = useRef(currentChannel?.id ?? null);

  useEffect(() => {
    if (!messageListRef.current) {
      return;
    }

    const channelChanged = lastChannelIdRef.current !== currentChannel?.id;
    const distanceFromBottom =
      messageListRef.current.scrollHeight -
      messageListRef.current.scrollTop -
      messageListRef.current.clientHeight;

    if (channelChanged || distanceFromBottom < 120) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }

    lastChannelIdRef.current = currentChannel?.id ?? null;
  }, [messages, currentChannel?.id]);

  useEffect(() => {
    setMessageSearchTerm("");
  }, [currentChannel?.id]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!activePicker) {
      return undefined;
    }

    function handleDocumentClick(event) {
      if (composerRef.current?.contains(event.target)) {
        return;
      }

      setActivePicker(null);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setActivePicker(null);
      }
    }

    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("click", handleDocumentClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activePicker]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;

      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }

      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const isDirectConversation = Boolean(currentChannel?.isDirect);
  const canRecord =
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined";
  const normalizedMessageSearch = messageSearchTerm.trim().toLowerCase();
  const normalizedGifSearch = gifSearchTerm.trim().toLowerCase();
  const pinnedMessages = useMemo(
    () => messages.filter((message) => message.isPinned && !message.isDeleted).slice(-3),
    [messages]
  );
  const visibleGifOptions = useMemo(
    () =>
      normalizedGifSearch
        ? GIF_OPTIONS.filter((gif) => `${gif.label} ${gif.tags}`.toLowerCase().includes(normalizedGifSearch))
        : GIF_OPTIONS,
    [normalizedGifSearch]
  );
  const visibleMessages = useMemo(
    () =>
      normalizedMessageSearch
        ? messages.filter((message) => {
            const searchableText = [
              message.content,
              getGifUrlFromContent(message.content) ? t("chat.gifMessage") : null,
              message.sender?.displayName,
              message.sender?.userName,
              message.attachments?.map((attachment) => attachment.fileName).join(" ")
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            return searchableText.includes(normalizedMessageSearch);
          })
        : messages,
    [messages, normalizedMessageSearch, t]
  );

  if (!currentServer && !isDirectConversation) {
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

  function getMessagePreview(message) {
    if (getGifUrlFromContent(message?.content || "")) {
      return t("chat.gifMessage");
    }

    return message?.content || t("chat.attachment");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if ((!draft.trim() && selectedFiles.length === 0) || !currentChannel || isSending || isRecording) {
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

  function handleFileSelection(event) {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setSelectedFiles((currentFiles) => [...currentFiles, ...files]);
    }
    event.target.value = "";
  }

  async function insertEmoji(emoji) {
    const textarea = textareaRef.current;
    const selectionStart = textarea?.selectionStart ?? draft.length;
    const selectionEnd = textarea?.selectionEnd ?? draft.length;
    const nextDraft = `${draft.slice(0, selectionStart)}${emoji}${draft.slice(selectionEnd)}`;
    const nextCursorPosition = selectionStart + emoji.length;

    await handleDraftChange(nextDraft);
    window.setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCursorPosition, nextCursorPosition);
    }, 0);
  }

  async function handleSelectGif(gif) {
    if (isSending || isRecording || !currentChannel) {
      return;
    }

    setIsSending(true);
    setActivePicker(null);

    try {
      await onSendMessage({
        content: makeGifMessage(gif.url),
        files: [],
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

  function getRecordingMimeType() {
    const supportedTypes = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/wav"
    ];

    return supportedTypes.find((type) => window.MediaRecorder?.isTypeSupported?.(type)) || "";
  }

  function getRecordingExtension(mimeType) {
    if (mimeType.includes("mp4")) {
      return "m4a";
    }

    if (mimeType.includes("wav")) {
      return "wav";
    }

    return "webm";
  }

  function stopRecordingStream() {
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
  }

  async function startRecording() {
    if (!canRecord) {
      setRecordingError(t("chat.recordingUnsupported"));
      return;
    }

    setRecordingError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getRecordingMimeType();
      const recorder = new window.MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      recordingStreamRef.current = stream;
      recordingChunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(recordingChunksRef.current, { type });

        if (blob.size > 0 && isMountedRef.current) {
          const extension = getRecordingExtension(type);
          const file = new File([blob], `recording-${Date.now()}.${extension}`, { type });
          setSelectedFiles((currentFiles) => [...currentFiles, file]);
        }

        recordingChunksRef.current = [];
        if (isMountedRef.current) {
          setIsRecording(false);
        }
        stopRecordingStream();
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      setIsRecording(false);
      stopRecordingStream();
      setRecordingError(t("chat.recordingFailed"));
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === "recording") {
      recorder.stop();
      return;
    }

    setIsRecording(false);
    stopRecordingStream();
  }

  async function handleRecordingToggle() {
    if (isRecording) {
      stopRecording();
      return;
    }

    await startRecording();
  }

  return (
    <section className="chat-panel">
      <header className="chat-header">
        <div className="chat-header-row">
          <div className="chat-header-main">
            <span className="channel-hash material-symbols-outlined">
              {isDirectConversation ? "alternate_email" : "tag"}
            </span>
            <h2>{currentChannel.name}</h2>
            {currentChannel.topic ? (
              <>
                <span className="chat-header-divider" aria-hidden="true" />
                <p className="chat-topic">{currentChannel.topic}</p>
              </>
            ) : null}
          </div>

          <div className="chat-header-actions" aria-label="Channel actions">
            <button
              type="button"
              className="chat-header-action"
              title="Notifications"
              onClick={onOpenNotifications}
            >
              <span className="material-symbols-outlined">notifications</span>
              {unreadNotificationCount > 0 && (
                <span className="header-action-badge">{unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}</span>
              )}
            </button>
            <button type="button" title="Pinned messages">
              <span className="material-symbols-outlined">push_pin</span>
            </button>
            <button type="button" title={t("tabs.friends")} onClick={onOpenFriends}>
              <span className="material-symbols-outlined">group</span>
            </button>
            <label className="chat-search-mini">
              <input
                type="search"
                value={messageSearchTerm}
                onChange={(event) => setMessageSearchTerm(event.target.value)}
                placeholder={t("chat.searchMessages")}
              />
              <span className="material-symbols-outlined">search</span>
            </label>
            <button type="button" title="Help">
              <span className="material-symbols-outlined">help</span>
            </button>
          </div>
        </div>
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
                {message.sender?.displayName}: {getMessagePreview(message)}
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
        ) : visibleMessages.length === 0 ? (
          <div className="empty-panel">
            <p>{t("chat.noSearchResults", { term: messageSearchTerm })}</p>
          </div>
        ) : (
          visibleMessages.map((message) => {
            const isOwnMessage = message.sender?.id === currentUser.id;
            const canEdit = !message.isDeleted && (isOwnMessage || canManageMessages);
            const canDelete = isOwnMessage || canManageMessages;
            const canPin = canPinMessages || canManageMessages;

            return (
              <div
                key={message.id}
                data-message-id={message.id}
                className={`message-row ${isOwnMessage ? "own" : ""}`}
              >
                <MessageItem
                  currentUserId={currentUser.id}
                  message={message}
                  isOwnMessage={isOwnMessage}
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
                <span>{getMessagePreview(replyToMessage)}</span>
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
            ref={textareaRef}
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
          {(isRecording || recordingError) && (
            <div className={`recording-status ${recordingError ? "error" : ""}`}>
              <span className="material-symbols-outlined">
                {recordingError ? "error" : "fiber_manual_record"}
              </span>
              <span>{recordingError || t("chat.recording")}</span>
            </div>
          )}
        </div>

        <div className="composer-actions" ref={composerRef}>
          <div className="file-upload-control">
            <span className="material-symbols-outlined">add_circle</span>
            <span>{t("chat.attach")}</span>
            <input
              type="file"
              multiple
              className="native-file-input"
              title={t("chat.attach")}
              onChange={handleFileSelection}
            />
          </div>
          <button
            type="button"
            className={`composer-icon-button ${activePicker === "gif" ? "active" : ""}`}
            title={t("chat.chooseGif")}
            onClick={() => setActivePicker((current) => (current === "gif" ? null : "gif"))}
          >
            GIF
          </button>
          <button
            type="button"
            className={`composer-icon-button ${isRecording ? "recording active" : ""}`}
            title={isRecording ? t("chat.stopRecording") : t("chat.startRecording")}
            onClick={handleRecordingToggle}
          >
            <span className="material-symbols-outlined">
              {isRecording ? "stop_circle" : "mic"}
            </span>
          </button>
          <button
            type="button"
            className={`composer-icon-button ${activePicker === "emoji" ? "active" : ""}`}
            title={t("chat.chooseEmoji")}
            onClick={() => setActivePicker((current) => (current === "emoji" ? null : "emoji"))}
          >
            <span className="material-symbols-outlined">mood</span>
          </button>

          {activePicker === "gif" && (
            <div className="composer-popover gif-picker" role="dialog" aria-label={t("chat.chooseGif")}>
              <div className="picker-header">
                <strong>{t("chat.chooseGif")}</strong>
                <span>{t("chat.sendGif")}</span>
              </div>
              <input
                type="search"
                className="gif-search-input"
                value={gifSearchTerm}
                onChange={(event) => setGifSearchTerm(event.target.value)}
                placeholder={t("chat.searchGif")}
              />
              <div className="gif-grid">
                {visibleGifOptions.map((gif) => (
                  <button
                    key={gif.id}
                    type="button"
                    className="gif-option"
                    onClick={() => handleSelectGif(gif)}
                    disabled={isSending || isRecording}
                  >
                    <img src={gif.url} alt={gif.label} loading="lazy" />
                    <span>{gif.label}</span>
                  </button>
                ))}
              </div>
              {visibleGifOptions.length === 0 && (
                <p className="picker-empty">{t("chat.noGifResults", { term: gifSearchTerm })}</p>
              )}
            </div>
          )}

          {activePicker === "emoji" && (
            <div className="composer-popover emoji-picker" role="dialog" aria-label={t("chat.chooseEmoji")}>
              <div className="picker-header">
                <strong>{t("chat.chooseEmoji")}</strong>
              </div>
              <div className="emoji-grid">
                {EMOJI_GROUPS.flat().map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="emoji-option"
                    onClick={() => insertEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="primary-button"
            disabled={(!draft.trim() && selectedFiles.length === 0) || isSending || isRecording}
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
