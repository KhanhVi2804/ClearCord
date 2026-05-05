import { useMemo, useState } from "react";
import { toAssetUrl } from "../services/api";
import { useI18n } from "../i18n";

function MemberRow({ member, onViewProfile, statusLabel, joinedLabel }) {
  const topRole = member.roles?.[0];

  return (
    <button type="button" className="member-directory-item" onClick={() => onViewProfile?.(member.userId)}>
      <div className="list-row-main">
        <div className="avatar-badge">
          {member.avatarUrl ? (
            <img src={toAssetUrl(member.avatarUrl)} alt={member.displayName} className="avatar-image" />
          ) : (
            <span>{member.displayName?.[0]?.toUpperCase() || member.userName?.[0]?.toUpperCase() || "U"}</span>
          )}
        </div>
        <div className="member-directory-copy">
          <strong>{member.nickname || member.displayName}</strong>
          <p>@{member.userName}</p>
        </div>
      </div>
      <div className="member-directory-meta">
        <span className={`presence-pill ${member.isOnline ? "online" : "offline"}`}>{statusLabel}</span>
        {topRole ? (
          <span className="role-badge" style={{ borderColor: topRole.colorHex, color: topRole.colorHex }}>
            {topRole.name}
          </span>
        ) : null}
        <small>{joinedLabel}</small>
      </div>
    </button>
  );
}

function WorkspaceRail({
  server,
  invite,
  currentChannel,
  unreadNotificationCount,
  onViewProfile
}) {
  const { t, formatDateTime } = useI18n();
  const [copyState, setCopyState] = useState("idle");

  const members = useMemo(() => {
    return [...(server?.members ?? [])].sort((left, right) => {
      if (left.isOnline !== right.isOnline) {
        return left.isOnline ? -1 : 1;
      }

      return (left.nickname || left.displayName).localeCompare(right.nickname || right.displayName);
    });
  }, [server?.members]);

  const onlineMembers = members.filter((member) => member.isOnline).length;
  const textChannels = server?.channels?.filter((channel) => channel.type === "Text").length ?? 0;
  const voiceChannels = server?.channels?.filter((channel) => channel.type === "Voice").length ?? 0;

  async function handleCopyInvite() {
    if (!invite?.inviteUrl || !navigator.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(invite.inviteUrl);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("idle");
    }
  }

  return (
    <aside className="workspace-rail">
      {!server ? (
        <div className="rail-section empty-panel">
          <p>{t("workspace.noServerSelected")}</p>
        </div>
      ) : (
        <>
          <section className="rail-section rail-hero">
            <div>
              <p className="eyebrow">{t("workspace.serverOverview")}</p>
              <h2>{server.name}</h2>
              <p className="muted-copy">{server.description || t("workspace.noDescription")}</p>
            </div>

            {invite && (
              <div className="invite-card">
                <strong>{t("workspace.inviteCode")}</strong>
                <code>{invite.inviteCode}</code>
                <button type="button" className="ghost-button compact" onClick={handleCopyInvite}>
                  {copyState === "copied" ? t("common.copied") : t("workspace.copyInvite")}
                </button>
              </div>
            )}
          </section>

          <section className="rail-stats-grid">
            <article className="stat-card">
              <span>{t("workspace.membersOnline")}</span>
              <strong>{onlineMembers}</strong>
              <small>{members.length} {t("common.members").toLowerCase()}</small>
            </article>
            <article className="stat-card">
              <span>{t("workspace.textChannels")}</span>
              <strong>{textChannels}</strong>
              <small>{t("channel.textType")}</small>
            </article>
            <article className="stat-card">
              <span>{t("workspace.voiceChannels")}</span>
              <strong>{voiceChannels}</strong>
              <small>{t("channel.voiceType")}</small>
            </article>
            <article className="stat-card">
              <span>{t("workspace.unreadAlerts")}</span>
              <strong>{unreadNotificationCount}</strong>
              <small>{t("tabs.alerts")}</small>
            </article>
          </section>

          <section className="rail-section">
            <div className="section-heading">
              <h3>{t("workspace.channelSnapshot")}</h3>
              {currentChannel ? <span className="mini-pill">#{currentChannel.name}</span> : null}
            </div>
            <div className="feature-card rail-channel-card">
              <strong>{currentChannel ? `#${currentChannel.name}` : t("common.channel")}</strong>
              <p className="muted-copy">{currentChannel?.topic || t("workspace.noTopic")}</p>
            </div>
          </section>

          <section className="rail-section member-directory">
            <div className="section-heading">
              <h3>{t("workspace.memberDirectory")}</h3>
              <span className="mini-pill">
                {onlineMembers}/{members.length} {t("common.online").toLowerCase()}
              </span>
            </div>

            <div className="member-directory-list">
              {members.length === 0 ? (
                <p className="muted-copy">{t("workspace.noMembers")}</p>
              ) : (
                members.map((member) => (
                  <MemberRow
                    key={member.userId}
                    member={member}
                    onViewProfile={onViewProfile}
                    statusLabel={member.isOnline ? t("common.online") : t("common.offline")}
                    joinedLabel={formatDateTime(member.joinedAt)}
                  />
                ))
              )}
            </div>
          </section>
        </>
      )}
    </aside>
  );
}

export default WorkspaceRail;
