using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SwipeJobs.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRecruiterCandidateManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ActivityLogJson",
                table: "Applications",
                type: "text",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<bool>(
                name: "IsFavorite",
                table: "Applications",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<byte>(
                name: "RecruiterRating",
                table: "Applications",
                type: "smallint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RejectionReason",
                table: "Applications",
                type: "character varying(512)",
                maxLength: 512,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ApplicationRecruiterNotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ApplicationId = table.Column<Guid>(type: "uuid", nullable: false),
                    AuthorUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Text = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApplicationRecruiterNotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ApplicationRecruiterNotes_Applications_ApplicationId",
                        column: x => x.ApplicationId,
                        principalTable: "Applications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RecruiterTags",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecruiterTags", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RecruiterTags_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ApplicationRecruiterTags",
                columns: table => new
                {
                    ApplicationId = table.Column<Guid>(type: "uuid", nullable: false),
                    TagId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApplicationRecruiterTags", x => new { x.ApplicationId, x.TagId });
                    table.ForeignKey(
                        name: "FK_ApplicationRecruiterTags_Applications_ApplicationId",
                        column: x => x.ApplicationId,
                        principalTable: "Applications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ApplicationRecruiterTags_RecruiterTags_TagId",
                        column: x => x.TagId,
                        principalTable: "RecruiterTags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ApplicationRecruiterNotes_ApplicationId",
                table: "ApplicationRecruiterNotes",
                column: "ApplicationId");

            migrationBuilder.CreateIndex(
                name: "IX_ApplicationRecruiterNotes_ApplicationId_CreatedAt",
                table: "ApplicationRecruiterNotes",
                columns: new[] { "ApplicationId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ApplicationRecruiterTags_TagId",
                table: "ApplicationRecruiterTags",
                column: "TagId");

            migrationBuilder.CreateIndex(
                name: "IX_RecruiterTags_CompanyId",
                table: "RecruiterTags",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_RecruiterTags_CompanyId_Name",
                table: "RecruiterTags",
                columns: new[] { "CompanyId", "Name" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ApplicationRecruiterNotes");

            migrationBuilder.DropTable(
                name: "ApplicationRecruiterTags");

            migrationBuilder.DropTable(
                name: "RecruiterTags");

            migrationBuilder.DropColumn(
                name: "ActivityLogJson",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "IsFavorite",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "RecruiterRating",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "RejectionReason",
                table: "Applications");
        }
    }
}
