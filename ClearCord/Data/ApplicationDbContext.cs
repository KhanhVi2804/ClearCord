using ClearCord.Entities;
using ClearCord.Repositories;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace ClearCord.Data;

public sealed class ApplicationDbContext : IdentityDbContext<ApplicationUser>, IUnitOfWork
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<FriendRequest> FriendRequests => Set<FriendRequest>();
    public DbSet<Server> Servers => Set<Server>();
    public DbSet<ServerMember> ServerMembers => Set<ServerMember>();
    public DbSet<ServerRole> ServerRoles => Set<ServerRole>();
    public DbSet<ServerRoleAssignment> ServerRoleAssignments => Set<ServerRoleAssignment>();
    public DbSet<ServerRolePermission> ServerRolePermissions => Set<ServerRolePermission>();
    public DbSet<ServerBan> ServerBans => Set<ServerBan>();
    public DbSet<ChannelCategory> ChannelCategories => Set<ChannelCategory>();
    public DbSet<Channel> Channels => Set<Channel>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<MessageReaction> MessageReactions => Set<MessageReaction>();
    public DbSet<MessageAttachment> MessageAttachments => Set<MessageAttachment>();
    public DbSet<UserNotification> Notifications => Set<UserNotification>();
    public DbSet<VoiceChannelParticipant> VoiceChannelParticipants => Set<VoiceChannelParticipant>();
    public DbSet<UserConnection> UserConnections => Set<UserConnection>();
    public DbSet<RevokedToken> RevokedTokens => Set<RevokedToken>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<ApplicationUser>()
            .Property(user => user.DisplayName)
            .HasMaxLength(64);

        builder.Entity<FriendRequest>()
            .HasIndex(request => new { request.RequesterId, request.AddresseeId })
            .IsUnique();

        builder.Entity<FriendRequest>()
            .HasOne(request => request.Requester)
            .WithMany(user => user.SentFriendRequests)
            .HasForeignKey(request => request.RequesterId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<FriendRequest>()
            .HasOne(request => request.Addressee)
            .WithMany(user => user.ReceivedFriendRequests)
            .HasForeignKey(request => request.AddresseeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Server>()
            .HasIndex(server => server.InviteCode)
            .IsUnique();

        builder.Entity<Server>()
            .Property(server => server.Name)
            .HasMaxLength(80);

        builder.Entity<Server>()
            .HasOne(server => server.Owner)
            .WithMany()
            .HasForeignKey(server => server.OwnerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<ServerMember>()
            .HasIndex(member => new { member.ServerId, member.UserId })
            .IsUnique();

        builder.Entity<ServerMember>()
            .HasOne(member => member.Server)
            .WithMany(server => server.Members)
            .HasForeignKey(member => member.ServerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<ServerMember>()
            .HasOne(member => member.User)
            .WithMany(user => user.ServerMemberships)
            .HasForeignKey(member => member.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<ServerRole>()
            .HasIndex(role => new { role.ServerId, role.Name })
            .IsUnique();

        builder.Entity<ServerRole>()
            .HasOne(role => role.Server)
            .WithMany(server => server.Roles)
            .HasForeignKey(role => role.ServerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<ServerRoleAssignment>()
            .HasIndex(assignment => new { assignment.ServerRoleId, assignment.UserId })
            .IsUnique();

        builder.Entity<ServerRoleAssignment>()
            .HasOne(assignment => assignment.ServerRole)
            .WithMany(role => role.Assignments)
            .HasForeignKey(assignment => assignment.ServerRoleId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<ServerRoleAssignment>()
            .HasOne(assignment => assignment.User)
            .WithMany(user => user.RoleAssignments)
            .HasForeignKey(assignment => assignment.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<ServerRolePermission>()
            .HasIndex(permission => new { permission.ServerRoleId, permission.Permission })
            .IsUnique();

        builder.Entity<ServerRolePermission>()
            .Property(permission => permission.Permission)
            .HasConversion<int>();

        builder.Entity<ServerBan>()
            .HasIndex(ban => new { ban.ServerId, ban.UserId })
            .IsUnique();

        builder.Entity<ServerBan>()
            .HasOne(ban => ban.Server)
            .WithMany(server => server.Bans)
            .HasForeignKey(ban => ban.ServerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<ServerBan>()
            .HasOne(ban => ban.User)
            .WithMany()
            .HasForeignKey(ban => ban.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<ServerBan>()
            .HasOne(ban => ban.BannedByUser)
            .WithMany()
            .HasForeignKey(ban => ban.BannedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<ChannelCategory>()
            .HasOne(category => category.Server)
            .WithMany(server => server.Categories)
            .HasForeignKey(category => category.ServerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Channel>()
            .Property(channel => channel.Type)
            .HasConversion<int>();

        builder.Entity<Channel>()
            .HasOne(channel => channel.Server)
            .WithMany(server => server.Channels)
            .HasForeignKey(channel => channel.ServerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Channel>()
            .HasOne(channel => channel.Category)
            .WithMany(category => category.Channels)
            .HasForeignKey(channel => channel.CategoryId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.Entity<Message>()
            .HasOne(message => message.Channel)
            .WithMany(channel => channel.Messages)
            .HasForeignKey(message => message.ChannelId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Message>()
            .HasOne(message => message.Sender)
            .WithMany(user => user.SentMessages)
            .HasForeignKey(message => message.SenderId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Message>()
            .HasOne(message => message.ReplyToMessage)
            .WithMany(message => message.Replies)
            .HasForeignKey(message => message.ReplyToMessageId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<MessageReaction>()
            .HasIndex(reaction => new { reaction.MessageId, reaction.UserId, reaction.Emoji })
            .IsUnique();

        builder.Entity<MessageReaction>()
            .HasOne(reaction => reaction.Message)
            .WithMany(message => message.Reactions)
            .HasForeignKey(reaction => reaction.MessageId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<MessageReaction>()
            .HasOne(reaction => reaction.User)
            .WithMany(user => user.MessageReactions)
            .HasForeignKey(reaction => reaction.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<MessageAttachment>()
            .HasOne(attachment => attachment.Message)
            .WithMany(message => message.Attachments)
            .HasForeignKey(attachment => attachment.MessageId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<UserNotification>()
            .Property(notification => notification.Type)
            .HasConversion<int>();

        builder.Entity<UserNotification>()
            .HasOne(notification => notification.User)
            .WithMany(user => user.Notifications)
            .HasForeignKey(notification => notification.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<UserConnection>()
            .HasIndex(connection => connection.ConnectionId)
            .IsUnique();

        builder.Entity<UserConnection>()
            .HasOne(connection => connection.User)
            .WithMany(user => user.Connections)
            .HasForeignKey(connection => connection.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<VoiceChannelParticipant>()
            .HasIndex(participant => new { participant.ChannelId, participant.UserId, participant.ConnectionId })
            .IsUnique();

        builder.Entity<VoiceChannelParticipant>()
            .HasOne(participant => participant.Channel)
            .WithMany(channel => channel.VoiceParticipants)
            .HasForeignKey(participant => participant.ChannelId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<VoiceChannelParticipant>()
            .HasOne(participant => participant.User)
            .WithMany(user => user.VoiceParticipations)
            .HasForeignKey(participant => participant.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<RevokedToken>()
            .HasIndex(token => token.Jti)
            .IsUnique();
    }
}
