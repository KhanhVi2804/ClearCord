import { toAssetUrl } from "../services/api";
import { useI18n } from "../i18n";

function ServerRail({
  servers,
  selectedServerId,
  activeView,
  currentUser,
  onSelectServer,
  onSelectView,
  onOpenCreateServer,
  onOpenJoinServer,
  onOpenProfile
}) {
  const { t } = useI18n();

  return (
    <aside className="server-rail" aria-label={t("sidebar.servers")}>
      <button
        type="button"
        className={`server-tile server-tile-home ${activeView === "chat" ? "active" : ""}`}
        onClick={() => onSelectView("chat")}
        title={t("tabs.chat")}
      >
        <span className="brand-mark">CC</span>
      </button>

      <div className="server-stack">
        {servers.map((server) => {
          const isActive = server.id === selectedServerId && activeView === "chat";
          const initials = server.name
            .split(" ")
            .slice(0, 2)
            .map((chunk) => chunk[0])
            .join("")
            .toUpperCase();

          return (
            <button
              key={server.id}
              type="button"
              className={`server-tile ${isActive ? "active" : ""}`}
              onClick={() => {
                onSelectServer(server.id);
                onSelectView("chat");
              }}
              title={server.name}
            >
              {server.iconUrl ? (
                <img src={toAssetUrl(server.iconUrl)} alt={server.name} className="server-avatar-image" />
              ) : (
                <span>{initials}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="server-rail-actions">
        <button
          type="button"
          className="server-tile server-tile-add"
          onClick={onOpenCreateServer}
          title={t("sidebar.createServer")}
        >
          +
        </button>
        <button
          type="button"
          className="server-tile server-tile-join"
          onClick={onOpenJoinServer}
          title={t("sidebar.joinServer")}
        >
          {`<>`}
        </button>
      </div>

      <button
        type="button"
        className="server-rail-user"
        onClick={onOpenProfile}
        title={currentUser.displayName}
      >
        <div className="avatar-badge">
          {currentUser.avatarUrl ? (
            <img
              src={toAssetUrl(currentUser.avatarUrl)}
              alt={currentUser.displayName}
              className="avatar-image"
            />
          ) : (
            <span>{currentUser.displayName?.[0]?.toUpperCase() || "U"}</span>
          )}
        </div>
        <span className={`presence-dot ${currentUser.isOnline ? "online" : "offline"}`} />
      </button>
    </aside>
  );
}

export default ServerRail;
