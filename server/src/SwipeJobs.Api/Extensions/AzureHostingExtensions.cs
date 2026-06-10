namespace SwipeJobs.Api.Extensions;

public static class AzureHostingExtensions
{
    public static void ConfigureAzureListening(this WebApplicationBuilder builder)
    {
        // Azure App Service (Windows IIS / Linux) injects ASPNETCORE_URLS — do not override.
        if (!string.IsNullOrEmpty(Environment.GetEnvironmentVariable("WEBSITE_INSTANCE_ID")))
            return;

        var port = Environment.GetEnvironmentVariable("PORT")
            ?? Environment.GetEnvironmentVariable("WEBSITES_PORT")
            ?? "8080";

        builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
    }
}
