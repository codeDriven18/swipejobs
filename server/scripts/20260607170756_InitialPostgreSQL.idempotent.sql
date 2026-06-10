CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE TABLE "AuditLogs" (
        "Id" uuid NOT NULL,
        "Timestamp" timestamp with time zone NOT NULL,
        "ActorUserId" uuid,
        "Actor" character varying(320) NOT NULL,
        "Action" integer NOT NULL,
        "EntityType" integer NOT NULL,
        "EntityId" uuid,
        "Details" character varying(4000),
        CONSTRAINT "PK_AuditLogs" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE TABLE "Companies" (
        "Id" uuid NOT NULL,
        "Name" character varying(200) NOT NULL,
        "Slug" character varying(200) NOT NULL,
        "Description" character varying(4000) NOT NULL,
        "Industry" character varying(120) NOT NULL,
        "Location" character varying(200) NOT NULL,
        "CompanySize" character varying(80) NOT NULL,
        "LogoUrl" character varying(1000),
        "Website" character varying(500),
        "Status" integer NOT NULL,
        "IsActive" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        CONSTRAINT "PK_Companies" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE TABLE "Sources" (
        "Id" uuid NOT NULL,
        "Name" character varying(200) NOT NULL,
        "Type" integer NOT NULL,
        "ExternalIdentifier" character varying(500),
        "IsActive" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        CONSTRAINT "PK_Sources" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE TABLE "Tags" (
        "Id" uuid NOT NULL,
        "Name" character varying(100) NOT NULL,
        "Slug" character varying(100),
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        CONSTRAINT "PK_Tags" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE TABLE "Users" (
        "Id" uuid NOT NULL,
        "Email" character varying(256) NOT NULL,
        "PasswordHash" character varying(256) NOT NULL,
        "Role" integer NOT NULL,
        "LastLoginAt" timestamp with time zone,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        CONSTRAINT "PK_Users" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE TABLE "Jobs" (
        "Id" uuid NOT NULL,
        "Title" character varying(300) NOT NULL,
        "Description" text NOT NULL,
        "Location" character varying(200),
        "City" character varying(100),
        "SalaryMin" numeric(18,2),
        "SalaryMax" numeric(18,2),
        "Category" integer NOT NULL,
        "Level" integer NOT NULL,
        "IsRemote" boolean NOT NULL,
        "IsActive" boolean NOT NULL,
        "IsArchived" boolean NOT NULL,
        "ExpiresAt" timestamp with time zone,
        "ExternalUrl" character varying(1000),
        "CompanyId" uuid NOT NULL,
        "SourceId" uuid NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        CONSTRAINT "PK_Jobs" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Jobs_Companies_CompanyId" FOREIGN KEY ("CompanyId") REFERENCES "Companies" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_Jobs_Sources_SourceId" FOREIGN KEY ("SourceId") REFERENCES "Sources" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE TABLE "CompanyMembers" (
        "Id" uuid NOT NULL,
        "UserId" uuid NOT NULL,
        "CompanyId" uuid NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        CONSTRAINT "PK_CompanyMembers" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_CompanyMembers_Companies_CompanyId" FOREIGN KEY ("CompanyId") REFERENCES "Companies" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_CompanyMembers_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE TABLE "RefreshTokens" (
        "Id" uuid NOT NULL,
        "UserId" uuid NOT NULL,
        "TokenHash" character varying(128) NOT NULL,
        "ExpiresAt" timestamp with time zone NOT NULL,
        "RevokedAt" timestamp with time zone,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        CONSTRAINT "PK_RefreshTokens" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_RefreshTokens_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE TABLE "UserProfiles" (
        "Id" uuid NOT NULL,
        "UserId" uuid,
        "ExternalUserId" character varying(128),
        "FirstName" character varying(100) NOT NULL,
        "LastName" character varying(100) NOT NULL,
        "Email" character varying(256) NOT NULL,
        "Phone" character varying(50),
        "Bio" text,
        "ResumeUrl" character varying(1000),
        "Location" character varying(200),
        "IsProfileComplete" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        CONSTRAINT "PK_UserProfiles" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_UserProfiles_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE TABLE "JobTags" (
        "JobId" uuid NOT NULL,
        "TagId" uuid NOT NULL,
        CONSTRAINT "PK_JobTags" PRIMARY KEY ("JobId", "TagId"),
        CONSTRAINT "FK_JobTags_Jobs_JobId" FOREIGN KEY ("JobId") REFERENCES "Jobs" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_JobTags_Tags_TagId" FOREIGN KEY ("TagId") REFERENCES "Tags" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE TABLE "Applications" (
        "Id" uuid NOT NULL,
        "Status" integer NOT NULL,
        "AppliedAt" timestamp with time zone NOT NULL,
        "Notes" text,
        "UserProfileId" uuid NOT NULL,
        "JobId" uuid NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        CONSTRAINT "PK_Applications" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Applications_Jobs_JobId" FOREIGN KEY ("JobId") REFERENCES "Jobs" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_Applications_UserProfiles_UserProfileId" FOREIGN KEY ("UserProfileId") REFERENCES "UserProfiles" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE TABLE "CompanyFollows" (
        "Id" uuid NOT NULL,
        "UserProfileId" uuid NOT NULL,
        "CompanyId" uuid NOT NULL,
        "FollowedAt" timestamp with time zone NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        CONSTRAINT "PK_CompanyFollows" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_CompanyFollows_Companies_CompanyId" FOREIGN KEY ("CompanyId") REFERENCES "Companies" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_CompanyFollows_UserProfiles_UserProfileId" FOREIGN KEY ("UserProfileId") REFERENCES "UserProfiles" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE TABLE "Educations" (
        "Id" uuid NOT NULL,
        "Institution" character varying(200) NOT NULL,
        "Degree" character varying(200) NOT NULL,
        "FieldOfStudy" character varying(200),
        "StartDate" timestamp with time zone,
        "EndDate" timestamp with time zone,
        "IsCurrent" boolean NOT NULL,
        "UserProfileId" uuid NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        CONSTRAINT "PK_Educations" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Educations_UserProfiles_UserProfileId" FOREIGN KEY ("UserProfileId") REFERENCES "UserProfiles" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE TABLE "Experiences" (
        "Id" uuid NOT NULL,
        "Company" character varying(200) NOT NULL,
        "Title" character varying(200) NOT NULL,
        "Description" text,
        "StartDate" timestamp with time zone,
        "EndDate" timestamp with time zone,
        "IsCurrent" boolean NOT NULL,
        "UserProfileId" uuid NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        CONSTRAINT "PK_Experiences" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Experiences_UserProfiles_UserProfileId" FOREIGN KEY ("UserProfileId") REFERENCES "UserProfiles" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE TABLE "Notifications" (
        "Id" uuid NOT NULL,
        "UserProfileId" uuid NOT NULL,
        "Type" integer NOT NULL,
        "Title" character varying(200) NOT NULL,
        "Message" character varying(1000) NOT NULL,
        "IsRead" boolean NOT NULL,
        "ReadAt" timestamp with time zone,
        "RelatedJobId" uuid,
        "RelatedCompanyId" uuid,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        CONSTRAINT "PK_Notifications" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Notifications_UserProfiles_UserProfileId" FOREIGN KEY ("UserProfileId") REFERENCES "UserProfiles" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE TABLE "SavedJobs" (
        "Id" uuid NOT NULL,
        "SavedAt" timestamp with time zone NOT NULL,
        "UserProfileId" uuid NOT NULL,
        "JobId" uuid NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        CONSTRAINT "PK_SavedJobs" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SavedJobs_Jobs_JobId" FOREIGN KEY ("JobId") REFERENCES "Jobs" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_SavedJobs_UserProfiles_UserProfileId" FOREIGN KEY ("UserProfileId") REFERENCES "UserProfiles" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE TABLE "Skills" (
        "Id" uuid NOT NULL,
        "Name" character varying(100) NOT NULL,
        "Level" character varying(50),
        "UserProfileId" uuid NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        CONSTRAINT "PK_Skills" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Skills_UserProfiles_UserProfileId" FOREIGN KEY ("UserProfileId") REFERENCES "UserProfiles" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE TABLE "UserActivities" (
        "Id" uuid NOT NULL,
        "UserProfileId" uuid NOT NULL,
        "ActivityType" integer NOT NULL,
        "JobId" uuid,
        "CompanyId" uuid,
        "OccurredAt" timestamp with time zone NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        CONSTRAINT "PK_UserActivities" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_UserActivities_Companies_CompanyId" FOREIGN KEY ("CompanyId") REFERENCES "Companies" ("Id") ON DELETE SET NULL,
        CONSTRAINT "FK_UserActivities_Jobs_JobId" FOREIGN KEY ("JobId") REFERENCES "Jobs" ("Id") ON DELETE SET NULL,
        CONSTRAINT "FK_UserActivities_UserProfiles_UserProfileId" FOREIGN KEY ("UserProfileId") REFERENCES "UserProfiles" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE TABLE "UserInterestProfiles" (
        "Id" uuid NOT NULL,
        "UserProfileId" uuid NOT NULL,
        "PreferredCategoriesJson" text NOT NULL,
        "PreferredTechnologiesJson" text NOT NULL,
        "PreferredCitiesJson" text NOT NULL,
        "PreferredSalaryMin" numeric,
        "PreferredSalaryMax" numeric,
        "LastCalculatedAt" timestamp with time zone NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        CONSTRAINT "PK_UserInterestProfiles" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_UserInterestProfiles_UserProfiles_UserProfileId" FOREIGN KEY ("UserProfileId") REFERENCES "UserProfiles" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE INDEX "IX_Applications_JobId" ON "Applications" ("JobId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE INDEX "IX_Applications_Status" ON "Applications" ("Status");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE UNIQUE INDEX "IX_Applications_UserProfileId_JobId" ON "Applications" ("UserProfileId", "JobId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE INDEX "IX_AuditLogs_Action" ON "AuditLogs" ("Action");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE INDEX "IX_AuditLogs_ActorUserId" ON "AuditLogs" ("ActorUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE INDEX "IX_AuditLogs_EntityType" ON "AuditLogs" ("EntityType");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE INDEX "IX_AuditLogs_Timestamp" ON "AuditLogs" ("Timestamp");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE INDEX "IX_Companies_IsActive" ON "Companies" ("IsActive");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE INDEX "IX_Companies_Name" ON "Companies" ("Name");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE UNIQUE INDEX "IX_Companies_Slug" ON "Companies" ("Slug");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE INDEX "IX_Companies_Status" ON "Companies" ("Status");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE INDEX "IX_CompanyFollows_CompanyId" ON "CompanyFollows" ("CompanyId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE UNIQUE INDEX "IX_CompanyFollows_UserProfileId_CompanyId" ON "CompanyFollows" ("UserProfileId", "CompanyId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE UNIQUE INDEX "IX_CompanyMembers_CompanyId_UserId" ON "CompanyMembers" ("CompanyId", "UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE UNIQUE INDEX "IX_CompanyMembers_UserId" ON "CompanyMembers" ("UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE INDEX "IX_Educations_UserProfileId" ON "Educations" ("UserProfileId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE INDEX "IX_Experiences_UserProfileId" ON "Experiences" ("UserProfileId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE INDEX "IX_Jobs_Category" ON "Jobs" ("Category");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE INDEX "IX_Jobs_City" ON "Jobs" ("City");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE INDEX "IX_Jobs_CompanyId" ON "Jobs" ("CompanyId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE INDEX "IX_Jobs_CreatedAt" ON "Jobs" ("CreatedAt");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE INDEX "IX_Jobs_IsActive" ON "Jobs" ("IsActive");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE INDEX "IX_Jobs_SourceId" ON "Jobs" ("SourceId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE INDEX "IX_JobTags_TagId" ON "JobTags" ("TagId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE INDEX "IX_Notifications_UserProfileId_IsRead_CreatedAt" ON "Notifications" ("UserProfileId", "IsRead", "CreatedAt");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE INDEX "IX_RefreshTokens_TokenHash" ON "RefreshTokens" ("TokenHash");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE INDEX "IX_RefreshTokens_UserId_ExpiresAt" ON "RefreshTokens" ("UserId", "ExpiresAt");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE INDEX "IX_SavedJobs_JobId" ON "SavedJobs" ("JobId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE UNIQUE INDEX "IX_SavedJobs_UserProfileId_JobId" ON "SavedJobs" ("UserProfileId", "JobId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE INDEX "IX_Skills_UserProfileId" ON "Skills" ("UserProfileId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE INDEX "IX_Sources_Type" ON "Sources" ("Type");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE UNIQUE INDEX "IX_Tags_Slug" ON "Tags" ("Slug");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE INDEX "IX_UserActivities_ActivityType_CompanyId" ON "UserActivities" ("ActivityType", "CompanyId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE INDEX "IX_UserActivities_ActivityType_JobId" ON "UserActivities" ("ActivityType", "JobId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE INDEX "IX_UserActivities_CompanyId" ON "UserActivities" ("CompanyId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE INDEX "IX_UserActivities_JobId" ON "UserActivities" ("JobId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE INDEX "IX_UserActivities_UserProfileId_OccurredAt" ON "UserActivities" ("UserProfileId", "OccurredAt");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE UNIQUE INDEX "IX_UserInterestProfiles_UserProfileId" ON "UserInterestProfiles" ("UserProfileId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE INDEX "IX_UserProfiles_Email" ON "UserProfiles" ("Email");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE UNIQUE INDEX "IX_UserProfiles_ExternalUserId" ON "UserProfiles" ("ExternalUserId") WHERE "ExternalUserId" IS NOT NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE UNIQUE INDEX "IX_UserProfiles_UserId" ON "UserProfiles" ("UserId") WHERE "UserId" IS NOT NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    CREATE UNIQUE INDEX "IX_Users_Email" ON "Users" ("Email");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607170756_InitialPostgreSQL') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260607170756_InitialPostgreSQL', '10.0.8');
    END IF;
END $EF$;
COMMIT;

