import ModalShell from "./ModalShell";
import { toAssetUrl } from "../services/api";
import { useI18n } from "../i18n";

function UserProfileModal({
  profile,
  isLoading,
  error,
  onClose
}) {
  const { t, formatDateTime } = useI18n();

  return (
    <ModalShell title={t("userProfile.title")} subtitle={t("userProfile.subtitle")} onClose={onClose}>
      {isLoading ? (
        <div className="empty-panel">
          <p>{t("userProfile.loading")}</p>
        </div>
      ) : error ? (
        <div className="empty-panel error-panel">
          <p>{error}</p>
        </div>
      ) : !profile ? (
        <div className="empty-panel">
          <p>{t("userProfile.notFound")}</p>
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
                {profile.isOnline ? t("common.online") : t("common.offline")}
              </span>
            </div>
          </div>

          <div className="feature-card">
            <div className="profile-facts">
              <div>
                <span>{t("userProfile.email")}</span>
                <strong>{profile.email}</strong>
              </div>
              <div>
                <span>{t("userProfile.lastSeen")}</span>
                <strong>{profile.lastSeenAt ? formatDateTime(profile.lastSeenAt) : t("userProfile.noActivity")}</strong>
              </div>
            </div>
          </div>

          <div className="feature-card">
            <h3>{t("userProfile.bio")}</h3>
            <p className="muted-copy">{profile.bio || t("userProfile.bioEmpty")}</p>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

export default UserProfileModal;
