namespace SwipeJobs.Application.Modules.Ingestion;

public class ModerationException : Exception
{
    public ModerationException(string code, string message, Exception? inner = null)
        : base(message, inner)
    {
        Code = code;
    }

    public string Code { get; }
}

public static class ModerationErrorCodes
{
    public const string CandidateNotFound = "candidate_not_found";
    public const string CandidateNotApprovable = "candidate_not_approvable";
    public const string ApproveMissingTitle = "approve_missing_title";
    public const string ApproveMissingCompany = "approve_missing_company";
    public const string PublishFailed = "publish_failed";
}
