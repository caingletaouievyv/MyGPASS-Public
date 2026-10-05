using System.Net;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Xunit;

namespace MyGPASS.Api.Tests;

public class HostFilteringTests
{
    [Fact]
    public async Task AllowedHost_IsAcceptedAndUnconfiguredHost_IsRejected()
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            ApplicationName = typeof(HostFilteringTests).Assembly.GetName().Name,
            EnvironmentName = "Testing"
        });
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.WebHost.UseSetting("AllowedHosts", "api.example.com");

        var app = builder.Build();
        app.MapGet("/health", () => Results.Ok());
        await app.StartAsync();

        using var client = new HttpClient { BaseAddress = new Uri(app.Urls.Single()) };
        try
        {
            using var allowedRequest = new HttpRequestMessage(HttpMethod.Get, "/health");
            allowedRequest.Headers.Host = "api.example.com";
            using var allowedResponse = await client.SendAsync(allowedRequest);

            using var rejectedRequest = new HttpRequestMessage(HttpMethod.Get, "/health");
            rejectedRequest.Headers.Host = "unconfigured.example.com";
            using var rejectedResponse = await client.SendAsync(rejectedRequest);

            Assert.Equal(HttpStatusCode.OK, allowedResponse.StatusCode);
            Assert.Equal(HttpStatusCode.BadRequest, rejectedResponse.StatusCode);
        }
        finally
        {
            await app.StopAsync();
            await app.DisposeAsync();
        }
    }
}