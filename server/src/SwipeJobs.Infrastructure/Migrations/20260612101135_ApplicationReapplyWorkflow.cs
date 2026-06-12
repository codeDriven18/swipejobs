using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SwipeJobs.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ApplicationReapplyWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Applications_UserProfileId_JobId",
                table: "Applications");

            migrationBuilder.AddColumn<int>(
                name: "ReapplicationCount",
                table: "Applications",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "StatusHistoryJson",
                table: "Applications",
                type: "text",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.CreateIndex(
                name: "IX_Applications_UserProfileId_JobId",
                table: "Applications",
                columns: new[] { "UserProfileId", "JobId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Applications_UserProfileId_JobId",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "ReapplicationCount",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "StatusHistoryJson",
                table: "Applications");

            migrationBuilder.CreateIndex(
                name: "IX_Applications_UserProfileId_JobId",
                table: "Applications",
                columns: new[] { "UserProfileId", "JobId" },
                unique: true);
        }
    }
}
