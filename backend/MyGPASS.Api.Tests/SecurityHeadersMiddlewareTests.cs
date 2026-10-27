using System.Net;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using MyGPASS.Api.Middleware;
using Xunit;

namespace MyGPASS.Api.Tests;

public class SecurityHeadersMiddlewareTests
{
    [Fact]
    public async Task RemovesXPoweredByFromSuccessfulAndNotFoundResponses()
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            ApplicationName = typeof(SecurityHeadersMiddlewareTests).Assembly.GetName().Name,
            EnvironmentName = "Testing"
        });
        builder.Services.AddHsts(options => options.MaxAge = TimeSpan.FromDays(365));
        builder.WebHost.ConfigureKestrel(options => options.AddServerHeader = false);
        builder.WebHost.UseUrls("http://127.0.0.1:0");

        var app = builder.Build();
        app.UseExceptionHandler(handler => handler.Run(async context =>
        {
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await context.Response.WriteAsync("Test error.");
        }));
        app.Use((context, next) =>
        {
            if (context.Request.Headers["X-Test-Https"] == "true")
            {
                context.Request.Scheme = "https";
            }

            return next();
        });
        app.UseSecurityHeaders();
        app.UseHsts();
        app.MapGet("/health", (HttpContext context) =>
        {
            context.Response.Headers["X-Powered-By"] = "TestServer";
            return Results.Ok();
        });
        app.MapGet("/error", async (HttpContext _) =>
        {
            await Task.Yield();
            throw new InvalidOperationException("Test exception.");
        });
        await app.StartAsync();

        using var client = new HttpClient { BaseAddress = new Uri(app.Urls.Single()) };
        try
        {
            using var success = await SendAsync("/health", isHttps: false);
            using var notFound = await SendAsync("/missing", isHttps: false);
            using var error = await SendAsync("/error", isHttps: false);
            using var httpsSuccess = await SendAsync("/health", isHttps: true);
            using var httpsNotFound = await SendAsync("/missing", isHttps: true);
            using var httpsError = await SendAsync("/error", isHttps: true);

            Assert.Equal(HttpStatusCode.OK, success.StatusCode);
            Assert.Equal("nosniff", success.Headers.GetValues("X-Content-Type-Options").Single());
            Assert.False(success.Headers.Contains("Strict-Transport-Security"));
            Assert.False(success.Headers.Contains("Server"));
            Assert.False(success.Headers.Contains("X-Powered-By"));
            Assert.Equal("DENY", success.Headers.GetValues("X-Frame-Options").Single());

            Assert.Equal(HttpStatusCode.NotFound, notFound.StatusCode);
            Assert.Equal("nosniff", notFound.Headers.GetValues("X-Content-Type-Options").Single());
            Assert.False(notFound.Headers.Contains("Strict-Transport-Security"));
            Assert.False(notFound.Headers.Contains("Server"));
            Assert.False(notFound.Headers.Contains("X-Powered-By"));

            Assert.Equal(HttpStatusCode.InternalServerError, error.StatusCode);
            Assert.Equal("nosniff", error.Headers.GetValues("X-Content-Type-Options").Single());
            Assert.False(error.Headers.Contains("Strict-Transport-Security"));
            Assert.False(error.Headers.Contains("Server"));
            Assert.False(error.Headers.Contains("X-Powered-By"));

            Assert.Equal(HttpStatusCode.OK, httpsSuccess.StatusCode);
            Assert.Equal("nosniff", httpsSuccess.Headers.GetValues("X-Content-Type-Options").Single());
            Assert.Equal(
                "max-age=31536000",
                httpsSuccess.Headers.GetValues("Strict-Transport-Security").Single());
            Assert.False(httpsSuccess.Headers.Contains("Server"));
            Assert.False(httpsSuccess.Headers.Contains("X-Powered-By"));

            Assert.Equal(HttpStatusCode.NotFound, httpsNotFound.StatusCode);
            Assert.Equal("nosniff", httpsNotFound.Headers.GetValues("X-Content-Type-Options").Single());
            Assert.Equal(
                "max-age=31536000",
                httpsNotFound.Headers.GetValues("Strict-Transport-Security").Single());
            Assert.False(httpsNotFound.Headers.Contains("Server"));
            Assert.False(httpsNotFound.Headers.Contains("X-Powered-By"));

            Assert.Equal(HttpStatusCode.InternalServerError, httpsError.StatusCode);
            Assert.Equal("nosniff", httpsError.Headers.GetValues("X-Content-Type-Options").Single());
            Assert.Equal(
                "max-age=31536000",
                httpsError.Headers.GetValues("Strict-Transport-Security").Single());
            Assert.False(httpsError.Headers.Contains("Server"));
            Assert.False(httpsError.Headers.Contains("X-Powered-By"));
        }
        finally
        {
            await app.StopAsync();
            await app.DisposeAsync();
        }

        async Task<HttpResponseMessage> SendAsync(string path, bool isHttps)
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, path);
            request.Headers.Host = "api.example.test";
            if (isHttps)
            {
                request.Headers.Add("X-Test-Https", "true");
            }

            return await client.SendAsync(request);
        }
    }
}
