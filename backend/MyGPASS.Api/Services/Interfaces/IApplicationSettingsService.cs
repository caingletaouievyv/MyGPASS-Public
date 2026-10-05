namespace MyGPASS.Api.Services.Interfaces;

public interface IApplicationSettingsService
{
    Task<string> GetFrontendBaseUrlAsync();
    Task<SmtpOptions> GetSmtpSettingsAsync();
}