using MyGPASS.Api.Data;
using MyGPASS.Api.Models;
using MyGPASS.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace MyGPASS.Api.Tests;

public class ApplicationSettingsServiceTests
{
    [Fact]
    public async Task GetSmtpSettingsAsync_ReadsAllValuesFromDatabase()
    {
        await using var context = CreateContext();
        context.ApplicationSettings.AddRange(
            new ApplicationSetting { SettingKey = "EmailVerification:Smtp:Host", SettingValue = "db.smtp.example" },
            new ApplicationSetting { SettingKey = "EmailVerification:Smtp:Port", SettingValue = "2525" },
            new ApplicationSetting { SettingKey = "EmailVerification:Smtp:Username", SettingValue = "db-user" },
            new ApplicationSetting { SettingKey = "EmailVerification:Smtp:Password", SettingValue = "db-secret" },
            new ApplicationSetting { SettingKey = "EmailVerification:Smtp:From", SettingValue = "db-from@example.com" },
            new ApplicationSetting { SettingKey = "EmailVerification:Smtp:DisplayName", SettingValue = "DB Mailer" });
        await context.SaveChangesAsync();

        var service = CreateService(context, new Dictionary<string, string?>
        {
            ["EmailVerification:Smtp:Host"] = "config.smtp.example",
            ["EmailVerification:Smtp:Port"] = "587",
            ["EmailVerification:Smtp:Username"] = "config-user",
            ["EmailVerification:Smtp:Password"] = "config-secret",
            ["EmailVerification:Smtp:From"] = "config@example.com",
            ["EmailVerification:Smtp:DisplayName"] = "Config Mailer"
        });

        var result = await service.GetSmtpSettingsAsync();

        Assert.Equal("db.smtp.example", result.Host);
        Assert.Equal(2525, result.Port);
        Assert.Equal("db-user", result.Username);
        Assert.Equal("db-secret", result.Password);
        Assert.Equal("db-from@example.com", result.From);
        Assert.Equal("DB Mailer", result.DisplayName);
    }

    [Fact]
    public async Task GetFrontendBaseUrlAsync_DatabaseValueTakesPrecedenceOverConfiguration()
    {
        var originalEnvironmentValue = Environment.GetEnvironmentVariable("Frontend__BaseUrl");
        Environment.SetEnvironmentVariable("Frontend__BaseUrl", "https://environment.example");

        try
        {
        await using var context = CreateContext();
        context.ApplicationSettings.Add(new ApplicationSetting
        {
            SettingKey = "Frontend:BaseUrl",
            SettingValue = "https://db.example/"
        });
        await context.SaveChangesAsync();

        var service = CreateService(context, new Dictionary<string, string?>
        {
            ["Frontend:BaseUrl"] = "https://config.example"
        });

        Assert.Equal("https://db.example", await service.GetFrontendBaseUrlAsync());
        }
        finally
        {
            Environment.SetEnvironmentVariable("Frontend__BaseUrl", originalEnvironmentValue);
        }
    }

    [Fact]
    public async Task MissingDatabaseSettings_FallBackToExistingConfiguration()
    {
        await using var context = CreateContext();
        var service = CreateService(context, new Dictionary<string, string?>
        {
            ["Frontend:BaseUrl"] = "https://config.example/",
            ["EmailVerification:Smtp:Host"] = "config.smtp.example",
            ["EmailVerification:Smtp:Port"] = "587"
        });

        Assert.Equal("https://config.example", await service.GetFrontendBaseUrlAsync());
        var smtp = await service.GetSmtpSettingsAsync();
        Assert.Equal("config.smtp.example", smtp.Host);
        Assert.Equal(587, smtp.Port);
        Assert.Empty(smtp.Password);
    }

    private static MyGPASSDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<MyGPASSDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new MyGPASSDbContext(options);
    }

    private static ApplicationSettingsService CreateService(
        MyGPASSDbContext context,
        Dictionary<string, string?> values)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(values)
            .Build();
        return new ApplicationSettingsService(context, configuration);
    }
}