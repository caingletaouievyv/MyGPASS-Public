using System.Net;
using System.Net.Mail;
using MyGPASS.Api.Services.Interfaces;

namespace MyGPASS.Api.Services;

public class EmailService : IEmailService
{
    private readonly IApplicationSettingsService _applicationSettingsService;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IApplicationSettingsService applicationSettingsService, ILogger<EmailService> logger)
    {
        _applicationSettingsService = applicationSettingsService;
        _logger = logger;
    }

    public async Task<bool> SendEmailAsync(string recipientEmail, string subject, string htmlBody)
    {
        var smtpOptions = await _applicationSettingsService.GetSmtpSettingsAsync();
        if (string.IsNullOrWhiteSpace(smtpOptions.Host) ||
            string.IsNullOrWhiteSpace(smtpOptions.Username) ||
            string.IsNullOrWhiteSpace(smtpOptions.Password))
        {
            _logger.LogWarning("SMTP configuration is incomplete. Email not sent.");
            return false;
        }

        try
        {
            using var smtpClient = new SmtpClient(smtpOptions.Host, smtpOptions.Port)
            {
                EnableSsl = true,
                Credentials = new NetworkCredential(smtpOptions.Username, smtpOptions.Password),
                Timeout = 10000
            };

            using var mailMessage = new MailMessage
            {
                From = new MailAddress(smtpOptions.From, smtpOptions.DisplayName),
                Subject = subject,
                Body = htmlBody,
                IsBodyHtml = true
            };

            mailMessage.To.Add(recipientEmail);

            await smtpClient.SendMailAsync(mailMessage);

            _logger.LogInformation("Email sent successfully");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email");
            return false;
        }
    }
}
