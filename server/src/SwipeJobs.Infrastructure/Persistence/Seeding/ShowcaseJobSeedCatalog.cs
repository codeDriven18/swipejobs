using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Infrastructure.Persistence.Seeding;

internal sealed record ShowcaseCompanySeed(
    string Slug,
    string Name,
    string Description,
    string Industry,
    string Location,
    string CompanySize,
    string? Website,
    string? LogoUrl,
    string? BannerUrl,
    string? LinkedInUrl);

internal sealed record ShowcaseJobSeed(
    string ExternalKey,
    string Title,
    string Description,
    string CompanySlug,
    string? City,
    string Location,
    JobCategory Category,
    JobLevel Level,
    bool IsRemote,
    decimal SalaryMin,
    decimal SalaryMax,
    params string[] TagSlugs);

internal static class ShowcaseJobSeedCatalog
{
    public const string SourceExternalId = "swipejobs-showcase";

    public static IReadOnlyList<ShowcaseCompanySeed> Companies { get; } =
    [
        new(
            "epam-systems",
            "EPAM Systems",
            "EPAM is a global software engineering and IT consulting company. The Tashkent delivery center partners with international clients on .NET, cloud, and data platforms while investing heavily in graduate and junior developer programs.",
            "Software Engineering",
            "Tashkent, Uzbekistan",
            "1,000+ employees",
            "https://www.epam.com",
            "https://ui-avatars.com/api/?name=EPAM&background=0D47A1&color=fff&size=128&bold=true",
            "https://ui-avatars.com/api/?name=EPAM&background=0D47A1&color=fff&size=512&bold=true",
            "https://www.linkedin.com/company/epam-systems"),
        new(
            "tech-startup",
            "Tech Startup",
            "Tech Startup is an early-stage product company building a B2B workflow tool for regional businesses. The team is remote-first, ships weekly in React, and mentors interns through paired programming and code review.",
            "Software / Startup",
            "Remote",
            "11–50 employees",
            "https://novastack.example.com",
            "https://ui-avatars.com/api/?name=TS&background=FFD600&color=000&size=128&bold=true",
            "https://ui-avatars.com/api/?name=Tech+Startup&background=FFD600&color=000&size=512&bold=true",
            "https://www.linkedin.com/company/tech-startup"),
        new(
            "fintech-solutions",
            "FinTech Solutions",
            "FinTech Solutions develops payment and lending products for Central Asia. Backend engineers work on high-throughput C# services, PostgreSQL, and event-driven integrations with banking partners.",
            "Financial Technology",
            "Tashkent, Uzbekistan",
            "51–200 employees",
            "https://fintechsolutions.example.com",
            "https://ui-avatars.com/api/?name=FS&background=00695C&color=fff&size=128&bold=true",
            "https://ui-avatars.com/api/?name=FinTech&background=00695C&color=fff&size=512&bold=true",
            "https://www.linkedin.com/company/fintech-solutions"),
    ];

    public static IReadOnlyList<(string Name, string Slug)> Tags { get; } =
    [
        ("Frontend", "frontend"),
        ("Backend", "backend"),
        ("C#", "csharp"),
        (".NET", "dotnet"),
        ("React", "react"),
        ("TypeScript", "typescript"),
        ("Internship", "internship"),
        ("Junior", "junior"),
        ("Mid-Level", "mid-level"),
        ("Remote", "remote"),
        ("FinTech", "fintech"),
        ("SQL", "sql"),
        ("REST API", "rest-api"),
    ];

    public static IReadOnlyList<ShowcaseJobSeed> Jobs { get; } =
    [
        new(
            ExternalKey: "swipejobs:showcase:junior-dotnet-epam",
            Title: "Junior .NET Developer",
            Description: """
                EPAM's Tashkent team is hiring a Junior .NET Developer to build and maintain client-facing APIs and internal tools.

                What you'll do:
                • Implement ASP.NET Core REST endpoints and unit tests
                • Work with Entity Framework Core and PostgreSQL
                • Participate in code reviews, daily stand-ups, and sprint planning
                • Collaborate with QA and senior engineers on feature delivery

                Requirements:
                • 0–2 years of experience with C# or strong academic projects
                • Familiarity with OOP, Git, and HTTP/REST basics
                • Good English for documentation and team communication
                • Bachelor's degree in CS or related field (or equivalent portfolio)

                Nice to have: Docker basics, xUnit, exposure to Azure.

                Compensation: $500–$800 USD per month. Hybrid schedule available near Tashkent office.

                [Sample job — seeded for SwipeJobs demo and QA.]
                """,
            CompanySlug: "epam-systems",
            City: "Tashkent",
            Location: "Tashkent, Uzbekistan",
            Category: JobCategory.It,
            Level: JobLevel.Junior,
            IsRemote: false,
            SalaryMin: 500,
            SalaryMax: 800,
            "backend", "csharp", "dotnet", "junior", "sql"),

        new(
            ExternalKey: "swipejobs:showcase:frontend-react-intern",
            Title: "Frontend React Developer Intern",
            Description: """
                Tech Startup is looking for a Frontend React Developer Intern to join a distributed product squad shipping customer dashboards.

                What you'll do:
                • Build UI components in React 18 and TypeScript
                • Integrate REST APIs and handle loading/error states
                • Write accessible, responsive layouts with CSS modules
                • Join pair programming sessions and weekly demos

                Requirements:
                • Solid HTML, CSS, and JavaScript fundamentals
                • Coursework or personal projects using React
                • Basic Git workflow (branch, commit, pull request)
                • Self-motivated communication in a remote team

                Nice to have: Vite, React Router, Figma handoff experience.

                Compensation: $300–$500 USD per month. Fully remote — work from anywhere with stable internet.

                [Sample job — seeded for SwipeJobs demo and QA.]
                """,
            CompanySlug: "tech-startup",
            City: null,
            Location: "Remote",
            Category: JobCategory.It,
            Level: JobLevel.Internship,
            IsRemote: true,
            SalaryMin: 300,
            SalaryMax: 500,
            "frontend", "react", "typescript", "internship", "remote"),

        new(
            ExternalKey: "swipejobs:showcase:backend-csharp-fintech",
            Title: "Backend C# Developer",
            Description: """
                FinTech Solutions is expanding its core payments platform and needs a Backend C# Developer to own service modules end-to-end.

                What you'll do:
                • Design and implement ASP.NET Core microservices
                • Model transactional data in PostgreSQL with EF Core
                • Build secure REST APIs and background workers
                • Monitor production health and participate in on-call rotation

                Requirements:
                • 2+ years professional C# / .NET experience
                • Strong understanding of async/await, DI, and API design
                • Experience with relational databases and SQL tuning
                • Comfort with code reviews and automated testing

                Nice to have: Message queues, PCI-aware systems, CI/CD on Azure.

                Compensation: $800–$1,200 USD per month. On-site in Tashkent with flexible hours.

                [Sample job — seeded for SwipeJobs demo and QA.]
                """,
            CompanySlug: "fintech-solutions",
            City: "Tashkent",
            Location: "Tashkent, Uzbekistan",
            Category: JobCategory.It,
            Level: JobLevel.MidLevel,
            IsRemote: false,
            SalaryMin: 800,
            SalaryMax: 1200,
            "backend", "csharp", "dotnet", "fintech", "rest-api", "sql"),
    ];
}
