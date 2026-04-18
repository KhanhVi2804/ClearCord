import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel
} from "@microsoft/signalr";
import { API_BASE_URL, getStoredToken } from "./api";

const QUICK_RECONNECT_DELAYS = [0, 1500, 5000, 10000];

function normalizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id ?? user.Id,
    userName: user.userName ?? user.UserName,
    displayName: user.displayName ?? user.DisplayName,
    avatarUrl: user.avatarUrl ?? user.AvatarUrl ?? null,
    isOnline: user.isOnline ?? user.IsOnline ?? false
  };
}

function normalizeMessage(message) {
  if (!message) {
    return null;
  }

  return {
    id: message.id ?? message.Id,
    channelId: message.channelId ?? message.ChannelId,
    content: message.content ?? message.Content ?? "",
    isEdited: message.isEdited ?? message.IsEdited ?? false,
    isDeleted: message.isDeleted ?? message.IsDeleted ?? false,
    isPinned: message.isPinned ?? message.IsPinned ?? false,
    createdAt: message.createdAt ?? message.CreatedAt,
    updatedAt: message.updatedAt ?? message.UpdatedAt ?? null,
    sender: normalizeUser(message.sender ?? message.Sender),
    replyTo: message.replyTo
      ? {
          id: message.replyTo.id ?? message.replyTo.Id,
          content: message.replyTo.content ?? message.replyTo.Content ?? "",
          sender: normalizeUser(message.replyTo.sender ?? message.replyTo.Sender)
        }
      : message.ReplyTo
        ? {
            id: message.ReplyTo.id ?? message.ReplyTo.Id,
            content: message.ReplyTo.content ?? message.ReplyTo.Content ?? "",
            sender: normalizeUser(message.ReplyTo.sender ?? message.ReplyTo.Sender)
          }
        : null,
    attachments: (message.attachments ?? message.Attachments ?? []).map((attachment) => ({
      id: attachment.id ?? attachment.Id,
      fileName: attachment.fileName ?? attachment.FileName,
      contentType: attachment.contentType ?? attachment.ContentType,
      url: attachment.url ?? attachment.Url,
      sizeInBytes: attachment.sizeInBytes ?? attachment.SizeInBytes,
      isImage: attachment.isImage ?? attachment.IsImage ?? false
    })),
    reactions: (message.reactions ?? message.Reactions ?? []).map((reaction) => ({
      id: reaction.id ?? reaction.Id,
      emoji: reaction.emoji ?? reaction.Emoji,
      user: normalizeUser(reaction.user ?? reaction.User),
      createdAt: reaction.createdAt ?? reaction.CreatedAt
    }))
  };
}

function normalizeNotification(notification) {
  if (!notification) {
    return null;
  }

  return {
    id: notification.id ?? notification.Id,
    type: notification.type ?? notification.Type,
    title: notification.title ?? notification.Title,
    content: notification.content ?? notification.Content,
    relatedEntityType:
      notification.relatedEntityType ?? notification.RelatedEntityType ?? null,
    relatedEntityId: notification.relatedEntityId ?? notification.RelatedEntityId ?? null,
    isRead: notification.isRead ?? notification.IsRead ?? false,
    createdAt: notification.createdAt ?? notification.CreatedAt
  };
}

function normalizePresence(payload) {
  return {
    userId: payload?.userId ?? payload?.UserId,
    isOnline: payload?.isOnline ?? payload?.IsOnline ?? false,
    lastSeenAt: payload?.lastSeenAt ?? payload?.LastSeenAt ?? null
  };
}

function normalizeTyping(payload) {
  return {
    channelId: payload?.channelId ?? payload?.ChannelId,
    userId: payload?.userId ?? payload?.UserId,
    isTyping: payload?.isTyping ?? payload?.IsTyping ?? false
  };
}

function normalizeVoiceParticipant(participant) {
  return {
    userId: participant?.userId ?? participant?.UserId,
    userName: participant?.userName ?? participant?.UserName,
    displayName: participant?.displayName ?? participant?.DisplayName,
    avatarUrl: participant?.avatarUrl ?? participant?.AvatarUrl ?? null,
    connectionId: participant?.connectionId ?? participant?.ConnectionId,
    isMuted: participant?.isMuted ?? participant?.IsMuted ?? false,
    isCameraEnabled:
      participant?.isCameraEnabled ?? participant?.IsCameraEnabled ?? false,
    isScreenSharing:
      participant?.isScreenSharing ?? participant?.IsScreenSharing ?? false,
    joinedAt: participant?.joinedAt ?? participant?.JoinedAt
  };
}

function normalizeSignal(signal) {
  return {
    channelId: signal?.channelId ?? signal?.ChannelId,
    sourceUserId: signal?.sourceUserId ?? signal?.SourceUserId,
    targetUserId: signal?.targetUserId ?? signal?.TargetUserId,
    type: signal?.type ?? signal?.Type,
    payload: signal?.payload ?? signal?.Payload
  };
}

class ChatSignalRService {
  constructor() {
    this.connection = null;
    this.startPromise = null;
    this.joinedChannelIds = new Set();
    this.activeVoiceSession = null;
    this.connectionStateHandlers = new Set();
    this.eventHandlers = {
      messageCreated: new Set(),
      messageUpdated: new Set(),
      messageDeleted: new Set(),
      messageReactionChanged: new Set(),
      messagePinnedChanged: new Set(),
      notificationCreated: new Set(),
      presenceChanged: new Set(),
      typingChanged: new Set(),
      voiceParticipantsUpdated: new Set(),
      webrtcSignal: new Set()
    };
  }

  buildHubUrl() {
    return API_BASE_URL ? `${API_BASE_URL}/hubs/chat` : "/hubs/chat";
  }

  createConnection() {
    const connection = new HubConnectionBuilder()
      .withUrl(this.buildHubUrl(), {
        accessTokenFactory: () => getStoredToken() || ""
      })
      .withAutomaticReconnect(QUICK_RECONNECT_DELAYS)
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on("messageCreated", (message) => {
      this.emit("messageCreated", normalizeMessage(message));
    });

    connection.on("messageUpdated", (message) => {
      this.emit("messageUpdated", normalizeMessage(message));
    });

    connection.on("messageDeleted", (payload) => {
      this.emit("messageDeleted", {
        messageId: payload?.messageId ?? payload?.MessageId
      });
    });

    connection.on("messageReactionChanged", (message) => {
      this.emit("messageReactionChanged", normalizeMessage(message));
    });

    connection.on("messagePinnedChanged", (message) => {
      this.emit("messagePinnedChanged", normalizeMessage(message));
    });

    connection.on("notificationCreated", (notification) => {
      this.emit("notificationCreated", normalizeNotification(notification));
    });

    connection.on("presenceChanged", (payload) => {
      this.emit("presenceChanged", normalizePresence(payload));
    });

    connection.on("typingChanged", (payload) => {
      this.emit("typingChanged", normalizeTyping(payload));
    });

    connection.on("voiceParticipantsUpdated", (participants) => {
      this.emit(
        "voiceParticipantsUpdated",
        (participants ?? []).map(normalizeVoiceParticipant)
      );
    });

    connection.on("webrtcSignal", (signal) => {
      this.emit("webrtcSignal", normalizeSignal(signal));
    });

    connection.onreconnecting(() => {
      this.emitConnectionState("reconnecting");
    });

    connection.onreconnected(async () => {
      this.emitConnectionState("connected");

      for (const channelId of this.joinedChannelIds) {
        try {
          await connection.invoke("JoinChannel", channelId);
        } catch (error) {
          console.error("Failed to rejoin channel after reconnect.", error);
        }
      }

      if (this.activeVoiceSession?.channelId) {
        try {
          await connection.invoke(
            "JoinVoiceChannel",
            this.activeVoiceSession.channelId,
            this.activeVoiceSession.isMuted,
            this.activeVoiceSession.isCameraEnabled,
            this.activeVoiceSession.isScreenSharing
          );
        } catch (error) {
          console.error("Failed to rejoin voice channel after reconnect.", error);
        }
      }
    });

    connection.onclose(() => {
      this.emitConnectionState("disconnected");
    });

    return connection;
  }

  emit(eventName, payload) {
    this.eventHandlers[eventName]?.forEach((handler) => handler(payload));
  }

  subscribe(eventName, handler) {
    this.eventHandlers[eventName].add(handler);

    return () => {
      this.eventHandlers[eventName].delete(handler);
    };
  }

  emitConnectionState(state) {
    this.connectionStateHandlers.forEach((handler) => handler(state));
  }

  async ensureConnection() {
    if (this.connection?.state === HubConnectionState.Connected) {
      return this.connection;
    }

    if (!this.connection) {
      this.connection = this.createConnection();
    }

    if (this.startPromise) {
      return this.startPromise;
    }

    this.emitConnectionState("connecting");

    this.startPromise = this.connection
      .start()
      .then(() => {
        this.emitConnectionState("connected");
        return this.connection;
      })
      .catch((error) => {
        this.emitConnectionState("disconnected");
        throw error;
      })
      .finally(() => {
        this.startPromise = null;
      });

    return this.startPromise;
  }

  async start() {
    await this.ensureConnection();
  }

  getConnectionState() {
    if (!this.connection) {
      return "disconnected";
    }

    switch (this.connection.state) {
      case HubConnectionState.Connected:
        return "connected";
      case HubConnectionState.Connecting:
        return "connecting";
      case HubConnectionState.Reconnecting:
        return "reconnecting";
      default:
        return "disconnected";
    }
  }

  getConnectionId() {
    return this.connection?.connectionId ?? null;
  }

  async joinServer(serverId) {
    const connection = await this.ensureConnection();
    await connection.invoke("JoinServer", serverId);
  }

  async joinChannel(channelId) {
    const connection = await this.ensureConnection();

    if (this.joinedChannelIds.has(channelId)) {
      return;
    }

    await connection.invoke("JoinChannel", channelId);
    this.joinedChannelIds.add(channelId);
  }

  async leaveChannel(channelId) {
    if (!channelId || !this.connection) {
      return;
    }

    if (this.connection.state === HubConnectionState.Connected) {
      await this.connection.invoke("LeaveChannel", channelId);
    }

    this.joinedChannelIds.delete(channelId);
  }

  async sendTyping(channelId, isTyping) {
    const connection = await this.ensureConnection();
    await connection.invoke("SendTyping", channelId, isTyping);
  }

  async sendMessage(payload) {
    const connection = await this.ensureConnection();

    return connection.invoke("SendMessage", {
      channelId: payload.channelId,
      content: payload.content,
      replyToMessageId: payload.replyToMessageId ?? null
    });
  }

  async joinVoiceChannel(channelId, state) {
    const connection = await this.ensureConnection();
    const voiceState = {
      channelId,
      isMuted: Boolean(state?.isMuted),
      isCameraEnabled: Boolean(state?.isCameraEnabled),
      isScreenSharing: Boolean(state?.isScreenSharing)
    };

    this.activeVoiceSession = voiceState;
    this.joinedChannelIds.add(channelId);

    const participants = await connection.invoke(
      "JoinVoiceChannel",
      channelId,
      voiceState.isMuted,
      voiceState.isCameraEnabled,
      voiceState.isScreenSharing
    );

    return (participants ?? []).map(normalizeVoiceParticipant);
  }

  async leaveVoiceChannel(channelId = this.activeVoiceSession?.channelId) {
    if (!channelId || !this.connection) {
      this.activeVoiceSession = null;
      return [];
    }

    let participants = [];

    if (this.connection.state === HubConnectionState.Connected) {
      participants = await this.connection.invoke("LeaveVoiceChannel", channelId);
      await this.connection.invoke("LeaveChannel", channelId);
    }

    this.joinedChannelIds.delete(channelId);

    if (this.activeVoiceSession?.channelId === channelId) {
      this.activeVoiceSession = null;
    }

    return (participants ?? []).map(normalizeVoiceParticipant);
  }

  async updateVoiceState(channelId, state) {
    const connection = await this.ensureConnection();
    const targetChannelId = channelId ?? this.activeVoiceSession?.channelId;

    if (!targetChannelId) {
      return [];
    }

    this.activeVoiceSession = {
      channelId: targetChannelId,
      isMuted: Boolean(state?.isMuted),
      isCameraEnabled: Boolean(state?.isCameraEnabled),
      isScreenSharing: Boolean(state?.isScreenSharing)
    };

    const participants = await connection.invoke(
      "UpdateVoiceState",
      targetChannelId,
      this.activeVoiceSession.isMuted,
      this.activeVoiceSession.isCameraEnabled,
      this.activeVoiceSession.isScreenSharing
    );

    return (participants ?? []).map(normalizeVoiceParticipant);
  }

  async sendWebRtcSignal(payload) {
    const connection = await this.ensureConnection();

    await connection.invoke("SendWebRtcSignal", {
      channelId: payload.channelId,
      targetUserId: payload.targetUserId,
      type: payload.type,
      payload: payload.payload
    });
  }

  onConnectionStateChanged(handler) {
    this.connectionStateHandlers.add(handler);
    handler(this.getConnectionState());

    return () => {
      this.connectionStateHandlers.delete(handler);
    };
  }

  onMessageCreated(handler) {
    return this.subscribe("messageCreated", handler);
  }

  onMessageUpdated(handler) {
    return this.subscribe("messageUpdated", handler);
  }

  onMessageDeleted(handler) {
    return this.subscribe("messageDeleted", handler);
  }

  onMessageReactionChanged(handler) {
    return this.subscribe("messageReactionChanged", handler);
  }

  onMessagePinnedChanged(handler) {
    return this.subscribe("messagePinnedChanged", handler);
  }

  onNotificationCreated(handler) {
    return this.subscribe("notificationCreated", handler);
  }

  onPresenceChanged(handler) {
    return this.subscribe("presenceChanged", handler);
  }

  onTypingChanged(handler) {
    return this.subscribe("typingChanged", handler);
  }

  onVoiceParticipantsUpdated(handler) {
    return this.subscribe("voiceParticipantsUpdated", handler);
  }

  onWebRtcSignal(handler) {
    return this.subscribe("webrtcSignal", handler);
  }

  async stop() {
    this.joinedChannelIds.clear();
    this.activeVoiceSession = null;

    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }

    this.emitConnectionState("disconnected");
  }
}

export const chatSignalR = new ChatSignalRService();
