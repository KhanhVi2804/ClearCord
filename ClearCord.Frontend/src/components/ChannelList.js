import { useI18n } from "../i18n";
import { toAssetUrl } from "../services/api";

function ChannelButton({
  channel,
  isActive,
  isVoiceActive,
  onSelect,
  textFallback,
  voiceFallback,
  canManageChannels,
  onEdit,
  voiceParticipants,
  currentUserId
}) {
  const isVoice = channel.type === "Voice";

  return (
    <button
      type="button"
      className={`channel-button ${isActive ? "active" : ""} ${isVoiceActive ? "voice-live" : ""}`}
      onClick={() => onSelect(channel)}
    >
      <span className="channel-icon material-symbols-outlined">
        {isVoice ? "volume_up" : "tag"}
      </span>
      <span className="channel-copy">
        <strong>{channel.name}</strong>
        <small>{channel.topic || (channel.type === "Voice" ? voiceFallback : textFallback)}</small>
        {isVoice && isVoiceActive && voiceParticipants.length > 0 && (
          <span className="voice-participant-list">
            {voiceParticipants.map((participant) => (
              <span key={`${participant.userId}-${participant.connectionId}`} className="voice-participant-chip">
                {participant.avatarUrl ? (
                  <img src={toAssetUrl(participant.avatarUrl)} alt={participant.displayName} />
                ) : (
                  <span className="voice-participant-initial">{participant.displayName?.[0]?.toUpperCase() || "U"}</span>
                )}
                <span>
                  {participant.displayName}
                  {participant.userId === currentUserId ? " (bạn)" : ""}
                </span>
              </span>
            ))}
          </span>
        )}
      </span>
      {canManageChannels && (
        <span
          role="button"
          tabIndex={0}
          className="channel-inline-action material-symbols-outlined"
          title="Edit channel"
          aria-label="Edit channel"
          onClick={(event) => {
            event.stopPropagation();
            onEdit(channel);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.stopPropagation();
              onEdit(channel);
            }
          }}
        >
          settings
        </span>
      )}
    </button>
  );
}

function ChannelList({
  server,
  selectedTextChannelId,
  activeVoiceChannelId,
  connectionState,
  onSelectChannel,
  canOpenServerSettings,
  onOpenServerSettings,
  canManageChannels,
  onCreateChannel,
  onEditChannel,
  voiceParticipants = [],
  currentUserId
}) {
  const { t } = useI18n();
  const categories = server?.categories ?? [];
  const channels = server?.channels ?? [];
  const defaultCategoryIds = new Set(
    categories
      .filter((category) => category.name.trim().toLowerCase() === "lobby")
      .map((category) => category.id)
  );

  const categoryGroups = categories
    .filter((category) => !defaultCategoryIds.has(category.id))
    .map((category) => ({
      ...category,
      channels: channels.filter((channel) => channel.categoryId === category.id)
    }));

  const uncategorizedChannels = channels.filter((channel) => !channel.categoryId || defaultCategoryIds.has(channel.categoryId));
  const uncategorizedTextChannels = uncategorizedChannels.filter((channel) => channel.type === "Text");
  const uncategorizedVoiceChannels = uncategorizedChannels.filter((channel) => channel.type === "Voice");

  function getCategoryCreateType(category, groupChannels) {
    const normalizedName = category.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    if (normalizedName.includes("voice") || normalizedName.includes("thoai")) {
      return "Voice";
    }

    if (groupChannels.length > 0 && groupChannels.every((channel) => channel.type === "Voice")) {
      return "Voice";
    }

    return "Text";
  }

  function renderChannelGroup(title, groupChannels, channelType, categoryId = "") {
    if (!groupChannels.length && !canManageChannels) {
      return null;
    }

    return (
      <section className="channel-category">
        <header className="channel-category-header">
          <span>
            <span className="material-symbols-outlined">keyboard_arrow_right</span>
            {title}
          </span>
          {canManageChannels && (
            <button
              type="button"
              className="channel-category-action"
              onClick={() => onCreateChannel(channelType, categoryId)}
              title={t("admin.createChannel")}
              aria-label={t("admin.createChannel")}
            >
              +
            </button>
          )}
        </header>
        <div className="channel-list">
          {groupChannels.map((channel) => (
            <ChannelButton
              key={channel.id}
              channel={channel}
              isActive={selectedTextChannelId === channel.id}
              isVoiceActive={activeVoiceChannelId === channel.id}
              onSelect={onSelectChannel}
              textFallback={t("channel.textFallback")}
              voiceFallback={t("channel.voiceFallback")}
              canManageChannels={canManageChannels}
              onEdit={onEditChannel}
              voiceParticipants={voiceParticipants}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <aside className="channel-panel">
      <div className="channel-panel-header">
        <h2>{server?.name ?? t("channel.noServer")}</h2>
        {canOpenServerSettings && (
          <button
            type="button"
            className="channel-panel-action"
            onClick={onOpenServerSettings}
            title={t("tabs.admin")}
            aria-label={t("tabs.admin")}
          >
            <span className="material-symbols-outlined">expand_more</span>
          </button>
        )}
      </div>

      <div className="channel-scroll">
        <div className={`connection-pill ${connectionState}`} title={t("workspace.liveConnection")}>
          {t(`channel.connection${connectionState[0].toUpperCase()}${connectionState.slice(1)}`)}
        </div>

        {categoryGroups.map((category) => (
          <section className="channel-category" key={category.id}>
            <header className="channel-category-header">
              <span>
                <span className="material-symbols-outlined">keyboard_arrow_right</span>
                {category.name}
              </span>
              {canManageChannels && (
                <button
                  type="button"
                  className="channel-category-action"
                  onClick={() => onCreateChannel(getCategoryCreateType(category, category.channels), category.id)}
                  title={t("admin.createChannel")}
                  aria-label={t("admin.createChannel")}
                >
                  +
                </button>
              )}
            </header>
            <div className="channel-list">
              {category.channels.map((channel) => (
                <ChannelButton
                  key={channel.id}
                  channel={channel}
                  isActive={selectedTextChannelId === channel.id}
                  isVoiceActive={activeVoiceChannelId === channel.id}
                  onSelect={onSelectChannel}
                  textFallback={t("channel.textFallback")}
                  voiceFallback={t("channel.voiceFallback")}
                  canManageChannels={canManageChannels}
                  onEdit={onEditChannel}
                  voiceParticipants={voiceParticipants}
                  currentUserId={currentUserId}
                />
              ))}
            </div>
          </section>
        ))}

        {renderChannelGroup(t("workspace.textChannels"), uncategorizedTextChannels, "Text")}
        {renderChannelGroup(t("workspace.voiceChannels"), uncategorizedVoiceChannels, "Voice")}

        {!channels.length && (
          <div className="empty-panel">
            <p>{t("channel.noChannels")}</p>
          </div>
        )}
      </div>
    </aside>
  );
}

export default ChannelList;
