using ClearCord.Enums;

namespace ClearCord.Entities;

public sealed class ServerRolePermission
{
    public Guid Id { get; set; }
    public Guid ServerRoleId { get; set; }
    public PermissionType Permission { get; set; }

    public ServerRole ServerRole { get; set; } = null!;
}
