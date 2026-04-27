import { toAssetUrl } from "../services/api";

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
  onViewProfile
}) {
  return (
    <section className="feature-panel">
      <div className="feature-panel-header">
        <div>
          <p className="eyebrow">Friends</p>
          <h2>Search, add, and manage your friend list</h2>
        </div>
      </div>

      <div className="feature-grid">
        <div className="feature-card">
          <h3>Find users</h3>
          <label>
            Search by username or display name
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              placeholder="Search users..."
            />
          </label>

          <div className="list-stack">
            {searchResults.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                subtitle={user.isOnline ? "online" : "offline"}
              >
                <button
                  type="button"
                  className="ghost-button compact"
                  onClick={() => onViewProfile?.(user.id)}
                >
                  View profile
                </button>
                <button
                  type="button"
                  className="primary-button compact"
                  onClick={() => onSendRequest(user.id)}
                >
                  Add friend
                </button>
              </UserRow>
            ))}

            {!searchResults.length && searchTerm.trim().length > 1 && (
              <p className="muted-copy">No users matched your search.</p>
            )}
          </div>
        </div>

        <div className="feature-card">
          <h3>Pending requests</h3>
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
                  View profile
                </button>
                <button
                  type="button"
                  className="primary-button compact"
                  onClick={() => onAcceptRequest(request.id)}
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="ghost-button compact"
                  onClick={() => onRejectRequest(request.id)}
                >
                  Reject
                </button>
              </UserRow>
            ))}

            {!requests.length && <p className="muted-copy">No pending friend requests.</p>}
          </div>
        </div>
      </div>

      <div className="feature-card">
        <h3>Current friends</h3>
        {isLoading ? (
          <p className="muted-copy">Loading your friend graph...</p>
        ) : (
          <div className="list-stack">
            {friends.map((friend) => (
              <UserRow
                key={friend.userId}
                user={{
                  id: friend.userId,
                  userName: friend.userName,
                  displayName: friend.displayName,
                  avatarUrl: friend.avatarUrl
                }}
                subtitle={friend.isOnline ? "online" : "offline"}
              >
                <button
                  type="button"
                  className="ghost-button compact"
                  onClick={() => onViewProfile?.(friend.userId)}
                >
                  View profile
                </button>
                <button
                  type="button"
                  className="ghost-button compact"
                  onClick={() => onUnfriend(friend.userId)}
                >
                  Unfriend
                </button>
              </UserRow>
            ))}

            {!friends.length && <p className="muted-copy">You have not added any friends yet.</p>}
          </div>
        )}
      </div>

      {error && <p className="form-error">{error}</p>}
    </section>
  );
}

export default FriendsPanel;
