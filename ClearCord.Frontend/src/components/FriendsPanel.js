import { useState } from "react";
import { toAssetUrl } from "../services/api";
import { useI18n } from "../i18n";

function UserAvatar({ user }) {
  return (
    <div className="avatar-badge">
      {user.avatarUrl ? (
        <img src={toAssetUrl(user.avatarUrl)} alt={user.displayName} className="avatar-image" />
      ) : (
        <span>{user.displayName?.[0]?.toUpperCase() || user.userName?.[0]?.toUpperCase() || "U"}</span>
      )}
    </div>
  );
}

function UserRow({ user, children, subtitle }) {
  return (
    <div className="list-row">
      <div className="list-row-main">
        <UserAvatar user={user} />
        <div>
          <strong>{user.displayName}</strong>
          <p>
            @{user.userName}
            {subtitle ? ` \u2022 ${subtitle}` : ""}
          </p>
        </div>
      </div>
      <div className="inline-actions">{children}</div>
    </div>
  );
}

function FriendsPanel({
  friends,
  requests,
  searchTerm,
  searchResults,
  isLoading,
  error,
  onSearchTermChange,
  onSendRequest,
  onAcceptRequest,
  onRejectRequest,
  onUnfriend,
  onStartDirectChat,
  onStartDirectCall,
  onViewProfile
}) {
  const { t } = useI18n();
  const [pendingDirectAction, setPendingDirectAction] = useState(null);

  async function handleDirectAction(friendUserId, action) {
    const actionKey = `${action}:${friendUserId}`;
    setPendingDirectAction(actionKey);

    try {
      if (action === "chat") {
        await onStartDirectChat?.(friendUserId);
      } else {
        await onStartDirectCall?.(friendUserId);
      }
    } finally {
      setPendingDirectAction(null);
    }
  }

  return (
    <section className="feature-panel">
      <div className="feature-panel-header">
        <div>
          <p className="eyebrow">{t("friends.eyebrow")}</p>
          <h2>{t("friends.title")}</h2>
        </div>
      </div>

      <div className="feature-grid">
        <div className="feature-card">
          <h3>{t("friends.searchUsers")}</h3>
          <label>
            {t("friends.searchLabel")}
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              placeholder={t("friends.searchPlaceholder")}
            />
          </label>

          <div className="list-stack">
            {searchResults.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                subtitle={user.isOnline ? t("common.online").toLowerCase() : t("common.offline").toLowerCase()}
              >
                <button
                  type="button"
                  className="ghost-button compact"
                  onClick={() => onViewProfile?.(user.id)}
                >
                  {t("friends.viewProfile")}
                </button>
                <button
                  type="button"
                  className="primary-button compact"
                  onClick={() => onSendRequest(user.id)}
                >
                  {t("friends.addFriend")}
                </button>
              </UserRow>
            ))}

            {!searchResults.length && searchTerm.trim().length > 1 && (
              <p className="muted-copy">{t("friends.noSearchResults")}</p>
            )}
          </div>
        </div>

        <div className="feature-card">
          <h3>{t("friends.pendingRequests")}</h3>
          <div className="list-stack">
            {requests.map((request) => (
              <UserRow
                key={request.id}
                user={request.user}
                subtitle={request.status}
              >
                <button
                  type="button"
                  className="ghost-button compact"
                  onClick={() => onViewProfile?.(request.user.id)}
                >
                  {t("friends.viewProfile")}
                </button>
                <button
                  type="button"
                  className="primary-button compact"
                  onClick={() => onAcceptRequest(request.id)}
                >
                  {t("friends.accept")}
                </button>
                <button
                  type="button"
                  className="ghost-button compact"
                  onClick={() => onRejectRequest(request.id)}
                >
                  {t("friends.reject")}
                </button>
              </UserRow>
            ))}

            {!requests.length && <p className="muted-copy">{t("friends.noRequests")}</p>}
          </div>
        </div>
      </div>

      <div className="feature-card">
        <h3>{t("friends.currentFriends")}</h3>
        {isLoading ? (
          <p className="muted-copy">{t("friends.loadingFriends")}</p>
        ) : (
          <div className="list-stack">
            {friends.map((friend) => {
              const isOpeningChat = pendingDirectAction === `chat:${friend.userId}`;
              const isOpeningCall = pendingDirectAction === `call:${friend.userId}`;

              return (
                <UserRow
                  key={friend.userId}
                  user={{
                    id: friend.userId,
                    userName: friend.userName,
                    displayName: friend.displayName,
                    avatarUrl: friend.avatarUrl
                  }}
                  subtitle={friend.isOnline ? t("common.online").toLowerCase() : t("common.offline").toLowerCase()}
                >
                  <button
                    type="button"
                    className="primary-button compact"
                    onClick={() => handleDirectAction(friend.userId, "chat").catch(() => {})}
                    disabled={Boolean(pendingDirectAction)}
                  >
                    {isOpeningChat ? t("common.loading") : t("friends.message")}
                  </button>
                  <button
                    type="button"
                    className="ghost-button compact"
                    onClick={() => handleDirectAction(friend.userId, "call").catch(() => {})}
                    disabled={Boolean(pendingDirectAction)}
                  >
                    {isOpeningCall ? t("common.loading") : t("friends.call")}
                  </button>
                  <button
                    type="button"
                    className="ghost-button compact"
                    onClick={() => onViewProfile?.(friend.userId)}
                  >
                    {t("friends.viewProfile")}
                  </button>
                  <button
                    type="button"
                    className="ghost-button compact"
                    onClick={() => onUnfriend(friend.userId)}
                  >
                    {t("friends.unfriend")}
                  </button>
                </UserRow>
              );
            })}

            {!friends.length && <p className="muted-copy">{t("friends.noFriends")}</p>}
          </div>
        )}
      </div>

      {error && <p className="form-error">{error}</p>}
    </section>
  );
}

export default FriendsPanel;
