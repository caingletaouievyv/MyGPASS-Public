namespace MyGPASS.Api.Models;

public class ApplicationSetting
{
    public string SettingKey { get; set; } = null!;

    public string? SettingValue { get; set; }

    public DateTime UpdatedAt { get; set; }
}