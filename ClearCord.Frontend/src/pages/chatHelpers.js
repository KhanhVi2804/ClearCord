export const ALL_PERMISSIONS = [
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

export function upsertMessage(messages, incomingMessage) {
  const exists = messages.some((message) => message.id === incomingMessage.id);
  const nextMessages = exists
    ? messages.map((message) => (message.id === incomingMessage.id ? incomingMessage : message))
    : [...messages, incomingMessage];

  return nextMessages.sort(
    (left, right) => new Date(left.createdAt) - new Date(right.createdAt)
  );
}

export function markMessageDeleted(messages, messageId) {
  return messages.map((message) =>
    message.id === messageId
      ? {
          ...message,
          content: null,
          isDeleted: true
        }
      : message
  );
}

export function sortNotifications(notifications) {
  return [...notifications].sort(
    (left, right) => new Date(right.createdAt) - new Date(left.createdAt)
  );
}

export function updatePresenceInUsers(users, payload, idSelector = (user) => user.id) {
  return users.map((user) =>
    idSelector(user) === payload.userId
      ? {
          ...user,
          isOnline: payload.isOnline
        }
      : user
  );
}

export function resolveTypingUsers(typingMap, currentUser, friends, requests, searchResults, server) {
  const memberLookup = new Map();

  if (currentUser) {
    memberLookup.set(currentUser.id, currentUser);
  }

  friends.forEach((friend) => {
    memberLookup.set(friend.userId, {
      id: friend.userId,
      userName: friend.userName,
      displayName: friend.displayName,
      avatarUrl: friend.avatarUrl,
      isOnline: friend.isOnline
    });
  });

  requests.forEach((request) => {
    memberLookup.set(request.user.id, request.user);
  });

  searchResults.forEach((user) => {
    memberLookup.set(user.id, user);
  });

  server?.members?.forEach((member) => {
    memberLookup.set(member.userId, {
      id: member.userId,
      userName: member.userName,
      displayName: member.displayName,
      avatarUrl: member.avatarUrl
    });
  });

  return Array.from(typingMap.entries())
    .filter(([, isTyping]) => isTyping)
    .map(([userId]) => memberLookup.get(userId))
    .filter(Boolean);
}

export function computePermissions(server, currentUserId) {
  if (!server || !currentUserId) {
    return new Set();
  }

  if (server.ownerId === currentUserId) {
    return new Set(ALL_PERMISSIONS);
  }

  const currentMember = server.members?.find((member) => member.userId === currentUserId);
  return new Set(currentMember?.roles?.flatMap((role) => role.permissions) ?? []);
}
