using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Application.Common;

public static class JobBrandingDefaults
{
    public static string ResolveDefaultJobImageUrl(JobCategory category, string title)
    {
        if (category == JobCategory.Gig)
            return "/job-images/default.svg";

        var t = title.ToLowerInvariant();
        if (t.Contains("design") || t.Contains("ux") || t.Contains("ui"))
            return "/job-images/design.svg";
        if (t.Contains("market") || t.Contains("growth") || t.Contains("content"))
            return "/job-images/marketing.svg";
        if (t.Contains("product") || t.Contains("pm "))
            return "/job-images/product.svg";
        if (t.Contains("data") || t.Contains("analyst") || t.Contains("ml") || t.Contains("machine learning"))
            return "/job-images/data.svg";

        return "/job-images/engineering.svg";
    }
}
