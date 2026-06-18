using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SwipeJobs.Application.Common;
using SwipeJobs.Domain.Entities;
using SwipeJobs.Domain.Enums;
using ApplicationEntity = SwipeJobs.Domain.Entities.Application;

namespace SwipeJobs.Infrastructure.Persistence.Seeding;

/// <summary>
/// Seeds a demo employer account and candidates across every pipeline stage for Kanban development.
/// </summary>
public class PipelineDemoSeeder
{
    public const string SeedMarker = "pipeline-demo-seed";
    public const string EmployerEmail = "employer@pixelforge.demo";
    public const string EmployerPassword = "Pipeline123!";
    public const string DemoJobTitle = "Senior React Engineer (Pipeline Demo)";

    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<PipelineDemoSeeder> _logger;

    public PipelineDemoSeeder(
        AppDbContext context,
        IConfiguration configuration,
        ILogger<PipelineDemoSeeder> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        if (!_configuration.GetValue("Seed:PipelineDemo", true))
        {
            _logger.LogInformation("Pipeline demo seed disabled.");
            return;
        }

        if (!_configuration.GetValue("Seed:DemoData", false))
        {
            _logger.LogInformation("Pipeline demo seed skipped — Seed:DemoData is false.");
            return;
        }

        if (!await _context.Database.CanConnectAsync(cancellationToken))
            return;

        if (await _context.Applications.AnyAsync(a => a.Notes == SeedMarker, cancellationToken))
        {
            _logger.LogInformation("Pipeline demo seed already applied.");
            return;
        }

        var company = await _context.Companies.FirstOrDefaultAsync(c => c.Slug == "pixelforge", cancellationToken);
        if (company is null)
        {
            _logger.LogWarning("Pipeline demo seed skipped — pixelforge company not found.");
            return;
        }

        var source = await _context.Sources.FirstAsync(cancellationToken);
        var employer = await EnsureEmployerUserAsync(company, cancellationToken);
        _ = employer;
        var job = await EnsureDemoJobAsync(company, source, cancellationToken);

        var now = DateTime.UtcNow;
        var candidates = new (string First, string Last, string Email, ApplicationStatus Status, InterviewPhase Phase, DateTime? InterviewAt, bool HasResume, bool UnreadMessage)[]
        {
            ("Mila", "Chen", "mila.chen@demo.swipejobs", ApplicationStatus.Applied, InterviewPhase.None, null, true, false),
            ("Jonas", "Weber", "jonas.weber@demo.swipejobs", ApplicationStatus.Applied, InterviewPhase.None, null, false, false),
            ("Sara", "Okonkwo", "sara.okonkwo@demo.swipejobs", ApplicationStatus.UnderReview, InterviewPhase.None, null, true, false),
            ("Leo", "Martinez", "leo.martinez@demo.swipejobs", ApplicationStatus.Shortlisted, InterviewPhase.None, null, true, true),
            ("Priya", "Sharma", "priya.sharma@demo.swipejobs", ApplicationStatus.InterviewInvited, InterviewPhase.Requested, null, true, true),
            ("Elena", "Kowalski", "elena.kowalski@demo.swipejobs", ApplicationStatus.Interviewing, InterviewPhase.Scheduled, now.AddDays(2).AddHours(10), true, false),
            ("Tom", "Nguyen", "tom.nguyen@demo.swipejobs", ApplicationStatus.Interviewing, InterviewPhase.Completed, now.AddDays(-1), true, false),
            ("Amir", "Hassan", "amir.hassan@demo.swipejobs", ApplicationStatus.OfferSent, InterviewPhase.Completed, now.AddDays(-3), true, false),
            ("Nina", "Berg", "nina.berg@demo.swipejobs", ApplicationStatus.Hired, InterviewPhase.Completed, now.AddDays(-7), true, false),
            ("Chris", "Dubois", "chris.dubois@demo.swipejobs", ApplicationStatus.Rejected, InterviewPhase.None, null, false, false),
            ("Hannah", "Lee", "hannah.lee@demo.swipejobs", ApplicationStatus.Withdrawn, InterviewPhase.None, null, true, false),
        };

        foreach (var (first, last, email, status, phase, interviewAt, hasResume, unread) in candidates)
        {
            var profile = await EnsureCandidateProfileAsync(first, last, email, hasResume, cancellationToken);
            var appliedAt = now.AddDays(-Random.Shared.Next(3, 21));

            var application = new ApplicationEntity
            {
                UserProfileId = profile.Id,
                JobId = job.Id,
                Status = status,
                InterviewPhase = phase,
                InterviewScheduledAtUtc = interviewAt,
                AppliedAt = appliedAt,
                Notes = SeedMarker,
                StatusHistoryJson = ApplicationStatusHistorySerializer.CreateInitial(status, appliedAt),
            };
            _context.Applications.Add(application);
            await _context.SaveChangesAsync(cancellationToken);

            if (status is ApplicationStatus.Shortlisted
                or ApplicationStatus.InterviewInvited
                or ApplicationStatus.Interviewing
                or ApplicationStatus.OfferSent
                or ApplicationStatus.Hired)
            {
                var conversation = new Conversation
                {
                    ApplicationId = application.Id,
                    CandidateProfileId = profile.Id,
                    CompanyId = company.Id,
                    Status = ApplicationWorkflow.IsConversationReadOnly(status)
                        ? ConversationStatus.ReadOnly
                        : ConversationStatus.Active,
                };
                _context.Conversations.Add(conversation);
                await _context.SaveChangesAsync(cancellationToken);

                if (unread)
                {
                    var candidateUser = await _context.Users.FirstAsync(u => u.Id == profile.UserId, cancellationToken);
                    _context.Messages.Add(new Message
                    {
                        ConversationId = conversation.Id,
                        SenderUserId = candidateUser.Id,
                        Type = MessageType.User,
                        MessageText = $"Hi, following up on my application for {job.Title}.",
                        SentAt = now.AddHours(-2),
                    });
                    await _context.SaveChangesAsync(cancellationToken);
                }
            }
        }

        _logger.LogInformation(
            "Pipeline demo seed complete for company {Company} ({EmployerEmail} / {Password}).",
            company.Name,
            EmployerEmail,
            EmployerPassword);
    }

    private async Task<User> EnsureEmployerUserAsync(Company company, CancellationToken cancellationToken)
    {
        var existing = await _context.Users
            .Include(u => u.CompanyMembership)
            .FirstOrDefaultAsync(u => u.Email == EmployerEmail, cancellationToken);

        if (existing is not null)
        {
            if (existing.CompanyMembership is null)
            {
                _context.CompanyMembers.Add(new CompanyMember
                {
                    UserId = existing.Id,
                    CompanyId = company.Id,
                    Role = CompanyMemberRole.Owner,
                });
                await _context.SaveChangesAsync(cancellationToken);
            }

            return existing;
        }

        var user = new User
        {
            Email = EmployerEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(EmployerPassword),
            Role = UserRole.Company,
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync(cancellationToken);

        _context.CompanyMembers.Add(new CompanyMember
        {
            UserId = user.Id,
            CompanyId = company.Id,
            Role = CompanyMemberRole.Owner,
        });
        await _context.SaveChangesAsync(cancellationToken);
        return user;
    }

    private async Task<Job> EnsureDemoJobAsync(Company company, Source source, CancellationToken cancellationToken)
    {
        var existing = await _context.Jobs
            .FirstOrDefaultAsync(j => j.CompanyId == company.Id && j.Title == DemoJobTitle, cancellationToken);
        if (existing is not null)
            return existing;

        var job = new Job
        {
            Title = DemoJobTitle,
            Description = "Demo role for employer pipeline development. Candidates are seeded across all hiring stages.",
            CompanyId = company.Id,
            Location = "Berlin, Germany",
            City = "Berlin",
            Category = JobCategory.It,
            Level = JobLevel.MidLevel,
            IsRemote = true,
            SalaryMin = 65000,
            SalaryMax = 85000,
            SourceId = source.Id,
            IsActive = true,
            ContentFingerprint = JobContentFingerprint.Compute(DemoJobTitle, company.Id, "Berlin", source.Id, null),
        };
        _context.Jobs.Add(job);
        await _context.SaveChangesAsync(cancellationToken);
        return job;
    }

    private async Task<UserProfile> EnsureCandidateProfileAsync(
        string first,
        string last,
        string email,
        bool hasResume,
        CancellationToken cancellationToken)
    {
        var existing = await _context.UserProfiles
            .FirstOrDefaultAsync(p => p.Email == email, cancellationToken);
        if (existing is not null)
            return existing;

        var user = new User
        {
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Candidate123!"),
            Role = UserRole.JobSeeker,
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync(cancellationToken);

        var profile = new UserProfile
        {
            UserId = user.Id,
            FirstName = first,
            LastName = last,
            Email = email,
            Headline = $"{first} — demo pipeline candidate",
            Location = "Berlin, Germany",
            ProfileImageUrl = $"https://api.dicebear.com/7.x/avataaars/svg?seed={Uri.EscapeDataString(email)}",
            ResumeFileName = hasResume ? $"{first}_{last}_Resume.pdf" : null,
            ResumeUrl = hasResume ? $"pipeline-demo/{email}/resume.pdf" : null,
            ResumeFileSize = hasResume ? 245_760 : null,
            ResumeUploadedAt = hasResume ? DateTime.UtcNow.AddDays(-14) : null,
            IsProfileComplete = true,
        };
        _context.UserProfiles.Add(profile);
        await _context.SaveChangesAsync(cancellationToken);
        return profile;
    }
}
