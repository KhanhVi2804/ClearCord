namespace ClearCord.Enums;

public enum FriendRequestStatus
{
    Pending = 1,
    Accepted = 2,
    Rejected = 3
}

public enum ChannelType
{
    Text = 1,
    Voice = 2
}

public enum NotificationType
{
    Message = 1,
    FriendRequest = 2,
    ServerEvent = 3,
    System = 4
}

[Flags]
public enum PermissionType
{
    None = 0,
    ViewChannels = 1 << 0,
    SendMessages = 1 << 1,
    ManageMessages = 1 << 2,
    PinMessages = 1 << 3,
    ConnectToVoice = 1 << 4,
    ModerateVoice = 1 << 5,
    ManageChannels = 1 << 6,
    ManageRoles = 1 << 7,
    KickMembers = 1 << 8,
    BanMembers = 1 << 9,
    ManageServer = 1 << 10
}

public enum WebRtcSignalType
{
    Offer = 1,
    Answer = 2,
    IceCandidate = 3,
    Hangup = 4
}
