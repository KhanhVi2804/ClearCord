import { useEffect, useState } from "react";
import { toAssetUrl } from "../services/api";

function ProfilePanel({
  currentUser,
  onSaveProfile,
  onUploadAvatar
}) {
  const [form, setForm] = useState({
    displayName: currentUser.displayName,
    bio: currentUser.bio || ""
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setForm({
      displayName: currentUser.displayName,
      bio: currentUser.bio || ""
    });
  }, [currentUser.bio, currentUser.displayName]);

  return (
    <section className="feature-panel">
      <div className="feature-panel-header">
        <div>
          <p className="eyebrow">Profile</p>
          <h2>Update your identity and avatar</h2>
        </div>
      </div>

      <div className="feature-grid">
        <div className="feature-card profile-card">
          <div className="profile-hero">
            <div className="profile-avatar-large">
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
            <div>
              <strong>{currentUser.displayName}</strong>
              <p>@{currentUser.userName}</p>
              <span className={`presence-pill ${currentUser.isOnline ? "online" : "offline"}`}>
                {currentUser.isOnline ? "Online" : "Offline"}
              </span>
            </div>
          </div>

          <label className="file-upload-button profile-upload">
            Upload avatar
            <input
              type="file"
              accept="image/*"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  return;
                }

                setError("");
                setSuccess("");
                setIsSaving(true);

                try {
                  await onUploadAvatar(file);
                  setSuccess("Avatar updated.");
                } catch (uploadError) {
                  setError(uploadError.message);
                } finally {
                  setIsSaving(false);
                  event.target.value = "";
                }
              }}
            />
          </label>
        </div>

        <form
          className="feature-card profile-form"
          onSubmit={async (event) => {
            event.preventDefault();
            setError("");
            setSuccess("");
            setIsSaving(true);

            try {
              await onSaveProfile(form);
              setSuccess("Profile updated.");
            } catch (saveError) {
              setError(saveError.message);
            } finally {
              setIsSaving(false);
            }
          }}
        >
          <label>
            Display name
            <input
              type="text"
              value={form.displayName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  displayName: event.target.value
                }))
              }
              required
            />
          </label>

          <label>
            Bio
            <textarea
              value={form.bio}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  bio: event.target.value
                }))
              }
              rows={5}
            />
          </label>

          {error && <p className="form-error">{error}</p>}
          {success && <p className="form-success">{success}</p>}

          <button type="submit" className="primary-button" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save profile"}
          </button>
        </form>
      </div>
    </section>
  );
}

export default ProfilePanel;
