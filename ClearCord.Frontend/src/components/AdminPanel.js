import { useEffect, useMemo, useState } from "react";
import ModalShell from "./ModalShell";

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
        Save
      </button>
      <button type="button" className="ghost-button compact danger" onClick={() => onDelete(category.id)}>
        Delete
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
      <select
        value={form.categoryId}
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            categoryId: event.target.value
          }))
        }
      >
        <option value="">No category</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <input
        type="text"
        value={form.topic}
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            topic: event.target.value
          }))
        }
        placeholder={form.type === "Voice" ? "Voice topic" : "Text topic"}
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
        Save
      </button>
      <button type="button" className="ghost-button compact danger" onClick={() => onDelete(channel.id)}>
        Delete
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
  const [assignmentTarget, setAssignmentTarget] = useState({
    userId: "",
    roleId: ""
  });
  const [serverAction, setServerAction] = useState(null);
  const [moderationDialog, setModerationDialog] = useState(null);
  const [moderationReason, setModerationReason] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
    setAssignmentTarget({
      userId: "",
      roleId: ""
    });
  }, [server?.channels?.length, server?.categories?.length, server?.description, server?.name]);

  const sortedMembers = useMemo(
    () => [...(server?.members || [])].sort((left, right) => left.displayName.localeCompare(right.displayName)),
    [server?.members]
  );

  if (!server) {
    return (
      <section className="feature-panel">
        <div className="empty-panel">
          <p>Select a server to manage its settings, channels, roles, and members.</p>
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
          <p className="eyebrow">Admin</p>
          <h2>Server, channel, role, and moderation tools</h2>
        </div>
      </div>

      <div className="feature-grid admin-grid">
        <form
          className="feature-card"
          onSubmit={(event) => {
            event.preventDefault();
            runAction(async () => {
              await onUpdateServer(server.id, serverForm);
              setSuccess("Server updated.");
            });
          }}
        >
          <div className="section-heading">
            <h3>Server settings</h3>
            <span className="mini-pill">{server.members.length} members</span>
          </div>

          <label>
            Server name
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
            Description
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
              <strong>Invite code</strong>
              <code>{invite.inviteCode}</code>
              <a href={invite.inviteUrl}>{invite.inviteUrl}</a>
            </div>
          )}

          <div className="inline-actions">
            <button type="submit" className="primary-button" disabled={!canManageServer}>
              Save server
            </button>

            <button
              type="button"
              className="ghost-button"
              onClick={() => setServerAction("leave")}
            >
              Leave server
            </button>

            <button
              type="button"
              className="ghost-button danger"
              disabled={!canManageServer}
              onClick={() => setServerAction("delete")}
            >
              Delete server
            </button>
          </div>
        </form>

        <div className="feature-card">
          <div className="section-heading">
            <h3>Categories</h3>
            <span className="mini-pill">{server.categories.length}</span>
          </div>

          <div className="list-stack">
            {server.categories.map((category) => (
              <InlineCategoryEditor
                key={category.id}
                category={category}
                onSave={(categoryId, payload) =>
                  runAction(async () => {
                    await onUpdateCategory(categoryId, payload);
                    setSuccess("Category updated.");
                  })
                }
                onDelete={(categoryId) =>
                  runAction(async () => {
                    await onDeleteCategory(categoryId);
                    setSuccess("Category deleted.");
                  })
                }
              />
            ))}
          </div>

          <form
            className="admin-inline-grid"
            onSubmit={(event) => {
              event.preventDefault();
              runAction(async () => {
                await onCreateCategory(server.id, {
                  name: newCategory.name,
                  position: Number(newCategory.position)
                });
                setNewCategory({
                  name: "",
                  position: server.categories.length + 2
                });
                setSuccess("Category created.");
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
              placeholder="New category"
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
              Add category
            </button>
          </form>
        </div>

        <div className="feature-card admin-span-2">
          <div className="section-heading">
            <h3>Channels</h3>
            <span className="mini-pill">{server.channels.length}</span>
          </div>

          <div className="list-stack">
            {server.channels.map((channel) => (
              <InlineChannelEditor
                key={channel.id}
                channel={channel}
                categories={server.categories}
                onSave={(channelId, payload) =>
                  runAction(async () => {
                    await onUpdateChannel(channelId, payload);
                    setSuccess("Channel updated.");
                  })
                }
                onDelete={(channelId) =>
                  runAction(async () => {
                    await onDeleteChannel(channelId);
                    setSuccess("Channel deleted.");
                  })
                }
              />
            ))}
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
                setSuccess("Channel created.");
              });
            }}
          >
            <label>
              Channel name
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
              Type
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
                <option value="Text">Text</option>
                <option value="Voice">Voice</option>
              </select>
            </label>

            <label>
              Category
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
                <option value="">No category</option>
                {server.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Topic
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
              Position
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
              Create channel
            </button>
          </form>
        </div>

        <div className="feature-card">
          <div className="section-heading">
            <h3>Roles</h3>
            <span className="mini-pill">{server.roles.length}</span>
          </div>

          <div className="role-list">
            {server.roles.map((role) => (
              <div key={role.id} className="role-card">
                <RoleBadge role={role} />
                <p>{role.permissions.join(", ")}</p>
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
                setSuccess("Role created.");
              });
            }}
          >
            <label>
              Role name
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
              Color
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
              Default role for new members
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
                  {permission}
                </label>
              ))}
            </div>

            <button type="submit" className="primary-button" disabled={!canManageRoles}>
              Create role
            </button>
          </form>
        </div>

        <div className="feature-card admin-span-2">
          <div className="section-heading">
            <h3>Members</h3>
            <span className="mini-pill">{server.members.length}</span>
          </div>

          <div className="member-management-bar">
            <select
              value={assignmentTarget.userId}
              onChange={(event) =>
                setAssignmentTarget((current) => ({
                  ...current,
                  userId: event.target.value
                }))
              }
              disabled={!canManageRoles}
            >
              <option value="">Select member</option>
              {sortedMembers.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.displayName}
                </option>
              ))}
            </select>

            <select
              value={assignmentTarget.roleId}
              onChange={(event) =>
                setAssignmentTarget((current) => ({
                  ...current,
                  roleId: event.target.value
                }))
              }
              disabled={!canManageRoles}
            >
              <option value="">Select role</option>
              {server.roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="primary-button compact"
              disabled={!canManageRoles || !assignmentTarget.userId || !assignmentTarget.roleId}
              onClick={() =>
                runAction(async () => {
                  await onAssignRole(server.id, assignmentTarget.roleId, assignmentTarget.userId);
                  setSuccess("Role assigned.");
                })
              }
            >
              Assign role
            </button>
          </div>

          <div className="list-stack">
            {sortedMembers.map((member) => (
              <div key={member.userId} className="member-row">
                <div>
                  <strong>{member.displayName}</strong>
                  <p>@{member.userName}</p>
                  <div className="inline-actions wrap">
                    {member.roles.map((role) => (
                      <RoleBadge key={role.id} role={role} />
                    ))}
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
                      Kick
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
                      Ban
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
          title={serverAction === "delete" ? "Delete server" : "Leave server"}
          subtitle="Confirmation"
          onClose={() => setServerAction(null)}
        >
          <div className="auth-stack">
            <p className="muted-copy">
              {serverAction === "delete"
                ? "This permanently removes the server and its channels."
                : "You will leave this server and lose direct access until you join again."}
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
                {serverAction === "delete" ? "Delete server" : "Leave server"}
              </button>
              <button type="button" className="ghost-button" onClick={() => setServerAction(null)}>
                Cancel
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {moderationDialog && (
        <ModalShell
          title={moderationDialog.action === "ban" ? "Ban member" : "Kick member"}
          subtitle="Moderation"
          onClose={closeModerationDialog}
        >
          <form
            className="auth-stack"
            onSubmit={(event) => {
              event.preventDefault();
              runAction(async () => {
                if (moderationDialog.action === "ban") {
                  await onBanMember(server.id, moderationDialog.member.userId, moderationReason);
                  setSuccess("Member banned.");
                } else {
                  await onKickMember(server.id, moderationDialog.member.userId, moderationReason);
                  setSuccess("Member kicked.");
                }

                closeModerationDialog();
              });
            }}
          >
            <p className="muted-copy">
              {moderationDialog.member.displayName} will be {moderationDialog.action === "ban" ? "banned from" : "removed from"} this server.
            </p>

            <label>
              Reason
              <textarea
                value={moderationReason}
                onChange={(event) => setModerationReason(event.target.value)}
                rows={4}
                placeholder="Optional moderation note"
              />
            </label>

            <div className="inline-actions">
              <button type="submit" className="primary-button danger-action">
                {moderationDialog.action === "ban" ? "Ban member" : "Kick member"}
              </button>
              <button type="button" className="ghost-button" onClick={closeModerationDialog}>
                Cancel
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </section>
  );
}

export default AdminPanel;
