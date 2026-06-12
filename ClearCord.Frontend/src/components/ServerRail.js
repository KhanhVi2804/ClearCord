import { toAssetUrl } from "../services/api";
import ClearSettingsMenu from "./ClearSettingsMenu";
import LanguageSwitcher from "./LanguageSwitcher";
import { useI18n } from "../i18n";
import appLogoUrl from "../assets/app-logo.png";

function ServerRail({
  servers,
  selectedServerId,
  activeView,
  currentUser,
  onSelectServer,
  onOpenCreateServer,
  onOpenJoinServer,
  isClearEnabled,
  notificationVolume,
  onClearEnabledChange,
  onNotificationVolumeChange,
  onOpenProfile,
  onLogout
}) {
  const { t } = useI18n();

  return (
    <aside className="server-rail" aria-label={t("sidebar.servers")}>
      <button
        type="button"
        className={`server-tile server-tile-home ${activeView === "chat" ? "active" : ""}`}
        onClick={() => selectedServerId && onSelectServer(selectedServerId)}
        title={t("tabs.chat")}
      >
        <span className="brand-mark">
          <img src={appLogoUrl} alt="ClearCord" className="app-logo-mark" />
        </span>
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
              onClick={() => onSelectServer(server.id)}
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
        <ClearSettingsMenu
          isClearEnabled={isClearEnabled}
          notificationVolume={notificationVolume}
          onClearEnabledChange={onClearEnabledChange}
          onNotificationVolumeChange={onNotificationVolumeChange}
        />
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

      <div className="server-rail-footer">
        <LanguageSwitcher compact />
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
        <button type="button" className="server-tile server-tile-logout" onClick={onLogout} title={t("sidebar.logout")}>
          <span className="material-symbols-outlined">power_settings_new</span>
        </button>
      </div>
    </aside>
  );
}

export default ServerRail;
