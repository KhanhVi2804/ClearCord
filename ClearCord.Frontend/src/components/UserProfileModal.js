import ModalShell from "./ModalShell";
import { toAssetUrl } from "../services/api";

function formatLastSeen(value) {
  if (!value) {
    return "No activity yet";
  }

  return new Date(value).toLocaleString();
}

function UserProfileModal({
  profile,
  isLoading,
  error,
  onClose
}) {
  return (
    <ModalShell title="User profile" subtitle="Directory" onClose={onClose}>
      {isLoading ? (
        <div className="empty-panel">
          <p>Loading user profile...</p>
        </div>
      ) : error ? (
        <div className="empty-panel error-panel">
          <p>{error}</p>
        </div>
      ) : !profile ? (
        <div className="empty-panel">
          <p>No user profile was found.</p>
        </div>
      ) : (
        <div className="user-profile-modal">
          <div className="profile-hero">
            <div className="profile-avatar-large">
              {profile.avatarUrl ? (
                <img
                  src={toAssetUrl(profile.avatarUrl)}
                  alt={profile.displayName}
                  className="avatar-image"
                />
              ) : (
                <span>{profile.displayName?.[0]?.toUpperCase() || profile.userName?.[0]?.toUpperCase() || "U"}</span>
              )}
            </div>
            <div>
              <strong>{profile.displayName}</strong>
              <p>@{profile.userName}</p>
              <span className={`presence-pill ${profile.isOnline ? "online" : "offline"}`}>
                {profile.isOnline ? "Online" : "Offline"}
              </span>
            </div>
          </div>

          <div className="feature-card">
            <div className="profile-facts">
              <div>
                <span>Email</span>
                <strong>{profile.email}</strong>
              </div>
              <div>
                <span>Last seen</span>
                <strong>{formatLastSeen(profile.lastSeenAt)}</strong>
              </div>
            </div>
          </div>

          <div className="feature-card">
            <h3>Bio</h3>
            <p className="muted-copy">{profile.bio || "This user has not added a bio yet."}</p>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

export default UserProfileModal;
