import axios from "axios";

const STORAGE_KEYS = {
  token: "clearcord.token",
  user: "clearcord.user"
};

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

export const API_BASE_URL = configuredBaseUrl
  ? configuredBaseUrl.replace(/\/+$/, "")
  : "";

export function getStoredToken() {
  return window.localStorage.getItem(STORAGE_KEYS.token);
}

export function getStoredUser() {
  const raw = window.localStorage.getItem(STORAGE_KEYS.user);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function persistSession(authResponse) {
  window.localStorage.setItem(STORAGE_KEYS.token, authResponse.accessToken);
  window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(authResponse.user));
}

export function updateStoredUser(user) {
  window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
}

export function clearSession() {
  window.localStorage.removeItem(STORAGE_KEYS.token);
  window.localStorage.removeItem(STORAGE_KEYS.user);
}

export function toAssetUrl(value) {
  if (!value) {
    return "";
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (value.startsWith("/")) {
    return API_BASE_URL ? `${API_BASE_URL}${value}` : value;
  }

  return API_BASE_URL ? `${API_BASE_URL}/${value}` : `/${value}`;
}

function createApiError(error) {
  const validationErrors = error?.response?.data?.errors;
  const validationMessage = validationErrors
    ? Object.values(validationErrors)
        .flat()
        .filter(Boolean)
        .join(" ")
    : "";

  const message =
    error?.response?.data?.error ||
    validationMessage ||
    error?.response?.data?.title ||
    error?.message ||
    "Request failed.";

  const apiError = new Error(message);
  apiError.status = error?.response?.status;
  apiError.payload = error?.response?.data;
  return apiError;
}

export const api = axios.create({
  baseURL: API_BASE_URL || undefined,
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearSession();
      window.dispatchEvent(new CustomEvent("clearcord:unauthorized"));
    }

    return Promise.reject(createApiError(error));
  }
);

function buildMessageFormData({ content, replyToMessageId, files }) {
  const formData = new FormData();

  if (content) {
    formData.append("content", content);
  }

  if (replyToMessageId) {
    formData.append("replyToMessageId", replyToMessageId);
  }

  Array.from(files || []).forEach((file) => {
    formData.append("files", file);
  });

  return formData;
}

export const authApi = {
  async register(payload) {
    const response = await api.post("/api/auth/register", payload);
    return response.data;
  },
  async login(payload) {
    const response = await api.post("/api/auth/login", payload);
    return response.data;
  },
  async logout() {
    await api.post("/api/auth/logout");
  },
  async forgotPassword(payload) {
    const response = await api.post("/api/auth/forgot-password", payload);
    return response.data;
  },
  async resetPassword(payload) {
    await api.post("/api/auth/reset-password", payload);
  }
};

export const userApi = {
  async getCurrentUser() {
    const response = await api.get("/api/users/me");
    return response.data;
  },
  async updateCurrentUser(payload) {
    const response = await api.put("/api/users/me", payload);
    return response.data;
  },
  async uploadAvatar(file) {
    const formData = new FormData();
    formData.append("avatar", file);

    const response = await api.post("/api/users/me/avatar", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });

    return response.data;
  },
  async search(term) {
    const response = await api.get("/api/users/search", {
      params: {
        term
      }
    });

    return response.data;
  },
  async getById(userId) {
    const response = await api.get(`/api/users/${userId}`);
    return response.data;
  }
};

export const friendApi = {
  async getFriends() {
    const response = await api.get("/api/friends");
    return response.data;
  },
  async getRequests() {
    const response = await api.get("/api/friends/requests");
    return response.data;
  },
  async sendRequest(targetUserId) {
    const response = await api.post("/api/friends/requests", {
      targetUserId
    });
    return response.data;
  },
  async acceptRequest(requestId) {
    const response = await api.post(`/api/friends/requests/${requestId}/accept`);
    return response.data;
  },
  async rejectRequest(requestId) {
    const response = await api.post(`/api/friends/requests/${requestId}/reject`);
    return response.data;
  },
  async unfriend(friendUserId) {
    await api.delete(`/api/friends/${friendUserId}`);
  }
};

export const serverApi = {
  async getServers() {
    const response = await api.get("/api/servers");
    return response.data;
  },
  async getServerDetails(serverId) {
    const response = await api.get(`/api/servers/${serverId}`);
    return response.data;
  },
  async createServer(payload) {
    const response = await api.post("/api/servers", payload);
    return response.data;
  },
  async updateServer(serverId, payload) {
    const response = await api.put(`/api/servers/${serverId}`, payload);
    return response.data;
  },
  async deleteServer(serverId) {
    await api.delete(`/api/servers/${serverId}`);
  },
  async joinServer(inviteCode) {
    const response = await api.post("/api/servers/join", {
      inviteCode
    });
    return response.data;
  },
  async leaveServer(serverId) {
    await api.post(`/api/servers/${serverId}/leave`);
  },
  async getMembers(serverId) {
    const response = await api.get(`/api/servers/${serverId}/members`);
    return response.data;
  },
  async getInvite(serverId) {
    const response = await api.get(`/api/servers/${serverId}/invite`);
    return response.data;
  },
  async createRole(serverId, payload) {
    const response = await api.post(`/api/servers/${serverId}/roles`, payload);
    return response.data;
  },
  async assignRole(serverId, roleId, userId) {
    await api.post(`/api/servers/${serverId}/roles/${roleId}/assign`, {
      userId
    });
  },
  async kickMember(serverId, userId, reason) {
    await api.post(`/api/servers/${serverId}/members/${userId}/kick`, {
      reason: reason || null
    });
  },
  async banMember(serverId, userId, reason) {
    await api.post(`/api/servers/${serverId}/members/${userId}/ban`, {
      reason: reason || null
    });
  }
};

export const channelApi = {
  async createCategory(serverId, payload) {
    const response = await api.post(`/api/servers/${serverId}/categories`, payload);
    return response.data;
  },
  async updateCategory(categoryId, payload) {
    const response = await api.put(`/api/categories/${categoryId}`, payload);
    return response.data;
  },
  async deleteCategory(categoryId) {
    await api.delete(`/api/categories/${categoryId}`);
  },
  async createChannel(serverId, payload) {
    const response = await api.post(`/api/servers/${serverId}/channels`, payload);
    return response.data;
  },
  async updateChannel(channelId, payload) {
    const response = await api.put(`/api/channels/${channelId}`, payload);
    return response.data;
  },
  async deleteChannel(channelId) {
    await api.delete(`/api/channels/${channelId}`);
  }
};

export const messageApi = {
  async getChannelMessages(channelId) {
    const response = await api.get(`/api/channels/${channelId}/messages`, {
      params: {
        page: 1,
        pageSize: 100
      }
    });

    return response.data;
  },
  async createMessageWithFiles(channelId, payload) {
    const response = await api.post(
      `/api/channels/${channelId}/messages`,
      buildMessageFormData(payload),
      {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      }
    );

    return response.data;
  },
  async updateMessage(messageId, payload) {
    const response = await api.put(`/api/messages/${messageId}`, payload);
    return response.data;
  },
  async deleteMessage(messageId) {
    await api.delete(`/api/messages/${messageId}`);
  },
  async togglePin(messageId) {
    const response = await api.post(`/api/messages/${messageId}/pin`);
    return response.data;
  },
  async addReaction(messageId, emoji) {
    const response = await api.post(`/api/messages/${messageId}/reactions`, {
      emoji
    });
    return response.data;
  },
  async removeReaction(messageId, emoji) {
    const encodedEmoji = encodeURIComponent(emoji);
    const response = await api.delete(`/api/messages/${messageId}/reactions/${encodedEmoji}`);
    return response.data;
  }
};

export const notificationApi = {
  async getMine() {
    const response = await api.get("/api/notifications");
    return response.data;
  },
  async markRead(notificationId) {
    await api.post(`/api/notifications/${notificationId}/read`);
  },
  async markAllRead() {
    await api.post("/api/notifications/read-all");
  }
};

export const voiceApi = {
  async getParticipants(channelId) {
    const response = await api.get(`/api/channels/${channelId}/voice/participants`);
    return response.data;
  }
};
