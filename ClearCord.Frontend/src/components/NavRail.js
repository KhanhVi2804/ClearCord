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

function NavRail({
  activeView,
  unreadNotificationCount,
  canSeeAdmin,
  onSelectView,
  onLogout
}) {
  const { t } = useI18n();

  return (
    <aside className="nav-rail" aria-label={t("sidebar.navigation")}>
      <nav className="nav-rail-items">
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

      <div className="nav-rail-footer">
        <LanguageSwitcher compact />
        <button type="button" className="nav-icon-btn logout-btn" onClick={onLogout} title={t("sidebar.logout")}>
          <span className="nav-icon-glyph">⏻</span>
        </button>
      </div>
    </aside>
  );
}

export default NavRail;
