using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Application.Common.Interfaces;
using SwipeJobs.Application.Modules.Messaging;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Api.Helpers;

public static class MessagingSendResponses
{
    public static IActionResult? ValidateSeekerContext(
        ICurrentUserService currentUser,
        out Guid userId,
        out Guid profileId)
    {
        userId = Guid.Empty;
        profileId = Guid.Empty;

        if (!currentUser.TryGetUserId(out userId))
        {
            return Problem(
                StatusCodes.Status401Unauthorized,
                "Authentication required.",
                "auth_required",
                new Dictionary<string, string[]>
                {
                    ["userId"] = ["User id claim is missing from the access token."],
                });
        }

        if (!currentUser.TryGetProfileId(out profileId))
        {
            return Problem(
                StatusCodes.Status400BadRequest,
                "Profile required. Complete your profile before sending messages.",
                "profile_required",
                new Dictionary<string, string[]>
                {
                    ["profileId"] = ["Profile id claim is missing from the access token."],
                });
        }

        return null;
    }

    public static IActionResult? ValidateCompanyContext(
        ICurrentUserService currentUser,
        out Guid userId,
        out Guid companyId)
    {
        userId = Guid.Empty;
        companyId = Guid.Empty;

        if (!currentUser.TryGetUserId(out userId))
        {
            return Problem(
                StatusCodes.Status401Unauthorized,
                "Authentication required.",
                "auth_required",
                new Dictionary<string, string[]>
                {
                    ["userId"] = ["User id claim is missing from the access token."],
                });
        }

        if (!currentUser.TryGetCompanyId(out companyId))
        {
            return Problem(
                StatusCodes.Status400BadRequest,
                "Company account required.",
                "company_required",
                new Dictionary<string, string[]>
                {
                    ["companyId"] = ["Company id claim is missing from the access token."],
                });
        }

        return null;
    }

    public static IActionResult FromUnexpectedException(
        Exception ex,
        Guid conversationId,
        Guid? senderUserId = null,
        Guid? profileId = null,
        Guid? companyId = null)
        => Problem(
            StatusCodes.Status400BadRequest,
            "Message could not be sent due to an invalid server state.",
            "message_send_failed",
            new Dictionary<string, string[]>
            {
                ["conversationId"] = [$"Conversation id: {conversationId}"],
                ["senderUserId"] = [senderUserId?.ToString() ?? "missing"],
                ["profileId"] = [profileId?.ToString() ?? "missing"],
                ["companyId"] = [companyId?.ToString() ?? "missing"],
                ["exception"] = [ex.Message],
            });

    public static IActionResult? ValidateRequestBody(SendMessageDto? dto, out string messageText)
    {
        messageText = dto?.ResolveText() ?? string.Empty;
        if (dto is null)
        {
            return new BadRequestObjectResult(new
            {
                error = "Request body is required. Send JSON: { \"messageText\": \"your message\" }.",
                code = "invalid_body",
            });
        }

        if (string.IsNullOrWhiteSpace(messageText))
        {
            return new BadRequestObjectResult(new
            {
                error = "Message text is required and cannot be blank.",
                code = "empty_message",
                validationErrors = new Dictionary<string, string[]>
                {
                    ["messageText"] = ["Message text is required."],
                },
            });
        }

        return null;
    }

    public static IActionResult FromSendException(MessagingSendException ex)
        => new BadRequestObjectResult(new
        {
            error = ex.Message,
            code = ex.Code,
            diagnostics = ex.Diagnostics,
        });

    public static IActionResult ValidationFailed(ModelStateDictionary modelState)
    {
        var validationErrors = modelState
            .Where(entry => entry.Value?.Errors.Count > 0)
            .ToDictionary(
                entry => entry.Key,
                entry => entry.Value!.Errors.Select(error => error.ErrorMessage).ToArray());

        var firstError = validationErrors.Values.SelectMany(messages => messages).FirstOrDefault()
            ?? "Request validation failed.";

        return Problem(
            StatusCodes.Status400BadRequest,
            firstError,
            "validation_failed",
            validationErrors);
    }

    private static ObjectResult Problem(
        int statusCode,
        string error,
        string code,
        Dictionary<string, string[]>? validationErrors = null)
        => new(new
        {
            type = "https://tools.ietf.org/html/rfc7231#section-6.5.1",
            title = error,
            status = statusCode,
            error,
            code,
            validationErrors,
        })
        {
            StatusCode = statusCode,
        };
}
