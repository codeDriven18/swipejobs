using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using SwipeJobs.Api.Extensions;
using SwipeJobs.Api.Hubs;
using SwipeJobs.Api.Middleware;
using SwipeJobs.Api.Services;
using SwipeJobs.Application;
using SwipeJobs.Application.Common.Interfaces;
using SwipeJobs.Infrastructure;

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.ConfigureAzureListening();

    builder.Services.AddApplication();
    builder.Services.AddInfrastructure(builder.Configuration);
    builder.Services.AddHttpContextAccessor();
    builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
    builder.Services.AddSingleton<INotificationPublisher, SignalRNotificationPublisher>();

    builder.Services.AddResponseCompression(options =>
    {
        options.EnableForHttps = true;
        options.Providers.Add<BrotliCompressionProvider>();
        options.Providers.Add<GzipCompressionProvider>();
    });

    var jwtKey = ResolveJwtKey(builder);
    var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));

    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = builder.Configuration["Jwt:Issuer"],
                ValidAudience = builder.Configuration["Jwt:Audience"],
                IssuerSigningKey = signingKey,
                ClockSkew = TimeSpan.FromMinutes(1),
            };
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var accessToken = context.Request.Query["access_token"];
                    var path = context.HttpContext.Request.Path;
                    if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                        context.Token = accessToken;
                    return Task.CompletedTask;
                },
            };
        });

    builder.Services.AddAuthorization();
    builder.Services.AddSignalR();
    builder.Services.AddSwipeJobsCors(builder.Configuration, builder.Environment);

    builder.Services.AddControllers();
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(options =>
    {
        options.SwaggerDoc("v1", new()
        {
            Title = "SwipeJobs API",
            Version = "v1",
            Description = "Job discovery platform API",
        });
        options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
        {
            Description = "JWT Authorization header using the Bearer scheme.",
            Name = "Authorization",
            In = ParameterLocation.Header,
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
        });
        options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
        {
            [new OpenApiSecuritySchemeReference("Bearer", document)] = [],
        });
    });

    var app = builder.Build();

    app.Logger.LogInformation("SwipeJobs API starting in {Environment} mode.", app.Environment.EnvironmentName);
    app.Logger.LogInformation(
        "CORS policy {Policy} allows: {Origins}",
        CorsExtensions.CorsPolicyName,
        string.Join(", ", CorsExtensions.AllowedOrigins));

    var dbRuntime = app.Services.GetRequiredService<SwipeJobs.Infrastructure.Persistence.PostgresConnectionRuntimeInfo>();
    app.Logger.LogInformation(
        "Database runtime config ({Source}): Host={Host};Database={Database};Username={Username};SSL Mode={SslMode};PasswordLength={PasswordLength}",
        dbRuntime.Source,
        dbRuntime.Host,
        dbRuntime.Database,
        dbRuntime.Username,
        dbRuntime.SslMode,
        dbRuntime.PasswordLength);

    await app.InitializeDatabaseAsync();

    if (!app.Environment.IsDevelopment())
    {
        var forwardedHeadersOptions = new ForwardedHeadersOptions
        {
            ForwardedHeaders = ForwardedHeaders.XForwardedFor
                | ForwardedHeaders.XForwardedProto
                | ForwardedHeaders.XForwardedHost,
        };
        forwardedHeadersOptions.KnownIPNetworks.Clear();
        forwardedHeadersOptions.KnownProxies.Clear();
        app.UseForwardedHeaders(forwardedHeadersOptions);
    }

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI(options =>
        {
            options.SwaggerEndpoint("/swagger/v1/swagger.json", "SwipeJobs API v1");
        });
    }

    app.UseSwipeJobsCorsPreflight();
    app.UseRouting();
    app.UseCors(CorsExtensions.CorsPolicyName);
    app.UseAuthentication();
    app.UseAuthorization();
    app.UseMiddleware<ExceptionHandlingMiddleware>();

    app.MapControllers();
    app.MapHub<NotificationHub>("/hubs/notifications");

    app.Run();
}
catch (Exception ex)
{
    Console.Error.WriteLine("FATAL SwipeJobs API startup error:");
    Console.Error.WriteLine(ex);
    throw;
}

static string ResolveJwtKey(WebApplicationBuilder builder)
{
    var fromEnv = Environment.GetEnvironmentVariable("Jwt__Key");
    if (!string.IsNullOrWhiteSpace(fromEnv) && fromEnv.Length >= 32)
        return fromEnv;

    var productionSettingsPath = Path.Combine(builder.Environment.ContentRootPath, "appsettings.Production.json");
    if (File.Exists(productionSettingsPath))
    {
        var productionOnly = new ConfigurationBuilder()
            .AddJsonFile(productionSettingsPath, optional: false, reloadOnChange: false)
            .Build();
        var fromFile = productionOnly["Jwt:Key"];
        if (!string.IsNullOrWhiteSpace(fromFile) && fromFile.Length >= 32)
            return fromFile;
    }

    var configured = builder.Configuration["Jwt:Key"];
    if (!string.IsNullOrWhiteSpace(configured) && configured.Length >= 32)
        return configured;

    throw new InvalidOperationException("Jwt:Key must be at least 32 characters.");
}

public partial class Program { }
