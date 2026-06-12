namespace SwipeJobs.Api.Extensions;

public static class CorsExtensions
{
    public const string CorsPolicyName = "CorsPolicy";

    public static IReadOnlyList<string> AllowedOrigins { get; private set; } = [];

    public static IServiceCollection AddSwipeJobsCors(
        this IServiceCollection services,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        AllowedOrigins = BuildAllowedOrigins(configuration, environment);

        services.AddCors(options =>
        {
            options.AddPolicy(CorsPolicyName, policy =>
            {
                policy
                    .SetIsOriginAllowed(origin => IsAllowedOrigin(origin, AllowedOrigins))
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials()
                    .SetPreflightMaxAge(TimeSpan.FromHours(1));
            });
        });

        return services;
    }

    public static IApplicationBuilder UseSwipeJobsCors(this IApplicationBuilder app)
        => app.UseCors(CorsPolicyName);

    public static bool IsAllowedOrigin(string origin, IReadOnlyList<string> configuredOrigins)
    {
        if (configuredOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase))
            return true;

        if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
            return false;

        if (uri.Scheme is not ("http" or "https"))
            return false;

        if (IsLocalDevOrigin(uri))
            return true;

        if (uri.Host.Equals("swipejobs-khaki.vercel.app", StringComparison.OrdinalIgnoreCase))
            return true;

        if (uri.Host.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase))
            return true;

        return false;
    }

    private static string[] BuildAllowedOrigins(IConfiguration configuration, IWebHostEnvironment environment)
    {
        var configured = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
            ?? Array.Empty<string>();

        if (configured.Length > 0)
            return configured;

        if (environment.IsDevelopment())
        {
            return
            [
                "http://localhost:5173",
                "https://localhost:5173",
                "http://127.0.0.1:5173",
                "https://127.0.0.1:5173",
                "http://localhost:4173",
                "http://127.0.0.1:4173",
            ];
        }

        return
        [
            "https://swipejobs-khaki.vercel.app",
            "http://localhost:5173",
            "https://localhost:5173",
        ];
    }

    private static bool IsLocalDevOrigin(Uri uri)
    {
        if (!uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
            && !uri.Host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return uri.Port is -1 or 5173 or 4173 or 5123;
    }
}
