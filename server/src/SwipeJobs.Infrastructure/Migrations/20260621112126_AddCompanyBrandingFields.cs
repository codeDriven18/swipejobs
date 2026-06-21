using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SwipeJobs.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCompanyBrandingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Benefits",
                table: "Companies",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Culture",
                table: "Companies",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HiringPhilosophy",
                table: "Companies",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InstagramUrl",
                table: "Companies",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TwitterUrl",
                table: "Companies",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Benefits",
                table: "Companies");

            migrationBuilder.DropColumn(
                name: "Culture",
                table: "Companies");

            migrationBuilder.DropColumn(
                name: "HiringPhilosophy",
                table: "Companies");

            migrationBuilder.DropColumn(
                name: "InstagramUrl",
                table: "Companies");

            migrationBuilder.DropColumn(
                name: "TwitterUrl",
                table: "Companies");
        }
    }
}
