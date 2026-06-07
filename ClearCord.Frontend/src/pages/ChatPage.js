import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import AdminPanel from "../components/AdminPanel";
import ChatBox from "../components/ChatBox";
import ModalShell from "../components/ModalShell";
import ProfilePanel from "../components/ProfilePanel";
import SecondaryPanel from "../components/SecondaryPanel";
import NavRail from "../components/NavRail";
import ServerRail from "../components/ServerRail";
import UserProfileModal from "../components/UserProfileModal";
import VoicePanel from "../components/VoicePanel";
import WorkspaceRail from "../components/WorkspaceRail";
import {
  channelApi,
  directApi,
  friendApi,
  messageApi,
  notificationApi,
  serverApi,
  toAssetUrl,
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
import { useI18n } from "../i18n";

function FriendsHomePanel({
  friends,
  friendRequests,
  searchTerm,
  onSearchTermChange,
  onFocusSearch,
  onStartDirectChat,
  onStartDirectCall,
  onAcceptRequest,
  onRejectRequest,
  onViewProfile
}) {
  const { t } = useI18n();
  const [filter, setFilter] = useState("online");
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const visibleFriends = friends.filter((friend) => {
    const matchesSearch =
      !normalizedSearch ||
      friend.displayName.toLowerCase().includes(normalizedSearch) ||
      friend.userName.toLowerCase().includes(normalizedSearch);

    if (!matchesSearch) {
      return false;
    }

    return filter === "online" ? friend.isOnline : true;
  });

  const pendingCount = friendRequests.length;

  return (
    <section className="chat-panel friends-main-panel">
      <header className="friends-topbar">
        <div className="friends-topbar-title">
          <span className="material-like">person</span>
          <h2>{t("tabs.friends")}</h2>
        </div>
        <nav className="friends-filter-tabs">
          <button type="button" className={filter === "online" ? "active" : ""} onClick={() => setFilter("online")}>
            {t("common.online")}
          </button>
          <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>
            {t("common.all")}
          </button>
          <button type="button" className={filter === "pending" ? "active" : ""} onClick={() => setFilter("pending")}>
            {t("friends.pendingRequests")}
            {pendingCount > 0 ? ` ${pendingCount}` : ""}
          </button>
          <button type="button" className="add-friend-tab" onClick={onFocusSearch}>
            {t("friends.addFriend")}
          </button>
        </nav>
      </header>

      <div className="friends-main-body">
        <section className="friends-list-body">
          <label className="friends-search-bar">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              placeholder={t("friends.searchPlaceholder")}
            />
            <span>search</span>
          </label>

          {filter === "pending" ? (
            <div className="discord-list">
              <p className="discord-section-label">{t("friends.pendingRequests")} - {friendRequests.length}</p>
              {friendRequests.map((request) => (
                <article key={request.id} className="discord-friend-row">
                  <div className="discord-friend-main">
                    <div className="avatar-badge">
                      {request.user.avatarUrl ? (
                        <img src={toAssetUrl(request.user.avatarUrl)} alt={request.user.displayName} className="avatar-image" />
                      ) : (
                        <span>{request.user.displayName?.[0]?.toUpperCase() || "U"}</span>
                      )}
                    </div>
                    <div>
                      <strong>{request.user.displayName}</strong>
                      <p>@{request.user.userName}</p>
                    </div>
                  </div>
                  <div className="discord-row-actions">
                    <button type="button" onClick={() => onAcceptRequest(request.id)}>{t("friends.accept")}</button>
                    <button type="button" onClick={() => onRejectRequest(request.id)}>{t("friends.reject")}</button>
                  </div>
                </article>
              ))}
              {!friendRequests.length && <p className="muted-copy">{t("friends.noRequests")}</p>}
            </div>
          ) : (
            <div className="discord-list">
              <p className="discord-section-label">
                {filter === "online" ? t("common.online") : t("common.all")} - {visibleFriends.length}
              </p>
              {visibleFriends.map((friend) => (
                <article key={friend.userId} className="discord-friend-row">
                  <div className="discord-friend-main">
                    <div className="relative-avatar">
                      <div className="avatar-badge">
                        {friend.avatarUrl ? (
                          <img src={toAssetUrl(friend.avatarUrl)} alt={friend.displayName} className="avatar-image" />
                        ) : (
                          <span>{friend.displayName?.[0]?.toUpperCase() || friend.userName?.[0]?.toUpperCase() || "U"}</span>
                        )}
                      </div>
                      <span className={`presence-dot ${friend.isOnline ? "online" : "offline"}`} />
                    </div>
                    <div>
                      <strong>{friend.displayName}</strong>
                      <p>@{friend.userName} - {friend.isOnline ? t("common.online") : t("common.offline")}</p>
                    </div>
                  </div>
                  <div className="discord-row-actions">
                    <button type="button" title={t("friends.message")} onClick={() => onStartDirectChat(friend.userId)}>
                      chat
                    </button>
                    <button type="button" title={t("friends.call")} onClick={() => onStartDirectCall(friend.userId)}>
                      call
                    </button>
                    <button type="button" title={t("friends.viewProfile")} onClick={() => onViewProfile(friend.userId)}>
                      more
                    </button>
                  </div>
                </article>
              ))}
              {!visibleFriends.length && <p className="muted-copy">{t("friends.noFriends")}</p>}
            </div>
          )}
        </section>

        <aside className="active-now-panel">
          <h3>{t("friends.activeNow")}</h3>
          {friends.filter((friend) => friend.isOnline).slice(0, 2).map((friend) => (
            <article key={friend.userId} className="active-card">
              <div className="discord-friend-main">
                <div className="avatar-badge small">
                  {friend.avatarUrl ? (
                    <img src={toAssetUrl(friend.avatarUrl)} alt={friend.displayName} className="avatar-image" />
                  ) : (
                    <span>{friend.displayName?.[0]?.toUpperCase() || "U"}</span>
                  )}
                </div>
                <div>
                  <strong>{friend.displayName}</strong>
                  <p>{t("common.online")}</p>
                </div>
              </div>
              <div className="active-card-inner">
                <span>chat_bubble</span>
                <p>{t("friends.readyToChat")}</p>
              </div>
            </article>
          ))}
          {friends.filter((friend) => friend.isOnline).length === 0 && (
            <div className="active-empty">
              <strong>{t("friends.quietNow")}</strong>
              <p>{t("friends.quietNowBody")}</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function ChatPage({
  currentUser,
  inviteCode,
  onCurrentUserChange,
  onInviteConsumed,
  onLogout
}) {
  const { t } = useI18n();
  const [servers, setServers] = useState([]);
  const [selectedServerId, setSelectedServerId] = useState(null);
  const [selectedServer, setSelectedServer] = useState(null);
  const [serverInvite, setServerInvite] = useState(null);
  const [selectedTextChannelId, setSelectedTextChannelId] = useState(null);
  const [activeVoiceChannelId, setActiveVoiceChannelId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [friends, setFriends] = useState([]);
  const [directConversations, setDirectConversations] = useState([]);
  const [selectedDirectConversation, setSelectedDirectConversation] = useState(null);
  const [directVoiceConversation, setDirectVoiceConversation] = useState(null);
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
  const previousDirectConversationIdRef = useRef(null);
  const processedInviteCodeRef = useRef(null);

  const currentTextChannel = useMemo(
    () => selectedServer?.channels?.find((channel) => channel.id === selectedTextChannelId) ?? null,
    [selectedServer, selectedTextChannelId]
  );

  const currentVoiceChannel = useMemo(
    () => selectedServer?.channels?.find((channel) => channel.id === activeVoiceChannelId) ?? null,
    [activeVoiceChannelId, selectedServer]
  );

  const currentDirectChannel = useMemo(
    () =>
      selectedDirectConversation
        ? {
            id: selectedDirectConversation.id,
            name: selectedDirectConversation.otherUser?.displayName || selectedDirectConversation.otherUser?.userName || "Direct message",
            topic: "Direct message",
            isDirect: true
          }
        : null,
    [selectedDirectConversation]
  );

  const currentChatChannel = currentDirectChannel ?? currentTextChannel;
  const currentChatServer = currentDirectChannel
    ? { id: "direct", name: "Direct Messages" }
    : selectedServer;

  const currentVoiceTarget = directVoiceConversation
    ? {
        id: directVoiceConversation.id,
        name: directVoiceConversation.otherUser?.displayName || directVoiceConversation.otherUser?.userName || "Direct call",
        isDirect: true
      }
    : currentVoiceChannel;

  const directPeer = selectedDirectConversation?.otherUser ?? null;

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
      if (
        (!selectedDirectConversation && incomingMessage.channelId === selectedTextChannelId) ||
        incomingMessage.directConversationId === selectedDirectConversation?.id
      ) {
        setMessages((current) => upsertMessage(current, incomingMessage));
      }
    });
    const unsubscribeUpdated = chatSignalR.onMessageUpdated((incomingMessage) => {
      if (
        (!selectedDirectConversation && incomingMessage.channelId === selectedTextChannelId) ||
        incomingMessage.directConversationId === selectedDirectConversation?.id
      ) {
        setMessages((current) => upsertMessage(current, incomingMessage));
      }
    });
    const unsubscribeDeleted = chatSignalR.onMessageDeleted(({ messageId }) => {
      setMessages((current) => markMessageDeleted(current, messageId));
    });
    const unsubscribeReactions = chatSignalR.onMessageReactionChanged((incomingMessage) => {
      if (
        (!selectedDirectConversation && incomingMessage.channelId === selectedTextChannelId) ||
        incomingMessage.directConversationId === selectedDirectConversation?.id
      ) {
        setMessages((current) => upsertMessage(current, incomingMessage));
      }
    });
    const unsubscribePinned = chatSignalR.onMessagePinnedChanged((incomingMessage) => {
      if (
        (!selectedDirectConversation && incomingMessage.channelId === selectedTextChannelId) ||
        incomingMessage.directConversationId === selectedDirectConversation?.id
      ) {
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
        setSelectedServer((current) =>
          current
            ? {
                ...current,
                members: current.members.map((member) =>
                  member.userId === payload.userId
                    ? { ...member, isOnline: payload.isOnline, lastSeenAt: payload.lastSeenAt }
                    : member
                )
              }
            : current
        );
      });
    const unsubscribeTyping = chatSignalR.onTypingChanged((payload) => {
      if (
        ((!selectedDirectConversation && payload.channelId === selectedTextChannelId) ||
          payload.directConversationId === selectedDirectConversation?.id) &&
        payload.userId !== currentUser.id
      ) {
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
  }, [currentUser, onCurrentUserChange, selectedDirectConversation?.id, selectedTextChannelId]);

  useEffect(() => {
    let isMounted = true;

    async function loadBootData() {
      setIsServersLoading(true);
      setIsFriendsLoading(true);
      setServersError("");
      setSocialError("");

      try {
        const [serverList, nextFriends, nextRequests, nextNotifications, nextDirectConversations] = await Promise.all([
          serverApi.getServers(),
          friendApi.getFriends(),
          friendApi.getRequests(),
          notificationApi.getMine(),
          directApi.getConversations()
        ]);

        if (!isMounted) {
          return;
        }

        setServers(serverList);
        setFriends(nextFriends);
        setDirectConversations(nextDirectConversations);
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

      if (selectedDirectConversation) {
        return;
      }

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
  }, [selectedDirectConversation, selectedTextChannelId]);

  useEffect(() => {
    let isMounted = true;

    async function syncDirectConversationState() {
      const previousConversationId = previousDirectConversationIdRef.current;
      const nextConversationId = selectedDirectConversation?.id ?? null;

      if (
        previousConversationId &&
        previousConversationId !== nextConversationId &&
        previousConversationId !== directVoiceConversation?.id
      ) {
        try {
          await chatSignalR.leaveDirectConversation(previousConversationId);
        } catch (error) {
          console.warn("Failed to leave previous direct conversation.", error);
        }
      }

      if (!selectedDirectConversation) {
        if (previousConversationId !== directVoiceConversation?.id) {
          previousDirectConversationIdRef.current = null;
        }
        return;
      }

      setSendError("");
      setMessageError("");
      setTypingUsersMap(new Map());
      setReplyToMessage(null);
      setEditingMessageId(null);
      setIsMessagesLoading(true);

      if (previousTextChannelIdRef.current) {
        try {
          await chatSignalR.leaveChannel(previousTextChannelIdRef.current);
        } catch (error) {
          console.warn("Failed to leave previous channel.", error);
        }

        previousTextChannelIdRef.current = null;
      }

      try {
        await chatSignalR.joinDirectConversation(selectedDirectConversation.id);
        const directMessages = await directApi.getMessages(selectedDirectConversation.id);

        if (isMounted) {
          previousDirectConversationIdRef.current = selectedDirectConversation.id;
          setMessages(directMessages);
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

    syncDirectConversationState();

    return () => {
      isMounted = false;
    };
  }, [directVoiceConversation?.id, selectedDirectConversation]);

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

  async function refreshDirectConversations(preferredConversationId) {
    const nextConversations = await directApi.getConversations();
    setDirectConversations(nextConversations);

    if (preferredConversationId) {
      const preferredConversation = nextConversations.find((conversation) => conversation.id === preferredConversationId);
      if (preferredConversation) {
        setSelectedDirectConversation(preferredConversation);
      }
    }
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
      if (selectedDirectConversation) {
        if (files?.length > 0) {
          await directApi.createMessageWithFiles(selectedDirectConversation.id, {
            content,
            replyToMessageId,
            files
          });
        } else {
          await chatSignalR.sendDirectMessage({
            directConversationId: selectedDirectConversation.id,
            content,
            replyToMessageId
          });
        }
      } else if (files?.length > 0) {
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
    setSelectedDirectConversation(null);
    if (channel.type === "Voice") {
      setActiveVoiceChannelId(channel.id);
      setActiveView("voice");
      return;
    }

    setSelectedTextChannelId(channel.id);
    setActiveView("chat");
  }

  function handleSelectServer(serverId) {
    setSelectedDirectConversation(null);
    setSelectedServerId(serverId);
    setActiveView("chat");
  }

  function handleSelectView(view) {
    if (view === "chat") {
      setSelectedDirectConversation(null);
    }

    setActiveView(view);
  }

  function handleFocusFriendSearch() {
    setActiveView("friends");
    window.setTimeout(() => {
      document.querySelector("[data-friend-search]")?.focus();
    }, 0);
  }

  function handleOpenDirectConversation(conversation) {
    setSocialError("");
    setMessageError("");
    setSendError("");
    setSelectedDirectConversation(conversation);
    setDirectVoiceConversation(null);
    setMessages([]);
    setReplyToMessage(null);
    setEditingMessageId(null);
    setActiveView("friends");
  }

  async function handleStartDirectChat(friendUserId) {
    setSocialError("");
    setMessageError("");
    setSendError("");

    try {
      const conversation = await directApi.getOrCreateConversation(friendUserId);
      setSelectedDirectConversation(conversation);
      setDirectVoiceConversation(null);
      setMessages([]);
      setReplyToMessage(null);
      setEditingMessageId(null);
      setDirectConversations((current) => {
        const withoutCurrent = current.filter((item) => item.id !== conversation.id);
        return [conversation, ...withoutCurrent];
      });
      setActiveView("friends");
    } catch (error) {
      setSocialError(error.message);
      setMessageError(error.message);
      throw error;
    }
  }

  async function handleStartDirectCall(friendUserId) {
    setSocialError("");
    setMessageError("");
    setSendError("");

    try {
      const conversation = await directApi.getOrCreateConversation(friendUserId);
      setSelectedDirectConversation(conversation);
      setDirectVoiceConversation(conversation);
      setMessages([]);
      setReplyToMessage(null);
      setEditingMessageId(null);
      setDirectConversations((current) => {
        const withoutCurrent = current.filter((item) => item.id !== conversation.id);
        return [conversation, ...withoutCurrent];
      });
      setActiveView("friends");
    } catch (error) {
      setSocialError(error.message);
      setMessageError(error.message);
      throw error;
    }
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

  async function handleOpenNotification(notification) {
    if (!notification) {
      return;
    }

    if (!notification.isRead) {
      await handleMarkNotificationRead(notification.id);
    }

    const relatedEntityType = notification.relatedEntityType?.toLowerCase() ?? "";

    if (relatedEntityType === "friendrequest") {
      await refreshFriendsAndRequests();
      setActiveView("friends");
      return;
    }

    if (relatedEntityType === "directconversation" && notification.relatedEntityId) {
      await refreshDirectConversations(notification.relatedEntityId);
      setActiveView("friends");
      return;
    }

    if (relatedEntityType === "channel" && notification.relatedEntityId) {
      const targetChannelId = notification.relatedEntityId;

      if (selectedServer?.channels?.some((channel) => channel.id === targetChannelId)) {
        setSelectedTextChannelId(targetChannelId);
        setActiveView("chat");
        return;
      }

      for (const server of servers) {
        if (server.id === selectedServer?.id) {
          continue;
        }

        const serverDetails = await serverApi.getServerDetails(server.id);
        if (serverDetails.channels.some((channel) => channel.id === targetChannelId)) {
          setSelectedServerId(server.id);
          setSelectedTextChannelId(targetChannelId);
          setActiveView("chat");
          return;
        }
      }

      setActiveView("chat");
      return;
    }

    if (relatedEntityType === "server" && notification.relatedEntityId) {
      await refreshServers(notification.relatedEntityId);
      setSelectedServerId(notification.relatedEntityId);
      setActiveView("chat");
    }
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
      if (selectedDirectConversation) {
        await chatSignalR.sendDirectTyping(selectedDirectConversation.id, isTyping);
      } else {
        await chatSignalR.sendTyping(channelId, isTyping);
      }
    } catch (error) {
      console.warn("Failed to emit typing state.", error);
    }
  }

  const hasNoServers = !isServersLoading && servers.length === 0;
  const shouldShowFriendsHome = activeView === "friends" && !currentDirectChannel;

  return (
    <>
      <main className="chat-page">
        <div className="left-rails">
          <ServerRail
            servers={servers}
            selectedServerId={selectedServerId}
            activeView={activeView}
            currentUser={currentUser}
            onSelectServer={handleSelectServer}
            onSelectView={handleSelectView}
            onOpenCreateServer={() => setIsCreateServerVisible(true)}
            onOpenJoinServer={() => setIsJoinServerVisible(true)}
            onOpenProfile={() => setActiveView("profile")}
          />
          <NavRail
            activeView={activeView}
            unreadNotificationCount={unreadNotificationCount}
            canSeeAdmin={canSeeAdmin}
            onSelectView={handleSelectView}
            onLogout={onLogout}
          />
        </div>

        <div className="secondary-panel">
          <SecondaryPanel
            activeView={activeView}
            server={selectedServer}
            selectedTextChannelId={selectedTextChannelId}
            activeVoiceChannelId={activeVoiceChannelId}
            connectionState={connectionState}
            onSelectChannel={handleSelectChannel}
            friends={friends}
            directConversations={directConversations}
            selectedDirectConversationId={selectedDirectConversation?.id ?? null}
            friendRequests={friendRequests}
            searchTerm={searchTerm}
            searchResults={searchResults}
            isFriendsLoading={isFriendsLoading}
            socialError={socialError}
            onSearchTermChange={setSearchTerm}
            onSendFriendRequest={(targetUserId) =>
              handleSendFriendRequest(targetUserId).catch((error) => setSocialError(error.message))
            }
            onAcceptFriendRequest={(requestId) =>
              handleAcceptRequest(requestId).catch((error) => setSocialError(error.message))
            }
            onRejectFriendRequest={(requestId) =>
              handleRejectRequest(requestId).catch((error) => setSocialError(error.message))
            }
            onUnfriend={(friendUserId) =>
              handleUnfriend(friendUserId).catch((error) => setSocialError(error.message))
            }
            onOpenDirectConversation={handleOpenDirectConversation}
            onStartDirectChat={handleStartDirectChat}
            onStartDirectCall={handleStartDirectCall}
            onViewProfile={(userId) =>
              handleViewUserProfile(userId).catch((error) => setSocialError(error.message))
            }
            notifications={notifications}
            onOpenNotification={(notification) =>
              handleOpenNotification(notification).catch((error) => setSocialError(error.message))
            }
            onMarkNotificationRead={(notificationId) =>
              handleMarkNotificationRead(notificationId).catch((error) => setSocialError(error.message))
            }
            onMarkAllNotificationsRead={() =>
              handleMarkAllNotificationsRead().catch((error) => setSocialError(error.message))
            }
          />
        </div>

        <div className="chat-stage">
          {shouldShowFriendsHome ? (
            <FriendsHomePanel
              friends={friends}
              friendRequests={friendRequests}
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              onFocusSearch={handleFocusFriendSearch}
              onStartDirectChat={(friendUserId) => handleStartDirectChat(friendUserId).catch((error) => setSocialError(error.message))}
              onStartDirectCall={(friendUserId) => handleStartDirectCall(friendUserId).catch((error) => setSocialError(error.message))}
              onAcceptRequest={(requestId) => handleAcceptRequest(requestId).catch((error) => setSocialError(error.message))}
              onRejectRequest={(requestId) => handleRejectRequest(requestId).catch((error) => setSocialError(error.message))}
              onViewProfile={(userId) => handleViewUserProfile(userId).catch((error) => setSocialError(error.message))}
            />
          ) : hasNoServers && !currentDirectChannel ? (
            <section className="chat-panel empty-state-shell">
              <div className="empty-state-card">
                <p className="eyebrow">{t("workspace.freshWorkspace")}</p>
                <h2>{t("workspace.createOrJoin")}</h2>
                <p>{t("workspace.emptyWorkspaceBody")}</p>
                <form className="server-form" onSubmit={handleCreateServer}>
                  <label>
                    {t("workspace.serverName")}
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
                    {t("workspace.description")}
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
                      {isCreatingServer ? t("workspace.creatingServer") : t("workspace.createServer")}
                    </button>
                    <button type="button" className="ghost-button" onClick={() => setIsJoinServerVisible(true)}>
                      {t("workspace.joinWithInvite")}
                    </button>
                  </div>
                </form>
              </div>
            </section>
          ) : (
            <ChatBox
              currentUser={currentUser}
              currentServer={currentChatServer}
              currentChannel={currentChatChannel}
              messages={messages}
              isLoading={isMessagesLoading}
              error={messageError || serversError}
              sendError={sendError}
              replyToMessage={replyToMessage}
              editingMessageId={editingMessageId}
              typingUsers={typingUsers}
              canManageMessages={!currentDirectChannel && permissions.has("ManageMessages")}
              canPinMessages={Boolean(currentDirectChannel) || permissions.has("PinMessages")}
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
          )}
        </div>

        {directPeer ? (
          <aside className="workspace-rail direct-context-rail">
            <div className="direct-profile-card">
              <div className="direct-profile-avatar">
                {directPeer.avatarUrl ? (
                  <img src={toAssetUrl(directPeer.avatarUrl)} alt={directPeer.displayName} className="avatar-image" />
                ) : (
                  <span>{directPeer.displayName?.[0]?.toUpperCase() || directPeer.userName?.[0]?.toUpperCase() || "U"}</span>
                )}
              </div>
              <h3>{directPeer.displayName}</h3>
              <p>@{directPeer.userName}</p>
              <button
                type="button"
                className="primary-button compact"
                onClick={() => handleStartDirectCall(directPeer.id).catch((error) => setSocialError(error.message))}
              >
                {t("friends.call")}
              </button>
              <button
                type="button"
                className="ghost-button compact"
                onClick={() => handleViewUserProfile(directPeer.id).catch((error) => setSocialError(error.message))}
              >
                {t("friends.viewProfile")}
              </button>
            </div>
          </aside>
        ) : activeView === "friends" ? (
          <aside className="workspace-rail direct-context-rail">
            <div className="direct-profile-card muted-card">
              <p className="eyebrow">{t("friends.homeEyebrow")}</p>
              <h3>{t("friends.homeTitle")}</h3>
              <p>{t("friends.homeBody")}</p>
            </div>
          </aside>
        ) : (
          <WorkspaceRail
            server={selectedServer}
            onViewProfile={(userId) => handleViewUserProfile(userId).catch((error) => setSocialError(error.message))}
          />
        )}
      </main>

      {isCreateServerVisible && (
        <ModalShell
          title={t("workspace.createServer")}
          subtitle={t("workspace.serverOverview")}
          onClose={() => setIsCreateServerVisible(false)}
        >
          <form className="server-form" onSubmit={handleCreateServer}>
            <label>
              {t("workspace.serverName")}
              <input
                type="text"
                value={createServerForm.name}
                onChange={(event) => setCreateServerForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </label>
            <label>
              {t("workspace.description")}
              <textarea
                value={createServerForm.description}
                onChange={(event) => setCreateServerForm((current) => ({ ...current, description: event.target.value }))}
                rows={3}
              />
            </label>
            {serversError && <p className="form-error">{serversError}</p>}
            <button type="submit" className="primary-button" disabled={isCreatingServer}>
              {isCreatingServer ? t("workspace.creatingServer") : t("workspace.createServer")}
            </button>
          </form>
        </ModalShell>
      )}

      {isJoinServerVisible && (
        <ModalShell
          title={t("workspace.joinServer")}
          subtitle={t("workspace.inviteLink")}
          onClose={() => setIsJoinServerVisible(false)}
        >
          <form
            className="server-form"
            onSubmit={(event) => {
              event.preventDefault();
              handleJoinServer().catch((error) => setServersError(error.message));
            }}
          >
            <label>
              {t("workspace.inviteCode")}
              <input
                type="text"
                value={joinInviteCode}
                onChange={(event) => setJoinInviteCode(event.target.value)}
                required
              />
            </label>
            {serversError && <p className="form-error">{serversError}</p>}
            <button type="submit" className="primary-button" disabled={isJoiningServer}>
              {isJoiningServer ? t("workspace.joiningServer") : t("workspace.joinServer")}
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

      {activeView === "profile" && (
        <ModalShell wide bare onClose={() => setActiveView("chat")}>
          <ProfilePanel
            currentUser={currentUser}
            onSaveProfile={handleSaveProfile}
            onUploadAvatar={handleUploadAvatar}
          />
        </ModalShell>
      )}

      {activeView === "admin" && (
        <ModalShell wide bare onClose={() => setActiveView("chat")}>
          <AdminPanel
            server={selectedServer}
            invite={serverInvite}
            permissions={permissions}
            onUpdateServer={async (serverId, payload) => {
              await serverApi.updateServer(serverId, payload);
              await refreshSelectedServer(serverId);
            }}
            onUploadServerIcon={async (serverId, file) => {
              await serverApi.uploadIcon(serverId, file);
              await refreshSelectedServer(serverId);
              await refreshServers(serverId);
            }}
            onDeleteServer={async (serverId) => {
              await serverApi.deleteServer(serverId);
              await refreshServers();
              setActiveView("chat");
            }}
            onLeaveServer={async (serverId) => {
              await serverApi.leaveServer(serverId);
              await refreshServers();
              setActiveView("chat");
            }}
            onCreateCategory={async (serverId, payload) => {
              await channelApi.createCategory(serverId, payload);
              await refreshSelectedServer(serverId);
            }}
            onUpdateCategory={async (categoryId, payload) => {
              await channelApi.updateCategory(categoryId, payload);
              await refreshSelectedServer();
            }}
            onDeleteCategory={async (categoryId) => {
              await channelApi.deleteCategory(categoryId);
              await refreshSelectedServer();
            }}
            onCreateChannel={async (serverId, payload) => {
              await channelApi.createChannel(serverId, payload);
              await refreshSelectedServer(serverId);
            }}
            onUpdateChannel={async (channelId, payload) => {
              await channelApi.updateChannel(channelId, payload);
              await refreshSelectedServer();
            }}
            onDeleteChannel={async (channelId) => {
              await channelApi.deleteChannel(channelId);
              await refreshSelectedServer();
            }}
            onCreateRole={async (serverId, payload) => {
              await serverApi.createRole(serverId, payload);
              await refreshSelectedServer(serverId);
            }}
            onAssignRole={async (serverId, roleId, userId) => {
              await serverApi.assignRole(serverId, roleId, userId);
              await refreshSelectedServer(serverId);
            }}
            onKickMember={async (serverId, userId, reason) => {
              await serverApi.kickMember(serverId, userId, reason);
              await refreshSelectedServer(serverId);
            }}
            onBanMember={async (serverId, userId, reason) => {
              await serverApi.banMember(serverId, userId, reason);
              await refreshSelectedServer(serverId);
            }}
          />
        </ModalShell>
      )}

      {(activeView === "voice" || directVoiceConversation) && (
        <ModalShell
          wide
          bare
          onClose={() => {
            setDirectVoiceConversation(null);
            setActiveView("chat");
          }}
        >
          <VoicePanel currentUser={currentUser} currentChannel={currentVoiceTarget} />
        </ModalShell>
      )}
    </>
  );
}

export default ChatPage;
