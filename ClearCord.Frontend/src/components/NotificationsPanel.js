import { useI18n } from "../i18n";

function NotificationsPanel({
  notifications,
  onOpenNotification,
  onMarkRead,
  onMarkAllRead
}) {
  const { t, formatDateTime } = useI18n();
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  function getTypeLabel(type) {
    if (type === "FriendRequest") {
      return t("notifications.typeFriendRequest");
    }

    if (type === "Message") {
      return t("notifications.typeMessage");
    }

    if (type === "ServerEvent") {
      return t("notifications.typeServerEvent");
    }

    return type;
  }

  return (
    <section className="feature-panel">
      <div className="feature-panel-header">
        <div>
          <p className="eyebrow">{t("notifications.eyebrow")}</p>
          <h2>{t("notifications.title")}</h2>
        </div>

        <div className="inline-actions">
          <span className="mini-pill">{t("notifications.unread", { count: unreadCount })}</span>
          <button type="button" className="ghost-button compact" onClick={onMarkAllRead}>
            {t("notifications.markAllRead")}
          </button>
        </div>
      </div>

      <div className="feature-card">
        <div className="list-stack">
          {notifications.map((notification) => (
            <article
              key={notification.id}
              className={`notification-row ${notification.isRead ? "read" : "unread"}`}
            >
              <button type="button" className="notification-open-button" onClick={() => onOpenNotification(notification)}>
                <div>
                  <div className="notification-row-top">
                    <strong>{notification.title}</strong>
                    <span>{getTypeLabel(notification.type)}</span>
                  </div>
                  <p>{notification.content}</p>
                </div>
              </button>
              <div className="notification-row-actions">
                <small>{formatDateTime(notification.createdAt)}</small>
                {!notification.isRead && (
                  <button
                    type="button"
                    className="ghost-button compact"
                    onClick={() => onMarkRead(notification.id)}
                  >
                    {t("notifications.markRead")}
                  </button>
                )}
              </div>
            </article>
          ))}

          {!notifications.length && (
            <p className="muted-copy">{t("notifications.empty")}</p>
          )}
        </div>
      </div>
    </section>
  );
}

export default NotificationsPanel;
