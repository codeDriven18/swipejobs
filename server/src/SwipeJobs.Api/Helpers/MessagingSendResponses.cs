using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Application.Modules.Messaging;

namespace SwipeJobs.Api.Helpers;

public static class MessagingSendResponses
{
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

        return new BadRequestObjectResult(new
        {
            error = firstError,
            code = "validation_failed",
            validationErrors,
        });
    }
}
