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
  return (
    <button
      type="button"
      className={`channel-button ${isActive ? "active" : ""} ${isVoiceActive ? "voice-live" : ""}`}
      onClick={() => onSelect(channel)}
    >
      <span className="channel-icon">{channel.type === "Voice" ? "VC" : "#"}</span>
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

  return (
    <aside className="channel-panel">
      <div className="channel-panel-header">
        <div>
          <p className="eyebrow">{t("channel.heading")}</p>
          <h2>{server?.name ?? t("channel.noServer")}</h2>
        </div>

        <span className={`connection-pill ${connectionState}`}>
          {t(`channel.connection${connectionState[0].toUpperCase()}${connectionState.slice(1)}`)}
        </span>
      </div>

      <div className="channel-scroll">
        {categoryGroups.map((category) => (
          <section className="channel-category" key={category.id}>
            <header>{category.name}</header>
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

        {uncategorizedChannels.length > 0 && (
          <section className="channel-category">
            <header>{t("channel.looseChannels")}</header>
            <div className="channel-list">
              {uncategorizedChannels.map((channel) => (
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
        )}

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
