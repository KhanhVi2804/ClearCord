function ChannelButton({
  channel,
  isActive,
  isVoiceActive,
  onSelect
}) {
  return (
    <button
      type="button"
      className={`channel-button ${isActive ? "active" : ""} ${isVoiceActive ? "voice-live" : ""}`}
      onClick={() => onSelect(channel)}
    >
      <span className="channel-icon">{channel.type === "Voice" ? "Call" : "#"}</span>
      <span className="channel-copy">
        <strong>{channel.name}</strong>
        <small>{channel.topic || (channel.type === "Voice" ? "Voice channel" : "Text channel")}</small>
      </span>
      {isVoiceActive && <span className="mini-pill">live</span>}
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
          <p className="eyebrow">Server</p>
          <h2>{server?.name ?? "No server selected"}</h2>
        </div>

        <span className={`connection-pill ${connectionState}`}>{connectionState}</span>
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
                />
              ))}
            </div>
          </section>
        ))}

        {uncategorizedChannels.length > 0 && (
          <section className="channel-category">
            <header>Loose Channels</header>
            <div className="channel-list">
              {uncategorizedChannels.map((channel) => (
                <ChannelButton
                  key={channel.id}
                  channel={channel}
                  isActive={selectedTextChannelId === channel.id}
                  isVoiceActive={activeVoiceChannelId === channel.id}
                  onSelect={onSelectChannel}
                />
              ))}
            </div>
          </section>
        )}

        {!channels.length && (
          <div className="empty-panel">
            <p>No channels are available in this server yet.</p>
          </div>
        )}
      </div>
    </aside>
  );
}

export default ChannelList;
