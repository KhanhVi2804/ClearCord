import { toAssetUrl } from "../services/api";

function Sidebar({
  servers,
  selectedServerId,
  currentUser,
  unreadNotificationCount,
  onSelectServer,
  onOpenCreateServer,
  onOpenJoinServer,
  onLogout
}) {
  return (
    <aside className="sidebar">
      <div className="brand-tile">
        <span className="brand-mark">CC</span>
      </div>

      <div className="server-stack">
        {servers.map((server) => {
          const isActive = server.id === selectedServerId;
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
              onClick={() => onSelectServer(server.id)}
              title={server.name}
            >
              {server.iconUrl ? (
                <img
                  src={toAssetUrl(server.iconUrl)}
                  alt={server.name}
                  className="server-avatar-image"
                />
              ) : (
                <span>{initials}</span>
              )}
            </button>
          );
        })}

        <button
          type="button"
          className="server-tile server-tile-add"
          onClick={onOpenCreateServer}
          title="Create server"
        >
          +
        </button>

        <button
          type="button"
          className="server-tile server-tile-join"
          onClick={onOpenJoinServer}
          title="Join with invite"
        >
          {`<>`}
        </button>
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-stats">
          <div className="sidebar-stat">
            <span className="sidebar-stat-label">Alerts</span>
            <strong>{unreadNotificationCount}</strong>
          </div>
          <div className={`presence-pill ${currentUser.isOnline ? "online" : "offline"}`}>
            {currentUser.isOnline ? "Online" : "Offline"}
          </div>
        </div>

        <div className="user-chip">
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
          <div className="user-chip-text">
            <strong>{currentUser.displayName}</strong>
            <span>@{currentUser.userName}</span>
          </div>
        </div>

        <button type="button" className="ghost-button" onClick={onLogout}>
          Log out
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
