using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SwipeJobs.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ExtendUserProfileFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ContactVisibility",
                table: "UserProfiles",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "DesiredSalaryMax",
                table: "UserProfiles",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "DesiredSalaryMin",
                table: "UserProfiles",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "EmailNotifications",
                table: "UserProfiles",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "GitHubUrl",
                table: "UserProfiles",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Headline",
                table: "UserProfiles",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "JobAlerts",
                table: "UserProfiles",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "LinkedInUrl",
                table: "UserProfiles",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PreferredLocations",
                table: "UserProfiles",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProfileImageUrl",
                table: "UserProfiles",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProfileVisibility",
                table: "UserProfiles",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "PushNotifications",
                table: "UserProfiles",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "WebsiteUrl",
                table: "UserProfiles",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WorkArrangement",
                table: "UserProfiles",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ContactVisibility",
                table: "UserProfiles");

            migrationBuilder.DropColumn(
                name: "DesiredSalaryMax",
                table: "UserProfiles");

            migrationBuilder.DropColumn(
                name: "DesiredSalaryMin",
                table: "UserProfiles");

            migrationBuilder.DropColumn(
                name: "EmailNotifications",
                table: "UserProfiles");

            migrationBuilder.DropColumn(
                name: "GitHubUrl",
                table: "UserProfiles");

            migrationBuilder.DropColumn(
                name: "Headline",
                table: "UserProfiles");

            migrationBuilder.DropColumn(
                name: "JobAlerts",
                table: "UserProfiles");

            migrationBuilder.DropColumn(
                name: "LinkedInUrl",
                table: "UserProfiles");

            migrationBuilder.DropColumn(
                name: "PreferredLocations",
                table: "UserProfiles");

            migrationBuilder.DropColumn(
                name: "ProfileImageUrl",
                table: "UserProfiles");

            migrationBuilder.DropColumn(
                name: "ProfileVisibility",
                table: "UserProfiles");

            migrationBuilder.DropColumn(
                name: "PushNotifications",
                table: "UserProfiles");

            migrationBuilder.DropColumn(
                name: "WebsiteUrl",
                table: "UserProfiles");

            migrationBuilder.DropColumn(
                name: "WorkArrangement",
                table: "UserProfiles");
        }
    }
}
