import ChannelList from "./ChannelList";
import FriendsPanel from "./FriendsPanel";
import NotificationsPanel from "./NotificationsPanel";

function SecondaryPanel({
  activeView,
  server,
  selectedTextChannelId,
  activeVoiceChannelId,
  connectionState,
  onSelectChannel,
  friends,
  friendRequests,
  searchTerm,
  searchResults,
  isFriendsLoading,
  socialError,
  onSearchTermChange,
  onSendFriendRequest,
  onAcceptFriendRequest,
  onRejectFriendRequest,
  onUnfriend,
  onStartDirectChat,
  onStartDirectCall,
  onViewProfile,
  notifications,
  onOpenNotification,
  onMarkNotificationRead,
  onMarkAllNotificationsRead
}) {
  if (activeView === "friends") {
    return (
      <FriendsPanel
        friends={friends}
        requests={friendRequests}
        searchTerm={searchTerm}
        searchResults={searchResults}
        isLoading={isFriendsLoading}
        error={socialError}
        onSearchTermChange={onSearchTermChange}
        onSendRequest={onSendFriendRequest}
        onAcceptRequest={onAcceptFriendRequest}
        onRejectRequest={onRejectFriendRequest}
        onUnfriend={onUnfriend}
        onStartDirectChat={onStartDirectChat}
        onStartDirectCall={onStartDirectCall}
        onViewProfile={onViewProfile}
      />
    );
  }

  if (activeView === "notifications") {
    return (
      <NotificationsPanel
        notifications={notifications}
        onOpenNotification={onOpenNotification}
        onMarkRead={onMarkNotificationRead}
        onMarkAllRead={onMarkAllNotificationsRead}
      />
    );
  }

  return (
    <ChannelList
      server={server}
      selectedTextChannelId={selectedTextChannelId}
      activeVoiceChannelId={activeVoiceChannelId}
      connectionState={connectionState}
      onSelectChannel={onSelectChannel}
    />
  );
}

export default SecondaryPanel;
