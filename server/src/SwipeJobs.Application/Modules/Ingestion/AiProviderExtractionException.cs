namespace SwipeJobs.Application.Modules.Ingestion;

public sealed class AiProviderExtractionException : Exception
{
    public AiProviderExtractionException(
        string providerName,
        int statusCode,
        string message,
        string responseBody,
        int requestBytes,
        TimeSpan? retryAfter = null,
        Exception? inner = null)
        : base(message, inner)
    {
        ProviderName = providerName;
        StatusCode = statusCode;
        ResponseBody = responseBody;
        RequestBytes = requestBytes;
        RetryAfter = retryAfter;
    }

    public string ProviderName { get; }
    public int StatusCode { get; }
    public string ResponseBody { get; }
    public int RequestBytes { get; }
    public TimeSpan? RetryAfter { get; }
    public bool IsRateLimited => StatusCode == 429;
}
