import { createContext, useContext, useEffect, useMemo, useState } from "react";

const LANGUAGE_STORAGE_KEY = "clearcord.language";

export const LANGUAGE_OPTIONS = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "English" }
];

const messages = {
  en: {
    app: {
      splashEyebrow: "ClearCord",
      splashTitle: "Connecting your workspace...",
      splashBody: "Refreshing your session and preparing the chat client."
    },
    common: {
      close: "Close",
      cancel: "Cancel",
      save: "Save",
      delete: "Delete",
      edit: "Edit",
      reply: "Reply",
      search: "Search",
      online: "Online",
      offline: "Offline",
      loading: "Loading...",
      create: "Create",
      join: "Join",
      leave: "Leave",
      send: "Send",
      copied: "Copied",
      copy: "Copy",
      language: "Language",
      profile: "Profile",
      unknownUser: "Unknown user",
      members: "Members",
      channel: "Channel",
      server: "Server",
      all: "All"
    },
    tabs: {
      chat: "Chat",
      friends: "Friends",
      calls: "Calls",
      alerts: "Alerts",
      admin: "Admin",
      profile: "Profile"
    },
    sidebar: {
      createServer: "Create server",
      joinServer: "Join with invite",
      alerts: "Alerts",
      logout: "Log out"
    },
    auth: {
      heroEyebrow: "Realtime Workspace",
      heroDescription:
        "A Discord-style client wired for ASP.NET Core APIs, SignalR, notifications, attachments, and WebRTC voice/video signaling.",
      featureRealtime: "Realtime chat with SignalR",
      featureCommunities: "Servers, friends, channels, and roles",
      featureCalls: "Voice, camera, and screen sharing",
      signalrLabel: "SignalR Hub",
      signalrValue: "/hubs/chat",
      readyLabel: "Ready to run",
      readyValue: "Backend serves the React app directly",
      inviteMessage:
        "You are opening invite code {inviteCode}. Sign in or create an account and ClearCord will join the server automatically.",
      signInTab: "Sign in",
      registerTab: "Register",
      resetTab: "Reset access",
      signInEyebrow: "Sign in",
      signInTitle: "Connect to your workspace",
      emailOrUsername: "Email or username",
      password: "Password",
      forgotPassword: "Forgot your password?",
      signingIn: "Signing in...",
      registerEyebrow: "Register",
      registerTitle: "Create a new ClearCord account",
      userName: "Username",
      displayName: "Display name",
      email: "Email",
      createAccount: "Create account",
      creatingAccount: "Creating...",
      usernameHelper:
        "Username should not contain spaces or accented characters. Put your Vietnamese name in Display name instead.",
      resetEyebrow: "Reset access",
      resetTitle: "Generate a password reset token",
      accountEmail: "Account email",
      generateToken: "Generate token",
      generatingToken: "Generating...",
      userId: "User ID",
      resetToken: "Reset token",
      newPassword: "New password",
      resetPassword: "Reset password",
      resettingPassword: "Resetting...",
      passwordResetComplete: "Password reset complete. You can now sign in.",
      hiddenWhenNotFound: "Hidden when email is not found",
      pasteReturnedUserId: "Paste the returned user ID",
      pasteReturnedToken: "Paste the returned token",
      jwtFootnote:
        "JWT is stored in localStorage, attached to Axios requests, and reused automatically for SignalR connections once you enter the workspace."
    },
    workspace: {
      signedIn: "Signed in",
      workingInside: "Working inside {server}",
      noServerSelected: "No server selected yet",
      membersOnline: "Members online",
      friendsOnline: "Friends online",
      unreadAlerts: "Unread alerts",
      liveConnection: "Live connection",
      freshWorkspace: "Fresh workspace",
      createOrJoin: "Create or join your first server",
      emptyWorkspaceBody:
        "The backend starts clean, so create a server here or join one with an invite code.",
      createServer: "Create server",
      joinWithInvite: "Join with invite",
      creatingServer: "Creating...",
      serverName: "Server name",
      description: "Description",
      inviteCode: "Invite code",
      joinServer: "Join server",
      joiningServer: "Joining...",
      inviteLink: "Invite link",
      serverOverview: "Workspace overview",
      channelSnapshot: "Current channel",
      noDescription: "Add a description in the admin panel to help members understand this workspace.",
      noTopic: "This channel does not have a topic yet.",
      memberDirectory: "Member directory",
      noMembers: "Members will appear here after they join the server.",
      textChannels: "Text channels",
      voiceChannels: "Voice channels",
      openProfile: "Open profile",
      copyInvite: "Copy invite link"
    },
    channel: {
      heading: "Server",
      looseChannels: "Loose Channels",
      noChannels: "No channels are available in this server yet.",
      noServer: "No server selected",
      textFallback: "Text channel",
      voiceFallback: "Voice channel",
      live: "live",
      textType: "Text",
      voiceType: "Voice",
      connectionConnected: "Connected",
      connectionConnecting: "Connecting",
      connectionReconnecting: "Reconnecting",
      connectionDisconnected: "Disconnected"
    },
    chat: {
      selectServer: "Select a server to load its channels and chat history.",
      selectChannel: "Select a text channel to join its real-time stream.",
      liveChannel: "Live Channel",
      conversationFallback: "Conversation synced through SignalR channel groups.",
      typing: "{users} typing...",
      loadingHistory: "Loading channel history...",
      noMessages: "No messages yet. Be the first one to speak in #{channel}.",
      clearReply: "Clear",
      messagePlaceholder: "Message #{channel}",
      attach: "Attach",
      sending: "Sending...",
      pinned: "Pinned",
      messages: "Messages",
      replyTo: "Replying to {name}",
      attachment: "Attachment",
      deletedMessage: "This message was deleted.",
      attachmentOnly: "Attachment only",
      edited: "edited",
      pin: "Pin",
      unpin: "Unpin",
      save: "Save",
      replyPreview: "Replying to {name}: {content}",
      viewProfile: "View {name} profile"
    },
    friends: {
      eyebrow: "Friends",
      title: "Search, add, and manage your friend list",
      searchUsers: "Find users",
      searchLabel: "Search by username or display name",
      searchPlaceholder: "Search users...",
      noSearchResults: "No users matched your search.",
      pendingRequests: "Pending requests",
      noRequests: "No pending friend requests.",
      currentFriends: "Current friends",
      loadingFriends: "Loading your friend graph...",
      noFriends: "You have not added any friends yet.",
      addFriend: "Add friend",
      accept: "Accept",
      reject: "Reject",
      unfriend: "Unfriend",
      viewProfile: "View profile"
    },
    notifications: {
      eyebrow: "Notifications",
      title: "Inbox and live event feed",
      unread: "{count} unread",
      markAllRead: "Mark all read",
      markRead: "Mark read",
      open: "Open",
      empty: "No notifications yet. New messages and friend requests will appear here.",
      typeFriendRequest: "Friend request",
      typeMessage: "Message",
      typeServerEvent: "Server event"
    },
    profile: {
      eyebrow: "Profile",
      title: "Update your identity and avatar",
      uploadAvatar: "Upload avatar",
      avatarUpdated: "Avatar updated.",
      profileUpdated: "Profile updated.",
      saveProfile: "Save profile",
      saving: "Saving...",
      bio: "Bio"
    },
    userProfile: {
      title: "User profile",
      subtitle: "Directory",
      loading: "Loading user profile...",
      notFound: "No user profile was found.",
      email: "Email",
      lastSeen: "Last seen",
      noActivity: "No activity yet",
      bio: "Bio",
      bioEmpty: "This user has not added a bio yet."
    },
    admin: {
      eyebrow: "Admin",
      title: "Server, channel, role, and moderation tools",
      empty: "Select a server to manage its settings, channels, roles, and members.",
      serverSettings: "Server settings",
      inviteCode: "Invite code",
      saveServer: "Save server",
      leaveServer: "Leave server",
      deleteServer: "Delete server",
      categories: "Categories",
      newCategory: "New category",
      addCategory: "Add category",
      channels: "Channels",
      channelName: "Channel name",
      type: "Type",
      category: "Category",
      topic: "Topic",
      position: "Position",
      createChannel: "Create channel",
      roles: "Roles",
      roleName: "Role name",
      color: "Color",
      defaultRole: "Default role for new members",
      createRole: "Create role",
      members: "Members",
      selectMember: "Select member",
      selectRole: "Select role",
      assignRole: "Assign role",
      kick: "Kick",
      ban: "Ban",
      noCategory: "No category",
      confirmation: "Confirmation",
      deleteServerConfirm: "This permanently removes the server and its channels.",
      leaveServerConfirm:
        "You will leave this server and lose direct access until you join again.",
      moderation: "Moderation",
      reason: "Reason",
      optionalReason: "Optional moderation note",
      banMember: "Ban member",
      kickMember: "Kick member",
      moderationNotice:
        "{member} will be {action} this server.",
      actionRemovedFrom: "removed from",
      actionBannedFrom: "banned from",
      serverUpdated: "Server updated.",
      categoryUpdated: "Category updated.",
      categoryDeleted: "Category deleted.",
      categoryCreated: "Category created.",
      channelUpdated: "Channel updated.",
      channelDeleted: "Channel deleted.",
      channelCreated: "Channel created.",
      roleCreated: "Role created.",
      roleAssigned: "Role assigned.",
      memberBanned: "Member banned.",
      memberKicked: "Member kicked."
    },
    permissions: {
      ViewChannels: "View channels",
      SendMessages: "Send messages",
      ManageMessages: "Manage messages",
      PinMessages: "Pin messages",
      ConnectToVoice: "Connect to voice",
      ModerateVoice: "Moderate voice",
      ManageChannels: "Manage channels",
      ManageRoles: "Manage roles",
      KickMembers: "Kick members",
      BanMembers: "Ban members",
      ManageServer: "Manage server"
    },
    voice: {
      eyebrow: "Voice + Video",
      title: "Peer-to-peer call workspace for {channel}",
      empty: "Select a voice channel to open the call workspace.",
      joinCall: "Join call",
      joining: "Joining...",
      leaveCall: "Leave call",
      mute: "Mute",
      unmute: "Unmute",
      turnCameraOn: "Turn camera on",
      turnCameraOff: "Turn camera off",
      shareScreen: "Share screen",
      stopShare: "Stop share",
      participants: "{count} participants",
      you: "{name} (you)",
      muted: "Muted",
      micLive: "Mic live",
      sharingScreen: "Sharing screen",
      cameraOn: "Camera on"
    }
  },
  vi: {
    app: {
      splashEyebrow: "ClearCord",
      splashTitle: "Đang kết nối vào workspace...",
      splashBody: "Đang khôi phục phiên đăng nhập và chuẩn bị giao diện chat."
    },
    common: {
      close: "Đóng",
      cancel: "Hủy",
      save: "Lưu",
      delete: "Xóa",
      edit: "Sửa",
      reply: "Trả lời",
      search: "Tìm kiếm",
      online: "Trực tuyến",
      offline: "Ngoại tuyến",
      loading: "Đang tải...",
      create: "Tạo",
      join: "Tham gia",
      leave: "Rời",
      send: "Gửi",
      copied: "Đã sao chép",
      copy: "Sao chép",
      language: "Ngôn ngữ",
      profile: "Hồ sơ",
      unknownUser: "Người dùng không xác định",
      members: "Thành viên",
      channel: "Kênh",
      server: "Server",
      all: "Tất cả"
    },
    tabs: {
      chat: "Chat",
      friends: "Bạn bè",
      calls: "Cuộc gọi",
      alerts: "Thông báo",
      admin: "Quản trị",
      profile: "Hồ sơ"
    },
    sidebar: {
      createServer: "Tạo server",
      joinServer: "Vào bằng lời mời",
      alerts: "Thông báo",
      logout: "Đăng xuất"
    },
    auth: {
      heroEyebrow: "Workspace thời gian thực",
      heroDescription:
        "Ứng dụng kiểu Discord kết nối với ASP.NET Core API, SignalR, thông báo, tệp đính kèm, và gọi voice/video qua WebRTC.",
      featureRealtime: "Chat thời gian thực bằng SignalR",
      featureCommunities: "Server, bạn bè, kênh và phân quyền",
      featureCalls: "Voice, camera và chia sẻ màn hình",
      signalrLabel: "SignalR Hub",
      signalrValue: "/hubs/chat",
      readyLabel: "Sẵn sàng chạy",
      readyValue: "Backend phục vụ trực tiếp ứng dụng React",
      inviteMessage:
        "Bạn đang mở mã mời {inviteCode}. Hãy đăng nhập hoặc tạo tài khoản, ClearCord sẽ tự động vào server.",
      signInTab: "Đăng nhập",
      registerTab: "Đăng ký",
      resetTab: "Quên mật khẩu",
      signInEyebrow: "Đăng nhập",
      signInTitle: "Vào workspace của bạn",
      emailOrUsername: "Email hoặc tên đăng nhập",
      password: "Mật khẩu",
      forgotPassword: "Quên mật khẩu?",
      signingIn: "Đang đăng nhập...",
      registerEyebrow: "Đăng ký",
      registerTitle: "Tạo tài khoản ClearCord mới",
      userName: "Tên đăng nhập",
      displayName: "Tên hiển thị",
      email: "Email",
      createAccount: "Tạo tài khoản",
      creatingAccount: "Đang tạo...",
      usernameHelper:
        "Tên đăng nhập không nên chứa khoảng trắng hoặc dấu tiếng Việt. Hãy dùng tên tiếng Việt ở phần Tên hiển thị.",
      resetEyebrow: "Khôi phục truy cập",
      resetTitle: "Tạo token đặt lại mật khẩu",
      accountEmail: "Email tài khoản",
      generateToken: "Tạo token",
      generatingToken: "Đang tạo...",
      userId: "Mã người dùng",
      resetToken: "Token đặt lại",
      newPassword: "Mật khẩu mới",
      resetPassword: "Đặt lại mật khẩu",
      resettingPassword: "Đang đặt lại...",
      passwordResetComplete: "Đã đặt lại mật khẩu. Bạn có thể đăng nhập lại.",
      hiddenWhenNotFound: "Ẩn khi không tìm thấy email",
      pasteReturnedUserId: "Dán mã người dùng vừa nhận",
      pasteReturnedToken: "Dán token vừa nhận",
      jwtFootnote:
        "JWT được lưu trong localStorage, tự gắn vào Axios request và được tái sử dụng cho SignalR sau khi bạn vào workspace."
    },
    workspace: {
      signedIn: "Đã đăng nhập",
      workingInside: "Đang làm việc trong {server}",
      noServerSelected: "Chưa chọn server nào",
      membersOnline: "Thành viên online",
      friendsOnline: "Bạn bè online",
      unreadAlerts: "Thông báo chưa đọc",
      liveConnection: "Kết nối",
      freshWorkspace: "Workspace mới",
      createOrJoin: "Tạo hoặc tham gia server đầu tiên",
      emptyWorkspaceBody:
        "Backend khởi động với dữ liệu trống, vì vậy bạn có thể tạo server mới hoặc tham gia bằng mã mời ngay tại đây.",
      createServer: "Tạo server",
      joinWithInvite: "Tham gia bằng mã mời",
      creatingServer: "Đang tạo...",
      serverName: "Tên server",
      description: "Mô tả",
      inviteCode: "Mã mời",
      joinServer: "Tham gia server",
      joiningServer: "Đang tham gia...",
      inviteLink: "Liên kết mời",
      serverOverview: "Tổng quan workspace",
      channelSnapshot: "Kênh hiện tại",
      noDescription: "Hãy thêm mô tả trong phần quản trị để thành viên hiểu rõ workspace này.",
      noTopic: "Kênh này chưa có chủ đề.",
      memberDirectory: "Danh sách thành viên",
      noMembers: "Thành viên sẽ xuất hiện ở đây sau khi tham gia server.",
      textChannels: "Kênh chữ",
      voiceChannels: "Kênh voice",
      openProfile: "Mở hồ sơ",
      copyInvite: "Sao chép link mời"
    },
    channel: {
      heading: "Server",
      looseChannels: "Kênh chưa phân loại",
      noChannels: "Server này chưa có kênh nào.",
      noServer: "Chưa chọn server",
      textFallback: "Kênh text",
      voiceFallback: "Kênh voice",
      live: "đang gọi",
      textType: "Text",
      voiceType: "Voice",
      connectionConnected: "Đã kết nối",
      connectionConnecting: "Đang kết nối",
      connectionReconnecting: "Đang nối lại",
      connectionDisconnected: "Mất kết nối"
    },
    chat: {
      selectServer: "Hãy chọn một server để tải danh sách kênh và lịch sử chat.",
      selectChannel: "Hãy chọn một kênh text để tham gia luồng chat thời gian thực.",
      liveChannel: "Kênh đang hoạt động",
      conversationFallback: "Cuộc trò chuyện đang được đồng bộ qua nhóm SignalR theo kênh.",
      typing: "{users} đang nhập...",
      loadingHistory: "Đang tải lịch sử tin nhắn...",
      noMessages: "Chưa có tin nhắn nào. Hãy là người đầu tiên bắt đầu ở #{channel}.",
      clearReply: "Bỏ trả lời",
      messagePlaceholder: "Nhắn vào #{channel}",
      attach: "Đính kèm",
      sending: "Đang gửi...",
      pinned: "Đã ghim",
      messages: "Tin nhắn",
      replyTo: "Đang trả lời {name}",
      attachment: "Tệp đính kèm",
      deletedMessage: "Tin nhắn này đã bị xóa.",
      attachmentOnly: "Chỉ có tệp đính kèm",
      edited: "đã sửa",
      pin: "Ghim",
      unpin: "Bỏ ghim",
      save: "Lưu",
      replyPreview: "Trả lời {name}: {content}",
      viewProfile: "Xem hồ sơ của {name}"
    },
    friends: {
      eyebrow: "Bạn bè",
      title: "Tìm kiếm, kết bạn và quản lý danh sách bạn bè",
      searchUsers: "Tìm người dùng",
      searchLabel: "Tìm theo tên đăng nhập hoặc tên hiển thị",
      searchPlaceholder: "Tìm người dùng...",
      noSearchResults: "Không tìm thấy người dùng phù hợp.",
      pendingRequests: "Lời mời đang chờ",
      noRequests: "Không có lời mời kết bạn nào.",
      currentFriends: "Bạn bè hiện tại",
      loadingFriends: "Đang tải quan hệ bạn bè...",
      noFriends: "Bạn chưa thêm người bạn nào.",
      addFriend: "Kết bạn",
      accept: "Chấp nhận",
      reject: "Từ chối",
      unfriend: "Hủy kết bạn",
      viewProfile: "Xem hồ sơ"
    },
    notifications: {
      eyebrow: "Thông báo",
      title: "Hộp thư đến và luồng sự kiện trực tiếp",
      unread: "{count} chưa đọc",
      markAllRead: "Đánh dấu đã đọc tất cả",
      markRead: "Đánh dấu đã đọc",
      open: "Mở",
      empty: "Chưa có thông báo nào. Tin nhắn mới và lời mời kết bạn sẽ hiện ở đây.",
      typeFriendRequest: "Lời mời kết bạn",
      typeMessage: "Tin nhắn",
      typeServerEvent: "Sự kiện server"
    },
    profile: {
      eyebrow: "Hồ sơ",
      title: "Cập nhật danh tính và ảnh đại diện",
      uploadAvatar: "Tải ảnh đại diện",
      avatarUpdated: "Đã cập nhật ảnh đại diện.",
      profileUpdated: "Đã cập nhật hồ sơ.",
      saveProfile: "Lưu hồ sơ",
      saving: "Đang lưu...",
      bio: "Giới thiệu"
    },
    userProfile: {
      title: "Hồ sơ người dùng",
      subtitle: "Danh bạ",
      loading: "Đang tải hồ sơ người dùng...",
      notFound: "Không tìm thấy hồ sơ người dùng.",
      email: "Email",
      lastSeen: "Hoạt động gần nhất",
      noActivity: "Chưa có hoạt động",
      bio: "Giới thiệu",
      bioEmpty: "Người dùng này chưa thêm phần giới thiệu."
    },
    admin: {
      eyebrow: "Quản trị",
      title: "Công cụ quản lý server, kênh, vai trò và kiểm duyệt",
      empty: "Hãy chọn một server để quản lý cài đặt, kênh, vai trò và thành viên.",
      serverSettings: "Cài đặt server",
      inviteCode: "Mã mời",
      saveServer: "Lưu server",
      leaveServer: "Rời server",
      deleteServer: "Xóa server",
      categories: "Danh mục",
      newCategory: "Danh mục mới",
      addCategory: "Thêm danh mục",
      channels: "Kênh",
      channelName: "Tên kênh",
      type: "Loại",
      category: "Danh mục",
      topic: "Chủ đề",
      position: "Vị trí",
      createChannel: "Tạo kênh",
      roles: "Vai trò",
      roleName: "Tên vai trò",
      color: "Màu",
      defaultRole: "Vai trò mặc định cho thành viên mới",
      createRole: "Tạo vai trò",
      members: "Thành viên",
      selectMember: "Chọn thành viên",
      selectRole: "Chọn vai trò",
      assignRole: "Gán vai trò",
      kick: "Kick",
      ban: "Ban",
      noCategory: "Không có danh mục",
      confirmation: "Xác nhận",
      deleteServerConfirm: "Hành động này sẽ xóa vĩnh viễn server và toàn bộ kênh của nó.",
      leaveServerConfirm:
        "Bạn sẽ rời khỏi server này và mất quyền truy cập cho đến khi được tham gia lại.",
      moderation: "Kiểm duyệt",
      reason: "Lý do",
      optionalReason: "Ghi chú kiểm duyệt (không bắt buộc)",
      banMember: "Ban thành viên",
      kickMember: "Kick thành viên",
      moderationNotice: "{member} sẽ bị {action} server này.",
      actionRemovedFrom: "xóa khỏi",
      actionBannedFrom: "cấm khỏi",
      serverUpdated: "Đã cập nhật server.",
      categoryUpdated: "Đã cập nhật danh mục.",
      categoryDeleted: "Đã xóa danh mục.",
      categoryCreated: "Đã tạo danh mục.",
      channelUpdated: "Đã cập nhật kênh.",
      channelDeleted: "Đã xóa kênh.",
      channelCreated: "Đã tạo kênh.",
      roleCreated: "Đã tạo vai trò.",
      roleAssigned: "Đã gán vai trò.",
      memberBanned: "Đã ban thành viên.",
      memberKicked: "Đã kick thành viên."
    },
    permissions: {
      ViewChannels: "Xem kênh",
      SendMessages: "Gửi tin nhắn",
      ManageMessages: "Quản lý tin nhắn",
      PinMessages: "Ghim tin nhắn",
      ConnectToVoice: "Vào kênh voice",
      ModerateVoice: "Điều phối voice",
      ManageChannels: "Quản lý kênh",
      ManageRoles: "Quản lý vai trò",
      KickMembers: "Kick thành viên",
      BanMembers: "Ban thành viên",
      ManageServer: "Quản lý server"
    },
    voice: {
      eyebrow: "Voice + Video",
      title: "Không gian gọi ngang hàng cho {channel}",
      empty: "Hãy chọn một kênh voice để mở không gian cuộc gọi.",
      joinCall: "Tham gia cuộc gọi",
      joining: "Đang tham gia...",
      leaveCall: "Rời cuộc gọi",
      mute: "Tắt mic",
      unmute: "Bật mic",
      turnCameraOn: "Bật camera",
      turnCameraOff: "Tắt camera",
      shareScreen: "Chia sẻ màn hình",
      stopShare: "Dừng chia sẻ",
      participants: "{count} người tham gia",
      you: "{name} (bạn)",
      muted: "Đã tắt mic",
      micLive: "Mic đang bật",
      sharingScreen: "Đang chia sẻ màn hình",
      cameraOn: "Camera đang bật"
    }
  }
};

const I18nContext = createContext(null);

function resolveMessage(language, key) {
  return key.split(".").reduce((value, part) => value?.[part], messages[language]);
}

function interpolate(template, params) {
  if (typeof template !== "string" || !params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, key) => `${params[key] ?? ""}`);
}

function getInitialLanguage() {
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === "vi" || stored === "en") {
    return stored;
  }

  return window.navigator.language?.toLowerCase().startsWith("vi") ? "vi" : "en";
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(getInitialLanguage);

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(() => {
    const locale = language === "vi" ? "vi-VN" : "en-US";

    return {
      language,
      setLanguage,
      locale,
      t(key, params) {
        const template =
          resolveMessage(language, key) ??
          resolveMessage("en", key) ??
          key;

        return interpolate(template, params);
      },
      formatTime(value) {
        if (!value) {
          return "";
        }

        return new Intl.DateTimeFormat(locale, {
          hour: "2-digit",
          minute: "2-digit"
        }).format(new Date(value));
      },
      formatDateTime(value) {
        if (!value) {
          return "";
        }

        return new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
          timeStyle: "short"
        }).format(new Date(value));
      }
    };
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used inside LanguageProvider.");
  }

  return context;
}
