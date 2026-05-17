import { useMemo } from "react";
import { toAssetUrl } from "../services/api";
import { useI18n } from "../i18n";

function MemberRow({ member, onViewProfile, statusLabel }) {
  const topRole = member.roles?.[0];

  return (
    <button type="button" className="member-row-compact" onClick={() => onViewProfile?.(member.userId)}>
      <div className="avatar-badge small">
        {member.avatarUrl ? (
          <img src={toAssetUrl(member.avatarUrl)} alt={member.displayName} className="avatar-image" />
        ) : (
          <span>{member.displayName?.[0]?.toUpperCase() || member.userName?.[0]?.toUpperCase() || "U"}</span>
        )}
        <span className={`presence-dot ${member.isOnline ? "online" : "offline"}`} />
      </div>
      <span className="member-row-name">{member.nickname || member.displayName}</span>
      {topRole ? (
        <span className="role-badge subtle" style={{ color: topRole.colorHex }}>
          {topRole.name}
        </span>
      ) : null}
    </button>
  );
}

function WorkspaceRail({ server, onViewProfile }) {
  const { t } = useI18n();

  const { online, offline } = useMemo(() => {
    const members = [...(server?.members ?? [])].sort((left, right) =>
      (left.nickname || left.displayName).localeCompare(right.nickname || right.displayName)
    );

    return {
      online: members.filter((member) => member.isOnline),
      offline: members.filter((member) => !member.isOnline)
    };
  }, [server?.members]);

  return (
    <aside className="workspace-rail">
      {!server ? (
        <div className="rail-empty">
          <p>{t("workspace.noServerSelected")}</p>
        </div>
      ) : (
        <>
          <header className="rail-header">
            <h3>{t("workspace.memberDirectory")}</h3>
            <span className="member-count">
              {online.length}/{online.length + offline.length}
            </span>
          </header>

          <div className="member-groups">
            {online.length > 0 && (
              <section className="member-group">
                <h4>
                  {t("common.online")} — {online.length}
                </h4>
                <div className="member-list-compact">
                  {online.map((member) => (
                    <MemberRow
                      key={member.userId}
                      member={member}
                      onViewProfile={onViewProfile}
                      statusLabel={t("common.online")}
                    />
                  ))}
                </div>
              </section>
            )}

            {offline.length > 0 && (
              <section className="member-group">
                <h4>
                  {t("common.offline")} — {offline.length}
                </h4>
                <div className="member-list-compact">
                  {offline.map((member) => (
                    <MemberRow
                      key={member.userId}
                      member={member}
                      onViewProfile={onViewProfile}
                      statusLabel={t("common.offline")}
                    />
                  ))}
                </div>
              </section>
            )}

            {online.length === 0 && offline.length === 0 && (
              <p className="muted-copy rail-empty-copy">{t("workspace.noMembers")}</p>
            )}
          </div>
        </>
      )}
    </aside>
  );
}

export default WorkspaceRail;
