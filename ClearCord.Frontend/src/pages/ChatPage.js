import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import AdminPanel from "../components/AdminPanel";
import ChannelList from "../components/ChannelList";
import ChatBox from "../components/ChatBox";
import FriendsPanel from "../components/FriendsPanel";
import ModalShell from "../components/ModalShell";
import NotificationsPanel from "../components/NotificationsPanel";
import ProfilePanel from "../components/ProfilePanel";
import Sidebar from "../components/Sidebar";
import UserProfileModal from "../components/UserProfileModal";
import VoicePanel from "../components/VoicePanel";
import WorkspaceTab from "../components/WorkspaceTab";
import {
  channelApi,
  friendApi,
  messageApi,
  notificationApi,
  serverApi,
  updateStoredUser,
  userApi
} from "../services/api";
import { chatSignalR } from "../services/signalr";
import {
  computePermissions,
  markMessageDeleted,
  resolveTypingUsers,
  sortNotifications,
  updatePresenceInUsers,
  upsertMessage
} from "./chatHelpers";

function ChatPage({
  currentUser,
  inviteCode,
  onCurrentUserChange,
  onInviteConsumed,
  onLogout
}) {
  const [servers, setServers] = useState([]);
  const [selectedServerId, setSelectedServerId] = useState(null);
  const [selectedServer, setSelectedServer] = useState(null);
  const [serverInvite, setServerInvite] = useState(null);
  const [selectedTextChannelId, setSelectedTextChannelId] = useState(null);
  const [activeVoiceChannelId, setActiveVoiceChannelId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isServersLoading, setIsServersLoading] = useState(true);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isFriendsLoading, setIsFriendsLoading] = useState(true);
  const [serversError, setServersError] = useState("");
  const [messageError, setMessageError] = useState("");
  const [socialError, setSocialError] = useState("");
  const [sendError, setSendError] = useState("");
  const [connectionState, setConnectionState] = useState(chatSignalR.getConnectionState());
  const [activeView, setActiveView] = useState("chat");
  const [isCreateServerVisible, setIsCreateServerVisible] = useState(false);
  const [createServerForm, setCreateServerForm] = useState({
    name: "",
    description: ""
  });
  const [isCreatingServer, setIsCreatingServer] = useState(false);
  const [isJoinServerVisible, setIsJoinServerVisible] = useState(false);
  const [joinInviteCode, setJoinInviteCode] = useState(inviteCode || "");
  const [isJoiningServer, setIsJoiningServer] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [typingUsersMap, setTypingUsersMap] = useState(new Map());
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  const [isUserProfileVisible, setIsUserProfileVisible] = useState(false);
  const [isUserProfileLoading, setIsUserProfileLoading] = useState(false);
  const [userProfileError, setUserProfileError] = useState("");
  const previousTextChannelIdRef = useRef(null);
  const processedInviteCodeRef = useRef(null);

  const currentTextChannel = useMemo(
    () => selectedServer?.channels?.find((channel) => channel.id === selectedTextChannelId) ?? null,
    [selectedServer, selectedTextChannelId]
  );

  const currentVoiceChannel = useMemo(
    () => selectedServer?.channels?.find((channel) => channel.id === activeVoiceChannelId) ?? null,
    [activeVoiceChannelId, selectedServer]
  );

  const permissions = useMemo(
    () => computePermissions(selectedServer, currentUser.id),
    [currentUser.id, selectedServer]
  );

  const unreadNotificationCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  const typingUsers = useMemo(
    () =>
      resolveTypingUsers(
        typingUsersMap,
        currentUser,
        friends,
        friendRequests,
        searchResults,
        selectedServer
      ).filter((user) => user.id !== currentUser.id),
    [currentUser, friendRequests, friends, searchResults, selectedServer, typingUsersMap]
  );

  const canSeeAdmin = useMemo(
    () =>
      ["ManageServer", "ManageChannels", "ManageRoles", "KickMembers", "BanMembers"].some((permission) =>
        permissions.has(permission)
      ),
    [permissions]
  );

  useEffect(() => {
    chatSignalR.start().catch((error) => {
      console.warn("Failed to start SignalR eagerly.", error);
    });
  }, []);

  useEffect(() => {
    const unsubscribeConnection = chatSignalR.onConnectionStateChanged(setConnectionState);
    const unsubscribeCreated = chatSignalR.onMessageCreated((incomingMessage) => {
      if (incomingMessage.channelId === selectedTextChannelId) {
        setMessages((current) => upsertMessage(current, incomingMessage));
      }
    });
    const unsubscribeUpdated = chatSignalR.onMessageUpdated((incomingMessage) => {
      if (incomingMessage.channelId === selectedTextChannelId) {
        setMessages((current) => upsertMessage(current, incomingMessage));
      }
    });
    const unsubscribeDeleted = chatSignalR.onMessageDeleted(({ messageId }) => {
      setMessages((current) => markMessageDeleted(current, messageId));
    });
    const unsubscribeReactions = chatSignalR.onMessageReactionChanged((incomingMessage) => {
      if (incomingMessage.channelId === selectedTextChannelId) {
        setMessages((current) => upsertMessage(current, incomingMessage));
      }
    });
    const unsubscribePinned = chatSignalR.onMessagePinnedChanged((incomingMessage) => {
      if (incomingMessage.channelId === selectedTextChannelId) {
        setMessages((current) => upsertMessage(current, incomingMessage));
      }
    });
    const unsubscribeNotifications = chatSignalR.onNotificationCreated((notification) => {
      setNotifications((current) => sortNotifications([notification, ...current]));

      if (notification.type === "FriendRequest") {
        refreshFriendsAndRequests().catch((error) => {
          setSocialError(error.message);
        });
      }
    });
    const unsubscribePresence = chatSignalR.onPresenceChanged((payload) => {
      if (payload.userId === currentUser.id) {
        const updatedUser = {
          ...currentUser,
          isOnline: payload.isOnline,
          lastSeenAt: payload.lastSeenAt
        };
        onCurrentUserChange(updatedUser);
        updateStoredUser(updatedUser);
      }

      setFriends((current) => updatePresenceInUsers(current, payload, (friend) => friend.userId));
      setSearchResults((current) => updatePresenceInUsers(current, payload));
      setFriendRequests((current) =>
        current.map((request) =>
          request.user.id === payload.userId
            ? { ...request, user: { ...request.user, isOnline: payload.isOnline } }
            : request
        )
      );
    });
    const unsubscribeTyping = chatSignalR.onTypingChanged((payload) => {
      if (payload.channelId === selectedTextChannelId && payload.userId !== currentUser.id) {
        setTypingUsersMap((current) => new Map(current).set(payload.userId, payload.isTyping));
      }
    });

    return () => {
      unsubscribeConnection();
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDeleted();
      unsubscribeReactions();
      unsubscribePinned();
      unsubscribeNotifications();
      unsubscribePresence();
      unsubscribeTyping();
    };
  }, [currentUser, onCurrentUserChange, selectedTextChannelId]);

  useEffect(() => {
    let isMounted = true;

    async function loadBootData() {
      setIsServersLoading(true);
      setIsFriendsLoading(true);
      setServersError("");
      setSocialError("");

      try {
        const [serverList, nextFriends, nextRequests, nextNotifications] = await Promise.all([
          serverApi.getServers(),
          friendApi.getFriends(),
          friendApi.getRequests(),
          notificationApi.getMine()
        ]);

        if (!isMounted) {
          return;
        }

        setServers(serverList);
        setFriends(nextFriends);
        setFriendRequests(nextRequests);
        setNotifications(sortNotifications(nextNotifications));
        setSelectedServerId((current) =>
          current && serverList.some((server) => server.id === current)
            ? current
            : serverList[0]?.id ?? null
        );
      } catch (error) {
        if (isMounted) {
          setServersError(error.message);
          setSocialError(error.message);
        }
      } finally {
        if (isMounted) {
          setIsServersLoading(false);
          setIsFriendsLoading(false);
        }
      }
    }

    loadBootData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadServerDetails() {
      if (!selectedServerId) {
        setSelectedServer(null);
        setServerInvite(null);
        setSelectedTextChannelId(null);
        setActiveVoiceChannelId(null);
        setMessages([]);
        return;
      }

      setSelectedServer(null);
      setMessages([]);
      setServerInvite(null);

      try {
        const [serverDetails, invite] = await Promise.all([
          serverApi.getServerDetails(selectedServerId),
          serverApi.getInvite(selectedServerId)
        ]);

        if (!isMounted) {
          return;
        }

        await chatSignalR.joinServer(selectedServerId);

        startTransition(() => {
          setSelectedServer(serverDetails);
          setServerInvite(invite);

          const textChannels = serverDetails.channels.filter((channel) => channel.type === "Text");
          const voiceChannels = serverDetails.channels.filter((channel) => channel.type === "Voice");

          setSelectedTextChannelId((current) =>
            textChannels.some((channel) => channel.id === current)
              ? current
              : textChannels[0]?.id ?? null
          );

          setActiveVoiceChannelId((current) =>
            voiceChannels.some((channel) => channel.id === current)
              ? current
              : voiceChannels[0]?.id ?? null
          );
        });
      } catch (error) {
        if (isMounted) {
          setServersError(error.message);
        }
      }
    }

    loadServerDetails();

    return () => {
      isMounted = false;
    };
  }, [selectedServerId]);

  useEffect(() => {
    let isMounted = true;

    async function syncChannelState() {
      setSendError("");
      setMessageError("");
      setTypingUsersMap(new Map());
      setReplyToMessage(null);
      setEditingMessageId(null);

      if (previousTextChannelIdRef.current && previousTextChannelIdRef.current !== selectedTextChannelId) {
        try {
          await chatSignalR.leaveChannel(previousTextChannelIdRef.current);
        } catch (error) {
          console.warn("Failed to leave previous channel.", error);
        }
      }

      if (!selectedTextChannelId) {
        previousTextChannelIdRef.current = null;
        setMessages([]);
        return;
      }

      setIsMessagesLoading(true);

      try {
        await chatSignalR.joinChannel(selectedTextChannelId);
        const channelMessages = await messageApi.getChannelMessages(selectedTextChannelId);

        if (isMounted) {
          previousTextChannelIdRef.current = selectedTextChannelId;
          setMessages(channelMessages);
        }
      } catch (error) {
        if (isMounted) {
          setMessageError(error.message);
        }
      } finally {
        if (isMounted) {
          setIsMessagesLoading(false);
        }
      }
    }

    syncChannelState();

    return () => {
      isMounted = false;
    };
  }, [selectedTextChannelId]);

  useEffect(() => {
    if (!inviteCode || processedInviteCodeRef.current === inviteCode) {
      return;
    }

    processedInviteCodeRef.current = inviteCode;
    setJoinInviteCode(inviteCode);
    handleJoinServer(inviteCode, true).catch((error) => {
      setServersError(error.message);
    });
  }, [inviteCode]);

  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setSearchResults([]);
      return undefined;
    }

    let isMounted = true;
    const timeoutId = window.setTimeout(async () => {
      try {
        const users = await userApi.search(searchTerm);
        if (isMounted) {
          setSearchResults(users);
        }
      } catch (error) {
        if (isMounted) {
          setSocialError(error.message);
        }
      }
    }, 250);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [searchTerm]);

  async function refreshServers(selectServerId) {
    const nextServers = await serverApi.getServers();
    setServers(nextServers);
    setSelectedServerId((current) => {
      if (selectServerId && nextServers.some((server) => server.id === selectServerId)) {
        return selectServerId;
      }

      if (current && nextServers.some((server) => server.id === current)) {
        return current;
      }

      return nextServers[0]?.id ?? null;
    });
  }

  async function refreshSelectedServer(preferredServerId = selectedServerId) {
    if (!preferredServerId) {
      return;
    }

    const [serverDetails, invite] = await Promise.all([
      serverApi.getServerDetails(preferredServerId),
      serverApi.getInvite(preferredServerId)
    ]);

    setSelectedServer(serverDetails);
    setServerInvite(invite);
  }

  async function refreshFriendsAndRequests() {
    const [nextFriends, nextRequests] = await Promise.all([
      friendApi.getFriends(),
      friendApi.getRequests()
    ]);

    setFriends(nextFriends);
    setFriendRequests(nextRequests);
  }

  useEffect(() => {
    if (activeView !== "friends") {
      return;
    }

    refreshFriendsAndRequests().catch((error) => {
      setSocialError(error.message);
    });
  }, [activeView]);

  async function handleSendMessage({ content, files, replyToMessageId }) {
    setSendError("");

    try {
      if (files?.length > 0) {
        await messageApi.createMessageWithFiles(selectedTextChannelId, {
          content,
          replyToMessageId,
          files
        });
      } else {
        await chatSignalR.sendMessage({
          channelId: selectedTextChannelId,
          content,
          replyToMessageId
        });
      }

      setReplyToMessage(null);
    } catch (error) {
      setSendError(error.message);
      throw error;
    }
  }

  async function handleCreateServer(event) {
    event.preventDefault();
    setIsCreatingServer(true);
    setServersError("");

    try {
      const createdServer = await serverApi.createServer({
        name: createServerForm.name,
        description: createServerForm.description || null
      });

      await refreshServers(createdServer.id);
      setIsCreateServerVisible(false);
      setCreateServerForm({ name: "", description: "" });
    } catch (error) {
      setServersError(error.message);
    } finally {
      setIsCreatingServer(false);
    }
  }

  async function handleJoinServer(inviteCodeOverride, silent = false) {
    const code = (inviteCodeOverride ?? joinInviteCode).trim();
    if (!code) {
      return;
    }

    setIsJoiningServer(true);
    if (!silent) {
      setServersError("");
    }

    try {
      const joinedServer = await serverApi.joinServer(code);
      await refreshServers(joinedServer.id);
      setSelectedServerId(joinedServer.id);
      setIsJoinServerVisible(false);
      setJoinInviteCode("");
      onInviteConsumed?.();
    } finally {
      setIsJoiningServer(false);
    }
  }

  function handleSelectChannel(channel) {
    if (channel.type === "Voice") {
      setActiveVoiceChannelId(channel.id);
      setActiveView("voice");
      return;
    }

    setSelectedTextChannelId(channel.id);
    setActiveView("chat");
  }

  async function handleSaveEditedMessage(message, draft) {
    const updatedMessage = await messageApi.updateMessage(message.id, {
      content: draft
    });
    setMessages((current) => upsertMessage(current, updatedMessage));
    setEditingMessageId(null);
  }

  async function handleDeleteMessage(message) {
    await messageApi.deleteMessage(message.id);
    setMessages((current) => markMessageDeleted(current, message.id));
  }

  async function handleTogglePin(message) {
    const updatedMessage = await messageApi.togglePin(message.id);
    setMessages((current) => upsertMessage(current, updatedMessage));
  }

  async function handleToggleReaction(message, emoji, reactedByCurrentUser) {
    const updatedMessage = reactedByCurrentUser
      ? await messageApi.removeReaction(message.id, emoji)
      : await messageApi.addReaction(message.id, emoji);

    setMessages((current) => upsertMessage(current, updatedMessage));
  }

  async function handleSendFriendRequest(targetUserId) {
    await friendApi.sendRequest(targetUserId);
    await refreshFriendsAndRequests();
    setSearchResults((current) => current.filter((user) => user.id !== targetUserId));
  }

  async function handleAcceptRequest(requestId) {
    await friendApi.acceptRequest(requestId);
    await refreshFriendsAndRequests();
  }

  async function handleRejectRequest(requestId) {
    await friendApi.rejectRequest(requestId);
    await refreshFriendsAndRequests();
  }

  async function handleUnfriend(friendUserId) {
    await friendApi.unfriend(friendUserId);
    await refreshFriendsAndRequests();
  }

  async function handleMarkNotificationRead(notificationId) {
    await notificationApi.markRead(notificationId);
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId ? { ...notification, isRead: true } : notification
      )
    );
  }

  async function handleMarkAllNotificationsRead() {
    await notificationApi.markAllRead();
    setNotifications((current) => current.map((notification) => ({ ...notification, isRead: true })));
  }

  async function handleSaveProfile(payload) {
    const updatedUser = await userApi.updateCurrentUser(payload);
    onCurrentUserChange(updatedUser);
  }

  async function handleUploadAvatar(file) {
    const updatedUser = await userApi.uploadAvatar(file);
    onCurrentUserChange(updatedUser);
  }

  async function handleViewUserProfile(userId) {
    if (!userId) {
      return;
    }

    setIsUserProfileVisible(true);
    setIsUserProfileLoading(true);
    setUserProfileError("");

    try {
      const profile = await userApi.getById(userId);
      setSelectedUserProfile(profile);
    } catch (error) {
      setSelectedUserProfile(null);
      setUserProfileError(error.message);
    } finally {
      setIsUserProfileLoading(false);
    }
  }

  async function handleTypingChange(channelId, isTyping) {
    try {
      await chatSignalR.sendTyping(channelId, isTyping);
    } catch (error) {
      console.warn("Failed to emit typing state.", error);
    }
  }

  const hasNoServers = !isServersLoading && servers.length === 0;

  return (
    <>
      <main className="chat-page">
        <Sidebar
          servers={servers}
          selectedServerId={selectedServerId}
          currentUser={currentUser}
          unreadNotificationCount={unreadNotificationCount}
          onSelectServer={setSelectedServerId}
          onOpenCreateServer={() => setIsCreateServerVisible(true)}
          onOpenJoinServer={() => setIsJoinServerVisible(true)}
          onLogout={onLogout}
        />

        <ChannelList
          server={selectedServer}
          selectedTextChannelId={selectedTextChannelId}
          activeVoiceChannelId={activeVoiceChannelId}
          connectionState={connectionState}
          onSelectChannel={handleSelectChannel}
        />

        <div className="chat-stage">
          <div className="chat-stage-topbar workspace-topbar">
            <div>
              <p className="eyebrow">Signed in</p>
              <h1>{currentUser.displayName}</h1>
              <span className="topbar-subcopy">
                {selectedServer ? `Working inside ${selectedServer.name}` : "No server selected yet"}
              </span>
            </div>

            <div className="workspace-tabs">
              <WorkspaceTab id="chat" activeView={activeView} onSelect={setActiveView}>Chat</WorkspaceTab>
              <WorkspaceTab id="friends" activeView={activeView} onSelect={setActiveView}>Friends</WorkspaceTab>
              <WorkspaceTab id="voice" activeView={activeView} onSelect={setActiveView}>Calls</WorkspaceTab>
              <WorkspaceTab
                id="notifications"
                activeView={activeView}
                onSelect={setActiveView}
                badge={unreadNotificationCount}
              >
                Alerts
              </WorkspaceTab>
              {canSeeAdmin && (
                <WorkspaceTab id="admin" activeView={activeView} onSelect={setActiveView}>Admin</WorkspaceTab>
              )}
              <WorkspaceTab id="profile" activeView={activeView} onSelect={setActiveView}>Profile</WorkspaceTab>
            </div>
          </div>

          {hasNoServers ? (
            <section className="chat-panel empty-state-shell">
              <div className="empty-state-card">
                <p className="eyebrow">Fresh workspace</p>
                <h2>Create or join your first server</h2>
                <p>The backend starts clean, so create a server here or join one with an invite code.</p>
                <form className="server-form" onSubmit={handleCreateServer}>
                  <label>
                    Server name
                    <input
                      type="text"
                      value={createServerForm.name}
                      onChange={(event) =>
                        setCreateServerForm((current) => ({ ...current, name: event.target.value }))
                      }
                      required
                    />
                  </label>
                  <label>
                    Description
                    <textarea
                      value={createServerForm.description}
                      onChange={(event) =>
                        setCreateServerForm((current) => ({ ...current, description: event.target.value }))
                      }
                      rows={3}
                    />
                  </label>
                  {serversError && <p className="form-error">{serversError}</p>}
                  <div className="inline-actions">
                    <button type="submit" className="primary-button" disabled={isCreatingServer}>
                      {isCreatingServer ? "Creating..." : "Create server"}
                    </button>
                    <button type="button" className="ghost-button" onClick={() => setIsJoinServerVisible(true)}>
                      Join with invite
                    </button>
                  </div>
                </form>
              </div>
            </section>
          ) : activeView === "chat" ? (
            <ChatBox
              currentUser={currentUser}
              currentServer={selectedServer}
              currentChannel={currentTextChannel}
              messages={messages}
              isLoading={isMessagesLoading}
              error={messageError || serversError}
              sendError={sendError}
              replyToMessage={replyToMessage}
              editingMessageId={editingMessageId}
              typingUsers={typingUsers}
              canManageMessages={permissions.has("ManageMessages")}
              canPinMessages={permissions.has("PinMessages")}
              onCancelReply={() => setReplyToMessage(null)}
              onSendMessage={handleSendMessage}
              onTypingChange={handleTypingChange}
              onReplyMessage={(message) => setReplyToMessage(message)}
              onStartEditMessage={(message) => setEditingMessageId(message.id)}
              onCancelEditMessage={() => setEditingMessageId(null)}
              onSaveEditMessage={handleSaveEditedMessage}
              onDeleteMessage={handleDeleteMessage}
              onTogglePinMessage={handleTogglePin}
              onToggleReaction={handleToggleReaction}
              onViewUserProfile={(userId) => handleViewUserProfile(userId).catch((error) => setSocialError(error.message))}
            />
          ) : activeView === "friends" ? (
            <FriendsPanel
              friends={friends}
              requests={friendRequests}
              searchTerm={searchTerm}
              searchResults={searchResults}
              isLoading={isFriendsLoading}
              error={socialError}
              onSearchTermChange={setSearchTerm}
              onSendRequest={(targetUserId) => handleSendFriendRequest(targetUserId).catch((error) => setSocialError(error.message))}
              onAcceptRequest={(requestId) => handleAcceptRequest(requestId).catch((error) => setSocialError(error.message))}
              onRejectRequest={(requestId) => handleRejectRequest(requestId).catch((error) => setSocialError(error.message))}
              onUnfriend={(friendUserId) => handleUnfriend(friendUserId).catch((error) => setSocialError(error.message))}
              onViewProfile={(userId) => handleViewUserProfile(userId).catch((error) => setSocialError(error.message))}
            />
          ) : activeView === "notifications" ? (
            <NotificationsPanel
              notifications={notifications}
              onMarkRead={(notificationId) => handleMarkNotificationRead(notificationId).catch((error) => setSocialError(error.message))}
              onMarkAllRead={() => handleMarkAllNotificationsRead().catch((error) => setSocialError(error.message))}
            />
          ) : activeView === "voice" ? (
            <VoicePanel currentUser={currentUser} currentChannel={currentVoiceChannel} />
          ) : activeView === "admin" ? (
            <AdminPanel
              server={selectedServer}
              invite={serverInvite}
              permissions={permissions}
              onUpdateServer={async (serverId, payload) => { await serverApi.updateServer(serverId, payload); await refreshSelectedServer(serverId); }}
              onDeleteServer={async (serverId) => { await serverApi.deleteServer(serverId); await refreshServers(); setActiveView("chat"); }}
              onLeaveServer={async (serverId) => { await serverApi.leaveServer(serverId); await refreshServers(); setActiveView("chat"); }}
              onCreateCategory={async (serverId, payload) => { await channelApi.createCategory(serverId, payload); await refreshSelectedServer(serverId); }}
              onUpdateCategory={async (categoryId, payload) => { await channelApi.updateCategory(categoryId, payload); await refreshSelectedServer(); }}
              onDeleteCategory={async (categoryId) => { await channelApi.deleteCategory(categoryId); await refreshSelectedServer(); }}
              onCreateChannel={async (serverId, payload) => { await channelApi.createChannel(serverId, payload); await refreshSelectedServer(serverId); }}
              onUpdateChannel={async (channelId, payload) => { await channelApi.updateChannel(channelId, payload); await refreshSelectedServer(); }}
              onDeleteChannel={async (channelId) => { await channelApi.deleteChannel(channelId); await refreshSelectedServer(); }}
              onCreateRole={async (serverId, payload) => { await serverApi.createRole(serverId, payload); await refreshSelectedServer(serverId); }}
              onAssignRole={async (serverId, roleId, userId) => { await serverApi.assignRole(serverId, roleId, userId); await refreshSelectedServer(serverId); }}
              onKickMember={async (serverId, userId, reason) => { await serverApi.kickMember(serverId, userId, reason); await refreshSelectedServer(serverId); }}
              onBanMember={async (serverId, userId, reason) => { await serverApi.banMember(serverId, userId, reason); await refreshSelectedServer(serverId); }}
            />
          ) : (
            <ProfilePanel currentUser={currentUser} onSaveProfile={handleSaveProfile} onUploadAvatar={handleUploadAvatar} />
          )}
        </div>
      </main>

      {isCreateServerVisible && (
        <ModalShell title="Create another workspace" subtitle="New server" onClose={() => setIsCreateServerVisible(false)}>
          <form className="server-form" onSubmit={handleCreateServer}>
            <label>
              Server name
              <input
                type="text"
                value={createServerForm.name}
                onChange={(event) => setCreateServerForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </label>
            <label>
              Description
              <textarea
                value={createServerForm.description}
                onChange={(event) => setCreateServerForm((current) => ({ ...current, description: event.target.value }))}
                rows={3}
              />
            </label>
            {serversError && <p className="form-error">{serversError}</p>}
            <button type="submit" className="primary-button" disabled={isCreatingServer}>
              {isCreatingServer ? "Creating..." : "Create server"}
            </button>
          </form>
        </ModalShell>
      )}

      {isJoinServerVisible && (
        <ModalShell title="Join a workspace" subtitle="Invite link" onClose={() => setIsJoinServerVisible(false)}>
          <form
            className="server-form"
            onSubmit={(event) => {
              event.preventDefault();
              handleJoinServer().catch((error) => setServersError(error.message));
            }}
          >
            <label>
              Invite code
              <input
                type="text"
                value={joinInviteCode}
                onChange={(event) => setJoinInviteCode(event.target.value)}
                required
              />
            </label>
            {serversError && <p className="form-error">{serversError}</p>}
            <button type="submit" className="primary-button" disabled={isJoiningServer}>
              {isJoiningServer ? "Joining..." : "Join server"}
            </button>
          </form>
        </ModalShell>
      )}

      {isUserProfileVisible && (
        <UserProfileModal
          profile={selectedUserProfile}
          isLoading={isUserProfileLoading}
          error={userProfileError}
          onClose={() => {
            setIsUserProfileVisible(false);
            setSelectedUserProfile(null);
            setUserProfileError("");
          }}
        />
      )}
    </>
  );
}

export default ChatPage;
