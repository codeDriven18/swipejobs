using SwipeJobs.Application.Modules.Ingestion.Interfaces;
using SwipeJobs.Application.Modules.Ingestion.Models;

namespace SwipeJobs.Application.Modules.Ingestion.Services;

public interface IGeminiExtractionClient
{
    Task<AiExtractionResponse> ExtractJobAsync(string rawMessage, CancellationToken cancellationToken = default);
}
