import { useI18n } from "../i18n";

function ChannelButton({
  channel,
  isActive,
  isVoiceActive,
  onSelect,
  textFallback,
  voiceFallback,
  liveLabel
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
      </span>
      {isVoiceActive && <span className="mini-pill">{liveLabel}</span>}
    </button>
  );
}

function ChannelList({
  server,
  selectedTextChannelId,
  activeVoiceChannelId,
  connectionState,
  onSelectChannel
}) {
  const { t } = useI18n();
  const categories = server?.categories ?? [];
  const channels = server?.channels ?? [];

  const categoryGroups = categories.map((category) => ({
    ...category,
    channels: channels.filter((channel) => channel.categoryId === category.id)
  }));

  const uncategorizedChannels = channels.filter((channel) => !channel.categoryId);
  const uncategorizedTextChannels = uncategorizedChannels.filter((channel) => channel.type === "Text");
  const uncategorizedVoiceChannels = uncategorizedChannels.filter((channel) => channel.type === "Voice");

  function renderChannelGroup(title, groupChannels) {
    if (!groupChannels.length) {
      return null;
    }

    return (
      <section className="channel-category">
        <header>
          <span className="material-symbols-outlined">keyboard_arrow_right</span>
          {title}
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
              liveLabel={t("channel.live")}
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
        <span className="material-symbols-outlined">expand_more</span>
      </div>

      <div className="channel-scroll">
        <div className={`connection-pill ${connectionState}`} title={t("workspace.liveConnection")}>
          {t(`channel.connection${connectionState[0].toUpperCase()}${connectionState.slice(1)}`)}
        </div>

        {categoryGroups.map((category) => (
          <section className="channel-category" key={category.id}>
            <header>
              <span className="material-symbols-outlined">keyboard_arrow_right</span>
              {category.name}
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
                  liveLabel={t("channel.live")}
                />
              ))}
            </div>
          </section>
        ))}

        {renderChannelGroup(t("workspace.textChannels"), uncategorizedTextChannels)}
        {renderChannelGroup(t("workspace.voiceChannels"), uncategorizedVoiceChannels)}

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
