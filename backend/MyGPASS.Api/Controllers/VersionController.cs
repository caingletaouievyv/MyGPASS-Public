using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MyGPASS.Api.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/version")]
public sealed class VersionController : ControllerBase
{
    private readonly IHostEnvironment _environment;

    public VersionController(IHostEnvironment environment)
    {
        _environment = environment;
    }

    [HttpGet]
    public ActionResult<object> GetVersion()
    {
        var assembly = typeof(VersionController).Assembly;
        var informationalVersion = assembly
            .GetCustomAttribute<AssemblyInformationalVersionAttribute>()
            ?.InformationalVersion;

        return Ok(new
        {
            application = "MyGPASS API",
            version = assembly.GetName().Version?.ToString() ?? "unknown",
            commit = ExtractCommit(informationalVersion),
            environment = _environment.EnvironmentName,
            buildTime = (DateTime?)null
        });
    }

    private static string? ExtractCommit(string? informationalVersion)
    {
        if (informationalVersion is null) return null;

        var separatorIndex = informationalVersion.IndexOf('+');
        if (separatorIndex < 0) return null;

        var candidate = informationalVersion[(separatorIndex + 1)..];
        return candidate.Length is >= 7 and <= 40 && candidate.All(Uri.IsHexDigit)
            ? candidate
            : null;
    }
}