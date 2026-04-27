function NotificationsPanel({
  notifications,
  onOpenNotification,
  onMarkRead,
  onMarkAllRead
}) {
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  return (
    <section className="feature-panel">
      <div className="feature-panel-header">
        <div>
          <p className="eyebrow">Notifications</p>
          <h2>Inbox and live event feed</h2>
        </div>

        <div className="inline-actions">
          <span className="mini-pill">{unreadCount} unread</span>
          <button type="button" className="ghost-button compact" onClick={onMarkAllRead}>
            Mark all read
          </button>
        </div>
      </div>

      <div className="feature-card">
        <div className="list-stack">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              className={`notification-row ${notification.isRead ? "read" : "unread"}`}
              onClick={() => onOpenNotification(notification)}
            >
              <div>
                <div className="notification-row-top">
                  <strong>{notification.title}</strong>
                  <span>{notification.type}</span>
                </div>
                <p>{notification.content}</p>
              </div>
              <small>{new Date(notification.createdAt).toLocaleString()}</small>
            </button>
          ))}

          {!notifications.length && (
            <p className="muted-copy">No notifications yet. New messages and friend requests will appear here.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export default NotificationsPanel;
