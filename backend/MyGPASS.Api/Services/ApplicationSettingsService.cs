using System.Data.Common;
using MyGPASS.Api.Data;
using MyGPASS.Api.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MyGPASS.Api.Services;

public class ApplicationSettingsService : IApplicationSettingsService
{
    private const string DefaultFrontendBaseUrl = "http://localhost:4200";
    private readonly MyGPASSDbContext _dbContext;
    private readonly IConfiguration _configuration;
    private readonly Dictionary<string, string?> _cache = new(StringComparer.OrdinalIgnoreCase);

    public ApplicationSettingsService(MyGPASSDbContext dbContext, IConfiguration configuration)
    {
        _dbContext = dbContext;
        _configuration = configuration;
    }

    public async Task<string> GetFrontendBaseUrlAsync()
    {
        var value = await GetEffectiveValueAsync("Frontend:BaseUrl");
        return string.IsNullOrWhiteSpace(value)
            ? DefaultFrontendBaseUrl
            : value.TrimEnd('/');
    }

    public async Task<SmtpOptions> GetSmtpSettingsAsync()
    {
        var host = await GetEffectiveValueAsync("EmailVerification:Smtp:Host");
        var portValue = await GetEffectiveValueAsync("EmailVerification:Smtp:Port");
        var username = await GetEffectiveValueAsync("EmailVerification:Smtp:Username");
        var password = await GetEffectiveValueAsync("EmailVerification:Smtp:Password");
        var from = await GetEffectiveValueAsync("EmailVerification:Smtp:From");
        var displayName = await GetEffectiveValueAsync("EmailVerification:Smtp:DisplayName");

        return new SmtpOptions
        {
            Host = host ?? string.Empty,
            Port = int.TryParse(portValue, out var port) ? port : 0,
            Username = username ?? string.Empty,
            Password = password ?? string.Empty,
            From = from ?? string.Empty,
            DisplayName = string.IsNullOrWhiteSpace(displayName) ? "System Mailer" : displayName
        };
    }

    private async Task<string?> GetEffectiveValueAsync(string configurationKey)
    {
        if (_cache.TryGetValue(configurationKey, out var cachedValue))
        {
            return cachedValue;
        }

        string? databaseValue = null;
        try
        {
            databaseValue = await _dbContext.ApplicationSettings
                .AsNoTracking()
                .Where(setting => setting.SettingKey == configurationKey)
                .Select(setting => setting.SettingValue)
                .SingleOrDefaultAsync();
        }
        catch (DbException)
        {
            // The SQL script may be applied after the application is deployed.
        }

        var value = !string.IsNullOrWhiteSpace(databaseValue)
            ? databaseValue
            : GetEnvironmentValue(configurationKey) ?? _configuration[configurationKey];

        _cache[configurationKey] = value;
        return value;
    }

    private static string? GetEnvironmentValue(string configurationKey)
    {
        var environmentKey = configurationKey.Replace(":", "__", StringComparison.Ordinal);
        return Environment.GetEnvironmentVariable(environmentKey);
    }
}