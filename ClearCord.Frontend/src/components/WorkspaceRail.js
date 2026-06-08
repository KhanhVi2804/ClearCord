import { useMemo } from "react";
import { toAssetUrl } from "../services/api";
import { useI18n } from "../i18n";

function MemberRow({ member, onViewProfile }) {
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
      {topRole ? <span className="member-role-dot" style={{ background: topRole.colorHex }} /> : null}
    </button>
  );
}

function WorkspaceRail({ server, onViewProfile }) {
  const { t } = useI18n();

  const { online, offline, roleGroups } = useMemo(() => {
    const members = [...(server?.members ?? [])].sort((left, right) =>
      (left.nickname || left.displayName).localeCompare(right.nickname || right.displayName)
    );
    const onlineMembers = members.filter((member) => member.isOnline);
    const grouped = new Map();

    onlineMembers.forEach((member) => {
      const role = member.roles?.[0];
      const groupName = role?.name || t("common.online");
      const groupColor = role?.colorHex || "#23a559";
      const group = grouped.get(groupName) || { name: groupName, color: groupColor, members: [] };

      group.members.push(member);
      grouped.set(groupName, group);
    });

    return {
      online: onlineMembers,
      offline: members.filter((member) => !member.isOnline),
      roleGroups: Array.from(grouped.values())
    };
  }, [server?.members, t]);

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
            {roleGroups.map((group) => (
              <section className="member-group" key={group.name}>
                <h4>
                  <span className="member-group-color" style={{ background: group.color }} />
                  {group.name} - {group.members.length}
                </h4>
                <div className="member-list-compact">
                  {group.members.map((member) => (
                    <MemberRow key={member.userId} member={member} onViewProfile={onViewProfile} />
                  ))}
                </div>
              </section>
            ))}

            {offline.length > 0 && (
              <section className="member-group">
                <h4>
                  {t("common.offline")} - {offline.length}
                </h4>
                <div className="member-list-compact">
                  {offline.map((member) => (
                    <MemberRow key={member.userId} member={member} onViewProfile={onViewProfile} />
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
