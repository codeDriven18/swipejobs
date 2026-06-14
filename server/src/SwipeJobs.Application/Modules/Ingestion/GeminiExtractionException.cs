namespace SwipeJobs.Application.Modules.Ingestion;

public sealed class GeminiExtractionException : Exception
{
    public GeminiExtractionException(
        int statusCode,
        string message,
        string responseBody,
        int requestBytes,
        TimeSpan? retryAfter = null,
        Exception? inner = null)
        : base(message, inner)
    {
        StatusCode = statusCode;
        ResponseBody = responseBody;
        RequestBytes = requestBytes;
        RetryAfter = retryAfter;
    }

    public int StatusCode { get; }
    public string ResponseBody { get; }
    public int RequestBytes { get; }
    public TimeSpan? RetryAfter { get; }
    public bool IsRateLimited => StatusCode == 429;
}
