namespace SwipeJobs.Application.Modules.Ingestion;

public class IngestionPipelineException : Exception
{
    public IngestionPipelineException(string code, string message, Exception? inner = null)
        : base(message, inner)
    {
        Code = code;
    }

    public string Code { get; }
}

public static class IngestionErrorCodes
{
    public const string SourceNotFound = "source_not_found";
    public const string IngestionDisabled = "ingestion_disabled";
    public const string TelegramAuthFailed = "telegram_auth_failed";
    public const string GeminiApiKeyMissing = "gemini_api_key_missing";
    public const string ChannelNotFound = "channel_not_found";
    public const string InvalidTelegramMessageId = "invalid_telegram_message_id";
    public const string GeminiExtractionFailed = "gemini_extraction_failed";
    public const string InvalidAiResponse = "invalid_ai_response";
    public const string CandidatePersistenceFailed = "candidate_persistence_failed";
    public const string DuplicateChannelUrl = "duplicate_channel_url";
}
