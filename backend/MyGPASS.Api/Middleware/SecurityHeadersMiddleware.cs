using Microsoft.AspNetCore.HttpsPolicy;
using Microsoft.Extensions.Options;

namespace MyGPASS.Api.Middleware;

public sealed class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IHostEnvironment _environment;
    private readonly HstsOptions _hstsOptions;

    public SecurityHeadersMiddleware(
        RequestDelegate next,
        IHostEnvironment environment,
        IOptions<HstsOptions> hstsOptions)
    {
        _next = next;
        _environment = environment;
        _hstsOptions = hstsOptions.Value;
    }

    public Task InvokeAsync(HttpContext context)
    {
        context.Response.OnStarting(() =>
        {
            var headers = context.Response.Headers;
            headers["X-Content-Type-Options"] = "nosniff";
            headers["X-Frame-Options"] = "DENY";
            headers["Referrer-Policy"] = "no-referrer";
            headers["X-Permitted-Cross-Domain-Policies"] = "none";
            headers["Cache-Control"] = "no-store";
            headers.Remove("Server");
            headers.Remove("X-Powered-By");

            if (!_environment.IsDevelopment() &&
                context.Request.IsHttps &&
                context.Response.StatusCode >= StatusCodes.Status500InternalServerError &&
                !_hstsOptions.ExcludedHosts.Contains(
                    context.Request.Host.Host,
                    StringComparer.OrdinalIgnoreCase))
            {
                var maxAgeSeconds = (long)_hstsOptions.MaxAge.TotalSeconds;
                headers["Strict-Transport-Security"] = $"max-age={maxAgeSeconds}";
            }

            return Task.CompletedTask;
        });

        return _next(context);
    }
}

public static class SecurityHeadersMiddlewareExtensions
{
    public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder app)
    {
        return app.UseMiddleware<SecurityHeadersMiddleware>();
    }
}
