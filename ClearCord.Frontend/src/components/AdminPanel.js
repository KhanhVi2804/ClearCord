import { useEffect, useMemo, useState } from "react";
import ModalShell from "./ModalShell";
import { useI18n } from "../i18n";
import { toAssetUrl } from "../services/api";

const PERMISSION_OPTIONS = [
  "ViewChannels",
  "SendMessages",
  "ManageMessages",
  "PinMessages",
  "ConnectToVoice",
  "ModerateVoice",
  "ManageChannels",
  "ManageRoles",
  "KickMembers",
  "BanMembers",
  "ManageServer"
];

function InlineCategoryEditor({
  category,
  onSave,
  onDelete
}) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    name: category.name,
    position: category.position
  });

  useEffect(() => {
    setForm({
      name: category.name,
      position: category.position
    });
  }, [category.name, category.position]);

  return (
    <form
      className="admin-inline-grid"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(category.id, {
          name: form.name,
          position: Number(form.position)
        });
      }}
    >
      <input
        type="text"
        value={form.name}
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            name: event.target.value
          }))
        }
        required
      />
      <input
        type="number"
        value={form.position}
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            position: event.target.value
          }))
        }
        required
      />
      <button type="submit" className="ghost-button compact">
        {t("common.save")}
      </button>
      <button type="button" className="ghost-button compact danger" onClick={() => onDelete(category.id)}>
        {t("common.delete")}
      </button>
    </form>
  );
}

function InlineChannelEditor({
  channel,
  categories,
  onSave,
  onDelete
}) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    name: channel.name,
    topic: channel.topic || "",
    position: channel.position,
    categoryId: channel.categoryId || "",
    type: channel.type
  });

  useEffect(() => {
    setForm({
      name: channel.name,
      topic: channel.topic || "",
      position: channel.position,
      categoryId: channel.categoryId || "",
      type: channel.type
    });
  }, [channel.categoryId, channel.name, channel.position, channel.topic, channel.type]);

  return (
    <form
      className="admin-inline-grid channel-edit-grid"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(channel.id, {
          name: form.name,
          topic: form.topic || null,
          position: Number(form.position),
          categoryId: form.categoryId || null
        });
      }}
    >
      <input
        type="text"
        value={form.name}
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            name: event.target.value
          }))
        }
        required
      />
      {categories.length > 0 && (
        <select
          value={form.categoryId}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              categoryId: event.target.value
            }))
          }
        >
          <option value="">{t("admin.noCategory")}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      )}
      <input
        type="text"
        value={form.topic}
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            topic: event.target.value
          }))
        }
        placeholder={form.type === "Voice" ? t("channel.voiceFallback") : t("channel.textFallback")}
      />
      <input
        type="number"
        value={form.position}
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            position: event.target.value
          }))
        }
        required
      />
      <button type="submit" className="ghost-button compact">
        {t("common.save")}
      </button>
      <button type="button" className="ghost-button compact danger" onClick={() => onDelete(channel.id)}>
        {t("common.delete")}
      </button>
    </form>
  );
}

function RoleBadge({ role }) {
  return (
    <span className="role-badge" style={{ borderColor: role.colorHex, color: role.colorHex }}>
      {role.name}
    </span>
  );
}

function AdminPanel({
  server,
  invite,
  permissions,
  onUpdateServer,
  onUploadServerIcon,
  onDeleteServer,
  onLeaveServer,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onCreateChannel,
  onUpdateChannel,
  onDeleteChannel,
  onCreateRole,
  onAssignRole,
  onRemoveRole,
  onKickMember,
  onBanMember
}) {
  const [serverForm, setServerForm] = useState({
    name: server?.name || "",
    description: server?.description || ""
  });
  const [newCategory, setNewCategory] = useState({
    name: "",
    position: (server?.categories?.length || 0) + 1
  });
  const [newChannel, setNewChannel] = useState({
    name: "",
    type: "Text",
    categoryId: "",
    topic: "",
    position: (server?.channels?.length || 0) + 1
  });
  const [newRole, setNewRole] = useState({
    name: "",
    colorHex: "#49C6B4",
    permissions: ["ViewChannels", "SendMessages", "ConnectToVoice"],
    isDefault: false
  });
  const [serverAction, setServerAction] = useState(null);
  const [moderationDialog, setModerationDialog] = useState(null);
  const [moderationReason, setModerationReason] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { t } = useI18n();

  const canManageServer = permissions.has("ManageServer");
  const canManageChannels = permissions.has("ManageChannels");
  const canManageRoles = permissions.has("ManageRoles");
  const canKickMembers = permissions.has("KickMembers");
  const canBanMembers = permissions.has("BanMembers");

  useEffect(() => {
    setServerForm({
      name: server?.name || "",
      description: server?.description || ""
    });
    setNewCategory({
      name: "",
      position: (server?.categories?.length || 0) + 1
    });
    setNewChannel({
      name: "",
      type: "Text",
      categoryId: "",
      topic: "",
      position: (server?.channels?.length || 0) + 1
    });
  }, [server?.channels?.length, server?.categories?.length, server?.description, server?.name]);

  const sortedMembers = useMemo(
    () => [...(server?.members || [])].sort((left, right) => left.displayName.localeCompare(right.displayName)),
    [server?.members]
  );
  const customCategories = useMemo(
    () => (server?.categories || []).filter((category) => category.name.trim().toLowerCase() !== "lobby"),
    [server?.categories]
  );
  const textChannels = useMemo(
    () =>
      [...(server?.channels || [])]
        .filter((channel) => channel.type === "Text")
        .sort((left, right) => left.position - right.position),
    [server?.channels]
  );
  const voiceChannels = useMemo(
    () =>
      [...(server?.channels || [])]
        .filter((channel) => channel.type === "Voice")
        .sort((left, right) => left.position - right.position),
    [server?.channels]
  );

  const serverInitials = useMemo(() => {
    if (!server?.name) return "S";
    return server.name
      .split(" ")
      .slice(0, 2)
      .map((chunk) => chunk[0])
      .join("")
      .toUpperCase();
  }, [server?.name]);

  const permissionLabel = (permission) => t(`permissions.${permission}`);
  const memberHasRole = (member, roleId) => member.roles.some((role) => role.id === roleId);

  if (!server) {
    return (
      <section className="feature-panel">
        <div className="empty-panel">
          <p>{t("admin.empty")}</p>
        </div>
      </section>
    );
  }

  async function runAction(action) {
    setError("");
    setSuccess("");

    try {
      await action();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function closeModerationDialog() {
    setModerationDialog(null);
    setModerationReason("");
  }

  return (
    <section className="feature-panel">
      <div className="feature-panel-header">
        <div>
          <p className="eyebrow">{t("admin.eyebrow")}</p>
          <h2>{t("admin.title")}</h2>
        </div>
      </div>

      <div className="feature-grid admin-grid">
        <form
          className="feature-card"
          onSubmit={(event) => {
            event.preventDefault();
            runAction(async () => {
              await onUpdateServer(server.id, serverForm);
              setSuccess(t("admin.serverUpdated"));
            });
          }}
        >
          <div className="section-heading">
            <h3>{t("admin.serverSettings")}</h3>
            <span className="mini-pill">{server.members.length} {t("common.members").toLowerCase()}</span>
          </div>

          <div className="profile-hero" style={{ marginBottom: "1.5rem", gap: "1.5rem", alignItems: "center" }}>
            <div className="profile-avatar-large" style={{ width: "80px", height: "80px", fontSize: "2rem" }}>
              {server.iconUrl ? (
                <img
                  src={toAssetUrl(server.iconUrl)}
                  alt={server.name}
                  className="avatar-image"
                />
              ) : (
                <span>{serverInitials}</span>
              )}
            </div>
            {canManageServer && (
              <label className="file-upload-button profile-upload" style={{ margin: 0 }}>
                {t("profile.uploadAvatar") || "Upload Icon"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }

                    runAction(async () => {
                      await onUploadServerIcon(server.id, file);
                      setSuccess(t("admin.iconUpdated") || "Server icon updated successfully.");
                    });
                    event.target.value = "";
                  }}
                />
              </label>
            )}
          </div>

          <label>
            {t("workspace.serverName")}
            <input
              type="text"
              value={serverForm.name}
              onChange={(event) =>
                setServerForm((current) => ({
                  ...current,
                  name: event.target.value
                }))
              }
              disabled={!canManageServer}
              required
            />
          </label>

          <label>
            {t("workspace.description")}
            <textarea
              value={serverForm.description}
              onChange={(event) =>
                setServerForm((current) => ({
                  ...current,
                  description: event.target.value
                }))
              }
              rows={4}
              disabled={!canManageServer}
            />
          </label>

          {invite && (
            <div className="invite-card">
              <strong>{t("admin.inviteCode")}</strong>
              <code>{invite.inviteCode}</code>
              <a href={invite.inviteUrl}>{invite.inviteUrl}</a>
            </div>
          )}

          <div className="inline-actions">
            <button type="submit" className="primary-button" disabled={!canManageServer}>
              {t("admin.saveServer")}
            </button>

            <button
              type="button"
              className="ghost-button"
              onClick={() => setServerAction("leave")}
            >
              {t("admin.leaveServer")}
            </button>

            <button
              type="button"
              className="ghost-button danger"
              disabled={!canManageServer}
              onClick={() => setServerAction("delete")}
            >
              {t("admin.deleteServer")}
            </button>
          </div>
        </form>

        <div className="feature-card">
          <div className="section-heading">
            <h3>{t("admin.categories")}</h3>
            <span className="mini-pill">{customCategories.length}</span>
          </div>

          <div className="list-stack">
            {customCategories.map((category) => (
              <InlineCategoryEditor
                key={category.id}
                category={category}
                onSave={(categoryId, payload) =>
                  runAction(async () => {
                    await onUpdateCategory(categoryId, payload);
                    setSuccess(t("admin.categoryUpdated"));
                  })
                }
                onDelete={(categoryId) =>
                  runAction(async () => {
                    await onDeleteCategory(categoryId);
                    setSuccess(t("admin.categoryDeleted"));
                  })
                }
              />
            ))}
            {customCategories.length === 0 && <p className="muted-copy">{t("admin.noCustomCategories")}</p>}
          </div>

          <form
            className="admin-category-form"
            onSubmit={(event) => {
              event.preventDefault();
              runAction(async () => {
                await onCreateCategory(server.id, {
                  name: newCategory.name,
                  position: Number(newCategory.position)
                });
                setNewCategory({
                  name: "",
                  position: customCategories.length + 1
                });
                setSuccess(t("admin.categoryCreated"));
              });
            }}
          >
            <input
              type="text"
              value={newCategory.name}
              onChange={(event) =>
                setNewCategory((current) => ({
                  ...current,
                  name: event.target.value
                }))
              }
              placeholder={t("admin.newCategory")}
              disabled={!canManageChannels}
              required
            />
            <input
              type="number"
              value={newCategory.position}
              onChange={(event) =>
                setNewCategory((current) => ({
                  ...current,
                  position: event.target.value
                }))
              }
              disabled={!canManageChannels}
              required
            />
            <button type="submit" className="primary-button compact" disabled={!canManageChannels}>
              {t("admin.addCategory")}
            </button>
          </form>
        </div>

        <div className="feature-card admin-span-2">
          <div className="section-heading">
            <h3>{t("admin.channels")}</h3>
            <span className="mini-pill">{server.channels.length}</span>
          </div>

          <div className="admin-channel-groups">
            <section className="admin-channel-group">
              <header className="admin-channel-group-header">
                <h4>{t("workspace.textChannels")}</h4>
                <span className="mini-pill">{textChannels.length}</span>
              </header>
              <div className="list-stack">
                {textChannels.map((channel) => (
                  <InlineChannelEditor
                    key={channel.id}
                    channel={channel}
                    categories={customCategories}
                    onSave={(channelId, payload) =>
                      runAction(async () => {
                        await onUpdateChannel(channelId, payload);
                        setSuccess(t("admin.channelUpdated"));
                      })
                    }
                    onDelete={(channelId) =>
                      runAction(async () => {
                        await onDeleteChannel(channelId);
                        setSuccess(t("admin.channelDeleted"));
                      })
                    }
                  />
                ))}
                {textChannels.length === 0 && <p className="muted-copy">{t("admin.noTextChannels")}</p>}
              </div>
            </section>

            <section className="admin-channel-group">
              <header className="admin-channel-group-header">
                <h4>{t("workspace.voiceChannels")}</h4>
                <span className="mini-pill">{voiceChannels.length}</span>
              </header>
              <div className="list-stack">
                {voiceChannels.map((channel) => (
                  <InlineChannelEditor
                    key={channel.id}
                    channel={channel}
                    categories={customCategories}
                    onSave={(channelId, payload) =>
                      runAction(async () => {
                        await onUpdateChannel(channelId, payload);
                        setSuccess(t("admin.channelUpdated"));
                      })
                    }
                    onDelete={(channelId) =>
                      runAction(async () => {
                        await onDeleteChannel(channelId);
                        setSuccess(t("admin.channelDeleted"));
                      })
                    }
                  />
                ))}
                {voiceChannels.length === 0 && <p className="muted-copy">{t("admin.noVoiceChannels")}</p>}
              </div>
            </section>
          </div>

          <form
            className="admin-create-channel"
            onSubmit={(event) => {
              event.preventDefault();
              runAction(async () => {
                await onCreateChannel(server.id, {
                  name: newChannel.name,
                  type: newChannel.type,
                  categoryId: newChannel.categoryId || null,
                  topic: newChannel.topic || null,
                  position: Number(newChannel.position)
                });
                setNewChannel({
                  name: "",
                  type: "Text",
                  categoryId: "",
                  topic: "",
                  position: server.channels.length + 2
                });
                setSuccess(t("admin.channelCreated"));
              });
            }}
          >
            <label>
              {t("admin.channelName")}
              <input
                type="text"
                value={newChannel.name}
                onChange={(event) =>
                  setNewChannel((current) => ({
                    ...current,
                    name: event.target.value
                  }))
                }
                disabled={!canManageChannels}
                required
              />
            </label>

            <label>
              {t("admin.type")}
              <select
                value={newChannel.type}
                onChange={(event) =>
                  setNewChannel((current) => ({
                    ...current,
                    type: event.target.value
                  }))
                }
                disabled={!canManageChannels}
              >
                <option value="Text">{t("channel.textType")}</option>
                <option value="Voice">{t("channel.voiceType")}</option>
              </select>
            </label>

            {customCategories.length > 0 && (
              <label>
                {t("admin.category")}
                <select
                  value={newChannel.categoryId}
                  onChange={(event) =>
                    setNewChannel((current) => ({
                      ...current,
                      categoryId: event.target.value
                    }))
                  }
                  disabled={!canManageChannels}
                >
                  <option value="">{t("admin.noCategory")}</option>
                  {customCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label>
              {t("admin.topic")}
              <input
                type="text"
                value={newChannel.topic}
                onChange={(event) =>
                  setNewChannel((current) => ({
                    ...current,
                    topic: event.target.value
                  }))
                }
                disabled={!canManageChannels}
              />
            </label>

            <label>
              {t("admin.position")}
              <input
                type="number"
                value={newChannel.position}
                onChange={(event) =>
                  setNewChannel((current) => ({
                    ...current,
                    position: event.target.value
                  }))
                }
                disabled={!canManageChannels}
                required
              />
            </label>

            <button type="submit" className="primary-button" disabled={!canManageChannels}>
              {t("admin.createChannel")}
            </button>
          </form>
        </div>

        <div className="feature-card">
          <div className="section-heading">
            <h3>{t("admin.roles")}</h3>
            <span className="mini-pill">{server.roles.length}</span>
          </div>

          <div className="role-list">
            {server.roles.map((role) => (
              <div key={role.id} className="role-card">
                <RoleBadge role={role} />
                <p>{role.permissions.map(permissionLabel).join(", ")}</p>
              </div>
            ))}
          </div>

          <form
            className="role-form"
            onSubmit={(event) => {
              event.preventDefault();
              runAction(async () => {
                await onCreateRole(server.id, newRole);
                setNewRole({
                  name: "",
                  colorHex: "#49C6B4",
                  permissions: ["ViewChannels", "SendMessages", "ConnectToVoice"],
                  isDefault: false
                });
                setSuccess(t("admin.roleCreated"));
              });
            }}
          >
            <label>
              {t("admin.roleName")}
              <input
                type="text"
                value={newRole.name}
                onChange={(event) =>
                  setNewRole((current) => ({
                    ...current,
                    name: event.target.value
                  }))
                }
                disabled={!canManageRoles}
                required
              />
            </label>

            <label>
              {t("admin.color")}
              <input
                type="color"
                value={newRole.colorHex}
                onChange={(event) =>
                  setNewRole((current) => ({
                    ...current,
                    colorHex: event.target.value
                  }))
                }
                disabled={!canManageRoles}
              />
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={newRole.isDefault}
                onChange={(event) =>
                  setNewRole((current) => ({
                    ...current,
                    isDefault: event.target.checked
                  }))
                }
                disabled={!canManageRoles}
              />
              {t("admin.defaultRole")}
            </label>

            <div className="permission-grid">
              {PERMISSION_OPTIONS.map((permission) => (
                <label key={permission} className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={newRole.permissions.includes(permission)}
                    onChange={(event) =>
                      setNewRole((current) => ({
                        ...current,
                        permissions: event.target.checked
                          ? [...current.permissions, permission]
                          : current.permissions.filter((value) => value !== permission)
                      }))
                    }
                    disabled={!canManageRoles}
                  />
                  {permissionLabel(permission)}
                </label>
              ))}
            </div>

            <button type="submit" className="primary-button" disabled={!canManageRoles}>
              {t("admin.createRole")}
            </button>
          </form>
        </div>

        <div className="feature-card admin-span-2">
          <div className="section-heading">
            <h3>{t("admin.members")}</h3>
            <span className="mini-pill">{server.members.length}</span>
          </div>

          <p className="muted-copy">{t("admin.roleEditorHint")}</p>

          <div className="list-stack">
            {sortedMembers.map((member) => (
              <div key={member.userId} className="member-row">
                <div>
                  <strong>{member.displayName}</strong>
                  <p>@{member.userName}</p>
                  <div className="member-role-toggle-list">
                    {server.roles.map((role) => {
                      const isAssigned = memberHasRole(member, role.id);
                      const isLocked = role.isDefault || role.isSystemRole;

                      return (
                        <label key={role.id} className={`role-toggle ${isAssigned ? "active" : ""}`}>
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            disabled={!canManageRoles || isLocked}
                            onChange={(event) =>
                              runAction(async () => {
                                if (event.target.checked) {
                                  await onAssignRole(server.id, role.id, member.userId);
                                  setSuccess(t("admin.roleUpdated"));
                                } else {
                                  await onRemoveRole(server.id, role.id, member.userId);
                                  setSuccess(t("admin.roleUpdated"));
                                }
                              })
                            }
                          />
                          <span style={{ borderColor: role.colorHex, color: role.colorHex }}>
                            {role.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="inline-actions">
                  {canKickMembers && (
                    <button
                      type="button"
                      className="ghost-button compact"
                      onClick={() => {
                        setModerationReason("");
                        setModerationDialog({
                          action: "kick",
                          member
                        });
                      }}
                    >
                      {t("admin.kick")}
                    </button>
                  )}

                  {canBanMembers && (
                    <button
                      type="button"
                      className="ghost-button compact danger"
                      onClick={() => {
                        setModerationReason("");
                        setModerationDialog({
                          action: "ban",
                          member
                        });
                      }}
                    >
                      {t("admin.ban")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}
      {success && <p className="form-success">{success}</p>}

      {serverAction && (
        <ModalShell
          title={serverAction === "delete" ? t("admin.deleteServer") : t("admin.leaveServer")}
          subtitle={t("admin.confirmation")}
          onClose={() => setServerAction(null)}
        >
          <div className="auth-stack">
            <p className="muted-copy">
              {serverAction === "delete"
                ? t("admin.deleteServerConfirm")
                : t("admin.leaveServerConfirm")}
            </p>
            <div className="inline-actions">
              <button
                type="button"
                className={`primary-button ${serverAction === "delete" ? "danger-action" : ""}`}
                onClick={() =>
                  runAction(async () => {
                    if (serverAction === "delete") {
                      await onDeleteServer(server.id);
                    } else {
                      await onLeaveServer(server.id);
                    }

                    setServerAction(null);
                  })
                }
              >
                {serverAction === "delete" ? t("admin.deleteServer") : t("admin.leaveServer")}
              </button>
              <button type="button" className="ghost-button" onClick={() => setServerAction(null)}>
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {moderationDialog && (
        <ModalShell
          title={moderationDialog.action === "ban" ? t("admin.banMember") : t("admin.kickMember")}
          subtitle={t("admin.moderation")}
          onClose={closeModerationDialog}
        >
          <form
            className="auth-stack"
            onSubmit={(event) => {
              event.preventDefault();
              runAction(async () => {
                if (moderationDialog.action === "ban") {
                  await onBanMember(server.id, moderationDialog.member.userId, moderationReason);
                  setSuccess(t("admin.memberBanned"));
                } else {
                  await onKickMember(server.id, moderationDialog.member.userId, moderationReason);
                  setSuccess(t("admin.memberKicked"));
                }

                closeModerationDialog();
              });
            }}
          >
            <p className="muted-copy">
              {t("admin.moderationNotice", {
                member: moderationDialog.member.displayName,
                action: moderationDialog.action === "ban" ? t("admin.actionBannedFrom") : t("admin.actionRemovedFrom")
              })}
            </p>

            <label>
              {t("admin.reason")}
              <textarea
                value={moderationReason}
                onChange={(event) => setModerationReason(event.target.value)}
                rows={4}
                placeholder={t("admin.optionalReason")}
              />
            </label>

            <div className="inline-actions">
              <button type="submit" className="primary-button danger-action">
                {moderationDialog.action === "ban" ? t("admin.banMember") : t("admin.kickMember")}
              </button>
              <button type="button" className="ghost-button" onClick={closeModerationDialog}>
                {t("common.cancel")}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </section>
  );
}

export default AdminPanel;
