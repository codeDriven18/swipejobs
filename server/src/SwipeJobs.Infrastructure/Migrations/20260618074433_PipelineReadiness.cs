using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SwipeJobs.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class PipelineReadiness : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                UPDATE "Applications"
                SET "Status" = 1
                WHERE "Status" = 0;
                """);

            migrationBuilder.Sql(
                """
                UPDATE "Applications"
                SET "InterviewPhase" = 'Requested'
                WHERE "Status" = 4 AND ("InterviewPhase" IS NULL OR "InterviewPhase" = '' OR "InterviewPhase" = 'None');

                UPDATE "Applications"
                SET "InterviewPhase" = 'Scheduled'
                WHERE "Status" = 5 AND ("InterviewPhase" IS NULL OR "InterviewPhase" = '' OR "InterviewPhase" = 'None');
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Applications_JobId_Status",
                table: "Applications",
                columns: new[] { "JobId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Applications_UserProfileId",
                table: "Applications",
                column: "UserProfileId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Applications_JobId_Status",
                table: "Applications");

            migrationBuilder.DropIndex(
                name: "IX_Applications_UserProfileId",
                table: "Applications");
        }
    }
}
