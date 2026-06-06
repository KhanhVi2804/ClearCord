using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClearCord.Data.Migrations
{
    /// <inheritdoc />
    public partial class DirectConversations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "ChannelId",
                table: "Messages",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AddColumn<Guid>(
                name: "DirectConversationId",
                table: "Messages",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "DirectConversations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserAId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    UserBId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    LastActivityAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DirectConversations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DirectConversations_AspNetUsers_UserAId",
                        column: x => x.UserAId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DirectConversations_AspNetUsers_UserBId",
                        column: x => x.UserBId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DirectVoiceParticipants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DirectConversationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ConnectionId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    IsMuted = table.Column<bool>(type: "bit", nullable: false),
                    IsCameraEnabled = table.Column<bool>(type: "bit", nullable: false),
                    IsScreenSharing = table.Column<bool>(type: "bit", nullable: false),
                    JoinedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    LastUpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DirectVoiceParticipants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DirectVoiceParticipants_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DirectVoiceParticipants_DirectConversations_DirectConversationId",
                        column: x => x.DirectConversationId,
                        principalTable: "DirectConversations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Messages_DirectConversationId",
                table: "Messages",
                column: "DirectConversationId");

            migrationBuilder.CreateIndex(
                name: "IX_DirectConversations_UserAId_UserBId",
                table: "DirectConversations",
                columns: new[] { "UserAId", "UserBId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DirectConversations_UserBId",
                table: "DirectConversations",
                column: "UserBId");

            migrationBuilder.CreateIndex(
                name: "IX_DirectVoiceParticipants_DirectConversationId_UserId_ConnectionId",
                table: "DirectVoiceParticipants",
                columns: new[] { "DirectConversationId", "UserId", "ConnectionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DirectVoiceParticipants_UserId",
                table: "DirectVoiceParticipants",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Messages_DirectConversations_DirectConversationId",
                table: "Messages",
                column: "DirectConversationId",
                principalTable: "DirectConversations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Messages_DirectConversations_DirectConversationId",
                table: "Messages");

            migrationBuilder.DropTable(
                name: "DirectVoiceParticipants");

            migrationBuilder.DropTable(
                name: "DirectConversations");

            migrationBuilder.DropIndex(
                name: "IX_Messages_DirectConversationId",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "DirectConversationId",
                table: "Messages");

            migrationBuilder.AlterColumn<Guid>(
                name: "ChannelId",
                table: "Messages",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
        }
    }
}
