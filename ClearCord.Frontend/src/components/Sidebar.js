import { toAssetUrl } from "../services/api";
import LanguageSwitcher from "./LanguageSwitcher";
import { useI18n } from "../i18n";

const NAV_ITEMS = [
  { id: "chat", icon: "#", labelKey: "tabs.chat" },
  { id: "friends", icon: "@", labelKey: "tabs.friends" },
  { id: "voice", icon: "♪", labelKey: "tabs.calls" },
  { id: "notifications", icon: "!", labelKey: "tabs.alerts", badgeKey: "notifications" },
  { id: "admin", icon: "⚙", labelKey: "tabs.admin", adminOnly: true },
  { id: "profile", icon: "◉", labelKey: "tabs.profile" }
];

function Sidebar({
  servers,
  selectedServerId,
  currentUser,
  activeView,
  unreadNotificationCount,
  canSeeAdmin,
  onSelectView,
  onSelectServer,
  onOpenCreateServer,
  onOpenJoinServer,
  onLogout
}) {
  const { t } = useI18n();

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="brand-tile" title="ClearCord">
          <span className="brand-mark">CC</span>
        </div>

        <nav className="sidebar-nav" aria-label={t("sidebar.navigation")}>
          {NAV_ITEMS.filter((item) => !item.adminOnly || canSeeAdmin).map((item) => {
            const badge =
              item.badgeKey === "notifications" && unreadNotificationCount > 0
                ? unreadNotificationCount
                : null;

            return (
              <button
                key={item.id}
                type="button"
                className={`nav-icon-btn ${activeView === item.id ? "active" : ""}`}
                onClick={() => onSelectView(item.id)}
                title={t(item.labelKey)}
                aria-label={t(item.labelKey)}
                aria-current={activeView === item.id ? "page" : undefined}
              >
                <span className="nav-icon-glyph">{item.icon}</span>
                {badge ? <span className="nav-badge">{badge > 9 ? "9+" : badge}</span> : null}
              </button>
            );
          })}
        </nav>

        <div className="server-stack">
          <div className="server-divider" aria-hidden="true" />

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
      </div>

      <div className="sidebar-footer">
        <div className="user-chip" title={currentUser.displayName}>
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
        </div>

        <LanguageSwitcher compact />

        <button type="button" className="nav-icon-btn logout-btn" onClick={onLogout} title={t("sidebar.logout")}>
          <span className="nav-icon-glyph">⏻</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
