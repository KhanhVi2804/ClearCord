import assert from "node:assert/strict";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";

const baseUrl = process.env.CLEARCORD_BASE_URL ?? "http://localhost:5187";
const runId = Date.now().toString(36);
const THUMBS_UP = "\u{1F44D}";
const KNOWN_HUB_EVENTS = [
  "messageCreated",
  "messageUpdated",
  "messageDeleted",
  "messageReactionChanged",
  "messagePinnedChanged",
  "notificationCreated",
  "presenceChanged",
  "typingChanged",
  "voiceParticipantsUpdated",
  "webrtcSignal"
];

function log(step, detail = "") {
  console.log(`[smoke] ${step}${detail ? `: ${detail}` : ""}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(path, { method = "GET", token, json, formData, expectedStatus } = {}) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let body;
  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  } else if (formData) {
    body = formData;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body
  });

  if (expectedStatus && response.status !== expectedStatus) {
    const text = await response.text();
    throw new Error(`${method} ${path} expected ${expectedStatus} but got ${response.status}: ${text}`);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${method} ${path} failed ${response.status}: ${text}`);
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

async function waitUntil(fn, description, timeoutMs = 10000, intervalMs = 300) {
  const start = Date.now();
  let lastError = null;

  while (Date.now() - start < timeoutMs) {
    try {
      const value = await fn();
      if (value) {
        return value;
      }
    } catch (error) {
      lastError = error;
    }

    await sleep(intervalMs);
  }

  throw new Error(`Timed out waiting for ${description}${lastError ? ` (${lastError.message})` : ""}`);
}

async function registerUser(label) {
  const userName = `${label}_${runId}`.toLowerCase();
  const displayName = `${label} ${runId}`;
  const email = `${userName}@example.com`;
  const password = "Password123";

  const auth = await request("/api/auth/register", {
    method: "POST",
    json: {
      userName,
      displayName,
      email,
      password
    }
  });

  return {
    userName,
    displayName,
    email,
    password,
    token: auth.accessToken,
    user: auth.user
  };
}

async function login(emailOrUserName, password) {
  return request("/api/auth/login", {
    method: "POST",
    json: {
      emailOrUserName,
      password
    }
  });
}

async function connectHub(token) {
  const connection = new HubConnectionBuilder()
    .withUrl(`${baseUrl}/hubs/chat`, {
      accessTokenFactory: () => token
    })
    .configureLogging(LogLevel.Warning)
    .withAutomaticReconnect()
    .build();

  for (const eventName of KNOWN_HUB_EVENTS) {
    connection.on(eventName, () => {});
  }

  await connection.start();
  return connection;
}

function onceHubEvent(connection, eventName, predicate, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      connection.off(eventName, handler);
      reject(new Error(`Timed out waiting for hub event ${eventName}`));
    }, timeoutMs);

    const handler = (payload) => {
      try {
        if (!predicate || predicate(payload)) {
          clearTimeout(timeoutId);
          connection.off(eventName, handler);
          resolve(payload);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        connection.off(eventName, handler);
        reject(error);
      }
    };

    connection.on(eventName, handler);
  });
}

function buildTinyPngBlob() {
  const bytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9pJvC2AAAAAASUVORK5CYII=",
    "base64"
  );
  return new Blob([bytes], { type: "image/png" });
}

async function requestAttachment(url, expectedContentType) {
  const response = await fetch(url.startsWith("http") ? url : `${baseUrl}${url}`);
  if (!response.ok) {
    throw new Error(`Attachment request failed ${response.status} for ${url}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (expectedContentType && !contentType.includes(expectedContentType)) {
    throw new Error(`Attachment ${url} expected content type ${expectedContentType} but got ${contentType}`);
  }
}

async function main() {
  log("health");
  const health = await request("/api/health");
  assert.equal(health.service, "ClearCord API");

  log("register users");
  const userA = await registerUser("alpha");
  const userB = await registerUser("bravo");
  const userC = await registerUser("charlie");

  log("forgot/reset password");
  const reset = await request("/api/auth/forgot-password", {
    method: "POST",
    json: {
      email: userA.email
    }
  });
  const nextPassword = "Password456";
  await request("/api/auth/reset-password", {
    method: "POST",
    json: {
      userId: reset.userId,
      token: reset.resetToken,
      newPassword: nextPassword
    },
    expectedStatus: 204
  });
  const reloginA = await login(userA.email, nextPassword);
  userA.token = reloginA.accessToken;
  userA.user = reloginA.user;
  const reloginB = await login(userB.userName, userB.password);
  userB.token = reloginB.accessToken;
  userB.user = reloginB.user;

  log("profile update + avatar + search");
  const updatedA = await request("/api/users/me", {
    method: "PUT",
    token: userA.token,
    json: {
      displayName: `${userA.displayName} Prime`,
      bio: `Smoke bio ${runId}`
    }
  });
  assert.match(updatedA.displayName, /Prime/);
  const avatarData = new FormData();
  avatarData.append("avatar", buildTinyPngBlob(), "avatar.png");
  const avatarA = await request("/api/users/me/avatar", {
    method: "POST",
    token: userA.token,
    formData: avatarData
  });
  assert(avatarA.avatarUrl, "avatar upload should return a URL");
  await requestAttachment(avatarA.avatarUrl, "image/png");
  const foundUsers = await request(`/api/users/search?term=${encodeURIComponent(userB.userName)}`, {
    token: userA.token
  });
  assert(foundUsers.some((user) => user.id === userB.user.id), "user search should find the second account");
  const profileB = await request(`/api/users/${userB.user.id}`, {
    token: userA.token
  });
  assert.equal(profileB.userName, userB.user.userName);
  const profileAForB = await request(`/api/users/${userA.user.id}`, {
    token: userB.token
  });
  assert(profileAForB.avatarUrl, "profile lookup should expose uploaded avatar");

  log("friend request accept");
  await request("/api/friends/requests", {
    method: "POST",
    token: userA.token,
    json: {
      targetUserId: userB.user.id
    }
  });
  const pendingForB = await waitUntil(async () => {
    const requests = await request("/api/friends/requests", { token: userB.token });
    return requests.find((item) => item.user.id === userA.user.id) || null;
  }, "friend request for user B");
  await request(`/api/friends/requests/${pendingForB.id}/accept`, {
    method: "POST",
    token: userB.token
  });
  const friendsA = await request("/api/friends", { token: userA.token });
  assert(friendsA.some((friend) => friend.userId === userB.user.id), "accepted friend should appear");

  log("friend request reject");
  await request("/api/friends/requests", {
    method: "POST",
    token: userB.token,
    json: {
      targetUserId: userC.user.id
    }
  });
  const pendingForC = await waitUntil(async () => {
    const requests = await request("/api/friends/requests", { token: userC.token });
    return requests.find((item) => item.user.id === userB.user.id) || null;
  }, "friend request for user C");
  await request(`/api/friends/requests/${pendingForC.id}/reject`, {
    method: "POST",
    token: userC.token
  });
  const rejectedFriends = await request("/api/friends", { token: userC.token });
  assert(!rejectedFriends.some((friend) => friend.userId === userB.user.id), "rejected request should not create a friendship");

  log("server create + channel/category admin");
  const server = await request("/api/servers", {
    method: "POST",
    token: userA.token,
    json: {
      name: `Smoke Server ${runId}`,
      description: "Automated smoke server"
    }
  });
  const invite = await request(`/api/servers/${server.id}/invite`, { token: userA.token });
  const category = await request(`/api/servers/${server.id}/categories`, {
    method: "POST",
    token: userA.token,
    json: {
      name: "Testing",
      position: 5
    }
  });
  await request(`/api/categories/${category.id}`, {
    method: "PUT",
    token: userA.token,
    json: {
      name: "Testing Hub",
      position: 6
    }
  });
  const textChannel = await request(`/api/servers/${server.id}/channels`, {
    method: "POST",
    token: userA.token,
    json: {
      name: "qa-room",
      type: "Text",
      categoryId: category.id,
      topic: "Smoke room",
      position: 10
    }
  });
  await request(`/api/channels/${textChannel.id}`, {
    method: "PUT",
    token: userA.token,
    json: {
      name: "qa-room-updated",
      categoryId: category.id,
      topic: "Smoke room updated",
      position: 11
    }
  });
  const voiceChannel = await request(`/api/servers/${server.id}/channels`, {
    method: "POST",
    token: userA.token,
    json: {
      name: "daily-call",
      type: "Voice",
      categoryId: category.id,
      topic: "Standup",
      position: 12
    }
  });
  const tempChannel = await request(`/api/servers/${server.id}/channels`, {
    method: "POST",
    token: userA.token,
    json: {
      name: "temp-delete",
      type: "Text",
      categoryId: category.id,
      topic: "Delete me",
      position: 13
    }
  });
  await request(`/api/channels/${tempChannel.id}`, {
    method: "DELETE",
    token: userA.token,
    expectedStatus: 204
  });

  log("join server + notifications");
  await request("/api/servers/join", {
    method: "POST",
    token: userB.token,
    json: {
      inviteCode: invite.inviteCode
    }
  });
  const serverMembers = await request(`/api/servers/${server.id}/members`, { token: userA.token });
  assert(serverMembers.some((member) => member.userId === userB.user.id), "joined user should appear in member list");
  const serverJoinNotification = await waitUntil(async () => {
    const notifications = await request("/api/notifications", { token: userA.token });
    return notifications.find((item) => item.type === "ServerEvent" && item.relatedEntityId === server.id) || null;
  }, "server join notification");
  assert(serverJoinNotification);

  const friendNotification = await waitUntil(async () => {
    const notifications = await request("/api/notifications", { token: userB.token });
    return notifications.find((item) => item.type === "FriendRequest") || null;
  }, "friend request notification");
  assert(friendNotification);

  log("realtime chat + typing + message actions");
  const connA = await connectHub(userA.token);
  const connB = await connectHub(userB.token);

  try {
    await connA.invoke("JoinServer", server.id);
    await connB.invoke("JoinServer", server.id);
    await connA.invoke("JoinChannel", textChannel.id);
    await connB.invoke("JoinChannel", textChannel.id);

    const typingEvent = onceHubEvent(connB, "typingChanged", (payload) => payload.channelId === textChannel.id && payload.isTyping === true);
    await connA.invoke("SendTyping", textChannel.id, true);
    await typingEvent;

    const createdForB = onceHubEvent(connB, "messageCreated", (payload) => payload.channelId === textChannel.id);
    const messageA = await connA.invoke("SendMessage", {
      channelId: textChannel.id,
      content: `Hello from ${runId}`,
      replyToMessageId: null
    });
    const incomingForB = await createdForB;
    assert.equal(incomingForB.id, messageA.id);

    const createdForA = onceHubEvent(connA, "messageCreated", (payload) => payload.channelId === textChannel.id && payload.replyTo?.id === messageA.id);
    const replyB = await connB.invoke("SendMessage", {
      channelId: textChannel.id,
      content: `Reply from ${runId}`,
      replyToMessageId: messageA.id
    });
    const incomingForA = await createdForA;
    assert.equal(incomingForA.id, replyB.id);

    const updatedMessage = await request(`/api/messages/${messageA.id}`, {
      method: "PUT",
      token: userA.token,
      json: {
        content: `Edited ${runId}`
      }
    });
    assert.equal(updatedMessage.content, `Edited ${runId}`);

    const pinned = await request(`/api/messages/${messageA.id}/pin`, {
      method: "POST",
      token: userA.token
    });
    assert.equal(pinned.isPinned, true);
    const unpinned = await request(`/api/messages/${messageA.id}/pin`, {
      method: "POST",
      token: userA.token
    });
    assert.equal(unpinned.isPinned, false);

    const reacted = await request(`/api/messages/${messageA.id}/reactions`, {
      method: "POST",
      token: userB.token,
      json: {
        emoji: THUMBS_UP
      }
    });
    assert(reacted.reactions.some((reaction) => reaction.emoji === THUMBS_UP));
    const unreacted = await request(`/api/messages/${messageA.id}/reactions/${encodeURIComponent(THUMBS_UP)}`, {
      method: "DELETE",
      token: userB.token
    });
    assert(!unreacted.reactions.some((reaction) => reaction.emoji === THUMBS_UP));

    const formData = new FormData();
    formData.append("content", `Files ${runId}`);
    formData.append("files", buildTinyPngBlob(), "pixel.png");
    formData.append("files", new Blob([`doc ${runId}`], { type: "text/plain" }), "note.txt");
    const fileMessage = await request(`/api/channels/${textChannel.id}/messages`, {
      method: "POST",
      token: userA.token,
      formData
    });
    assert(fileMessage.attachments.some((attachment) => attachment.isImage), "image attachment should be flagged");
    assert(fileMessage.attachments.some((attachment) => !attachment.isImage), "document attachment should be flagged");
    const imageAttachment = fileMessage.attachments.find((attachment) => attachment.isImage);
    const documentAttachment = fileMessage.attachments.find((attachment) => !attachment.isImage);
    assert(imageAttachment?.url, "image attachment should include a URL");
    assert(documentAttachment?.url, "document attachment should include a URL");
    await requestAttachment(imageAttachment.url, "image/png");
    await requestAttachment(documentAttachment.url, "text/plain");

    const channelMessages = await request(`/api/channels/${textChannel.id}/messages?page=1&pageSize=100`, {
      token: userA.token
    });
    assert(channelMessages.length >= 3, "channel history should include created messages");

    await request(`/api/messages/${replyB.id}`, {
      method: "DELETE",
      token: userB.token,
      expectedStatus: 204
    });
  } finally {
    await connA.stop();
    await connB.stop();
  }

  log("notifications read flow");
  const notificationsB = await request("/api/notifications", { token: userB.token });
  assert(notificationsB.length > 0, "notifications should exist for user B");
  const firstUnread = notificationsB.find((item) => !item.isRead);
  if (firstUnread) {
    await request(`/api/notifications/${firstUnread.id}/read`, {
      method: "POST",
      token: userB.token,
      expectedStatus: 204
    });
  }
  await request("/api/notifications/read-all", {
    method: "POST",
    token: userB.token,
    expectedStatus: 204
  });
  const allRead = await request("/api/notifications", { token: userB.token });
  assert(allRead.every((item) => item.isRead), "all notifications should be marked read");

  log("voice participants");
  const voiceConnA = await connectHub(userA.token);
  const voiceConnB = await connectHub(userB.token);

  try {
    await voiceConnA.invoke("JoinServer", server.id);
    await voiceConnB.invoke("JoinServer", server.id);
    const participantsReady = onceHubEvent(
      voiceConnA,
      "voiceParticipantsUpdated",
      (payload) => Array.isArray(payload) && payload.length >= 2
    );
    await voiceConnA.invoke("JoinVoiceChannel", voiceChannel.id, false, false, false);
    await voiceConnB.invoke("JoinVoiceChannel", voiceChannel.id, true, false, false);
    await participantsReady;
    const voiceParticipants = await request(`/api/channels/${voiceChannel.id}/voice/participants`, {
      token: userA.token
    });
    assert(voiceParticipants.length >= 2, "both users should appear in voice participants");
    await voiceConnB.invoke("UpdateVoiceState", voiceChannel.id, false, true, false);
    await voiceConnA.invoke("LeaveVoiceChannel", voiceChannel.id);
    await voiceConnB.invoke("LeaveVoiceChannel", voiceChannel.id);
  } finally {
    await voiceConnA.stop();
    await voiceConnB.stop();
  }

  log("roles + leave/kick/ban");
  const role = await request(`/api/servers/${server.id}/roles`, {
    method: "POST",
    token: userA.token,
    json: {
      name: `QA ${runId}`,
      colorHex: "#123456",
      permissions: ["ViewChannels", "SendMessages", "ConnectToVoice"],
      isDefault: false
    }
  });
  await request(`/api/servers/${server.id}/roles/${role.id}/assign`, {
    method: "POST",
    token: userA.token,
    json: {
      userId: userB.user.id
    },
    expectedStatus: 204
  });
  let details = await request(`/api/servers/${server.id}`, { token: userA.token });
  assert(details.members.some((member) => member.userId === userB.user.id && member.roles.some((memberRole) => memberRole.id === role.id)));

  await request(`/api/servers/${server.id}/leave`, {
    method: "POST",
    token: userB.token,
    expectedStatus: 204
  });
  await request("/api/servers/join", {
    method: "POST",
    token: userB.token,
    json: {
      inviteCode: invite.inviteCode
    }
  });
  await request(`/api/servers/${server.id}/members/${userB.user.id}/kick`, {
    method: "POST",
    token: userA.token,
    json: {
      reason: "Smoke kick"
    },
    expectedStatus: 204
  });
  await request("/api/servers/join", {
    method: "POST",
    token: userB.token,
    json: {
      inviteCode: invite.inviteCode
    }
  });
  await request(`/api/servers/${server.id}/members/${userB.user.id}/ban`, {
    method: "POST",
    token: userA.token,
    json: {
      reason: "Smoke ban"
    },
    expectedStatus: 204
  });

  let bannedJoinFailed = false;
  try {
    await request("/api/servers/join", {
      method: "POST",
      token: userB.token,
      json: {
        inviteCode: invite.inviteCode
      }
    });
  } catch (error) {
    bannedJoinFailed = /banned/i.test(error.message);
  }
  assert(bannedJoinFailed, "banned user should not be able to rejoin");

  log("delete server + unfriend + logout");
  await request(`/api/servers/${server.id}`, {
    method: "DELETE",
    token: userA.token,
    expectedStatus: 204
  });
  await request(`/api/friends/${userB.user.id}`, {
    method: "DELETE",
    token: userA.token,
    expectedStatus: 204
  });
  await request("/api/auth/logout", {
    method: "POST",
    token: userA.token,
    expectedStatus: 204
  });
  await request("/api/auth/logout", {
    method: "POST",
    token: userB.token,
    expectedStatus: 204
  });
  await request("/api/auth/logout", {
    method: "POST",
    token: userC.token,
    expectedStatus: 204
  });

  log("completed", "all automated smoke steps passed");
}

main().catch((error) => {
  console.error("[smoke] failed", error);
  process.exitCode = 1;
});
