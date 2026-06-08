using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;

#nullable disable

namespace ClearCord.Data.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260608120000_SeedDefaultChannelCategories")]
    public partial class SeedDefaultChannelCategories : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                CREATE TABLE #DefaultChannelCategories
                (
                    ServerId uniqueidentifier NOT NULL,
                    TextCategoryId uniqueidentifier NOT NULL,
                    VoiceCategoryId uniqueidentifier NOT NULL
                );

                INSERT INTO #DefaultChannelCategories (ServerId, TextCategoryId, VoiceCategoryId)
                SELECT Id, NEWID(), NEWID()
                FROM Servers
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM ChannelCategories
                    WHERE ChannelCategories.ServerId = Servers.Id
                );

                INSERT INTO ChannelCategories (Id, ServerId, Name, Position)
                SELECT TextCategoryId, ServerId, N'Kênh chữ', 1
                FROM #DefaultChannelCategories;

                INSERT INTO ChannelCategories (Id, ServerId, Name, Position)
                SELECT VoiceCategoryId, ServerId, N'Kênh voice', 2
                FROM #DefaultChannelCategories;

                UPDATE Channels
                SET CategoryId = #DefaultChannelCategories.TextCategoryId
                FROM Channels
                INNER JOIN #DefaultChannelCategories
                    ON #DefaultChannelCategories.ServerId = Channels.ServerId
                WHERE Channels.CategoryId IS NULL
                    AND Channels.Type = 1;

                UPDATE Channels
                SET CategoryId = #DefaultChannelCategories.VoiceCategoryId
                FROM Channels
                INNER JOIN #DefaultChannelCategories
                    ON #DefaultChannelCategories.ServerId = Channels.ServerId
                WHERE Channels.CategoryId IS NULL
                    AND Channels.Type = 2;

                DROP TABLE #DefaultChannelCategories;
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                UPDATE Channels
                SET CategoryId = NULL
                WHERE CategoryId IN (
                    SELECT Id
                    FROM ChannelCategories
                    WHERE Name IN (N'Kênh chữ', N'Kênh voice')
                );

                DELETE FROM ChannelCategories
                WHERE Name IN (N'Kênh chữ', N'Kênh voice');
                """);
        }
    }
}
