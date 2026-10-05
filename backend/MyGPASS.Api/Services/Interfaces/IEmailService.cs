namespace MyGPASS.Api.Services.Interfaces;

public interface IEmailService
{
    Task<bool> SendEmailAsync(string recipientEmail, string subject, string htmlBody);
}
