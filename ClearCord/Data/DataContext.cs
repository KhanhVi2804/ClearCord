using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ClearCord.Models; 

namespace ClearCord.Data
{
    public class DataContext : IdentityDbContext<User>
    {
        public DataContext(DbContextOptions<DataContext> options) : base(options)
        {
        }

        public DbSet<Server> Servers { get; set; }
        public DbSet<Channel> Channels { get; set; }
        public DbSet<ServerMember> ServerMembers { get; set; }
        public DbSet<Friendship> Friendships { get; set; }
        public DbSet<Message> Messages { get; set; }
        public DbSet<MessageReaction> MessageReactions { get; set; }
        public DbSet<FileAttachment> FileAttachments { get; set; }
        public DbSet<Notification> Notifications { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // Friendship relations
            builder.Entity<Friendship>()
                .HasOne(f => f.Requester)
                .WithMany(u => u.FriendshipsInitiated)
                .HasForeignKey(f => f.RequesterId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Friendship>()
                .HasOne(f => f.Addressee)
                .WithMany(u => u.FriendshipsReceived)
                .HasForeignKey(f => f.AddresseeId)
                .OnDelete(DeleteBehavior.Restrict);

            // Server-Owner relation
            builder.Entity<Server>()
                .HasOne(s => s.Owner)
                .WithMany()
                .HasForeignKey(s => s.OwnerId)
                .OnDelete(DeleteBehavior.Restrict);

            // ServerMember relation
            builder.Entity<ServerMember>()
                .HasOne(sm => sm.User)
                .WithMany(u => u.ServerMemberships)
                .HasForeignKey(sm => sm.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<ServerMember>()
                .HasOne(sm => sm.Server)
                .WithMany(s => s.Members)
                .HasForeignKey(sm => sm.ServerId)
                .OnDelete(DeleteBehavior.Cascade);

            // Message-Sender relation
            builder.Entity<Message>()
                .HasOne(m => m.Sender)
                .WithMany()
                .HasForeignKey(m => m.SenderId)
                .OnDelete(DeleteBehavior.Restrict);

            // Message-Reactions
            builder.Entity<MessageReaction>()
                .HasOne(r => r.User)
                .WithMany()
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}