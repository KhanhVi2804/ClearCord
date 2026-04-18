using ClearCord.Enums;

namespace ClearCord.Entities;

public sealed class FriendRequest
{
    public Guid Id { get; set; }
    public string RequesterId { get; set; } = string.Empty;
    public string AddresseeId { get; set; } = string.Empty;
    public FriendRequestStatus Status { get; set; } = FriendRequestStatus.Pending;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? RespondedAt { get; set; }

    public ApplicationUser Requester { get; set; } = null!;
    public ApplicationUser Addressee { get; set; } = null!;
}
