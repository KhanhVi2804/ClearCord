namespace ClearCord.Entities;

public sealed class ServerRole
{
    public Guid Id { get; set; }
    public Guid ServerId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ColorHex { get; set; } = "#6B7280";
    public int Position { get; set; }
    public bool IsDefault { get; set; }
    public bool IsSystemRole { get; set; }

    public Server Server { get; set; } = null!;
    public ICollection<ServerRolePermission> Permissions { get; set; } = new List<ServerRolePermission>();
    public ICollection<ServerRoleAssignment> Assignments { get; set; } = new List<ServerRoleAssignment>();
}
