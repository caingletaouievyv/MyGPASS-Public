using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using MyGPASS.Api.Controllers;
using Xunit;

namespace MyGPASS.Api.Tests;

public class VersionControllerTests
{
    [Fact]
    public async Task GetVersion_ReturnsSafeDeploymentMetadataWithoutAuthentication()
    {
        await using var server = await CreateServerAsync();

        var response = await server.Client.GetAsync("/api/version");
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("MyGPASS API", body.GetProperty("application").GetString());
        Assert.Equal("Testing", body.GetProperty("environment").GetString());
        Assert.True(body.GetProperty("version").GetString() is { Length: > 0 });
        Assert.Equal(JsonValueKind.Null, body.GetProperty("buildTime").ValueKind);
        Assert.Equal(
            ["application", "version", "commit", "environment", "buildTime"],
            body.EnumerateObject().Select(property => property.Name).ToArray());
    }

    [Fact]
    public void VersionEndpoint_AllowsAnonymousAccess()
    {
        var method = typeof(VersionController).GetMethod(nameof(VersionController.GetVersion));

        Assert.NotNull(typeof(VersionController).GetCustomAttributes(typeof(AllowAnonymousAttribute), true).SingleOrDefault());
        Assert.NotNull(method?.GetCustomAttributes(typeof(HttpGetAttribute), true).SingleOrDefault());
    }

    private static async Task<TestServer> CreateServerAsync()
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            ApplicationName = typeof(VersionControllerTests).Assembly.GetName().Name,
            EnvironmentName = "Testing"
        });
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.Services.AddControllers()
            .AddApplicationPart(typeof(VersionController).Assembly);
        builder.Services.AddAuthorization(options => options.FallbackPolicy = new AuthorizationPolicyBuilder()
            .RequireAuthenticatedUser()
            .Build());

        var app = builder.Build();
        app.UseAuthorization();
        app.MapControllers();

        await app.StartAsync();
        return new TestServer(app, new HttpClient { BaseAddress = new Uri(app.Urls.Single()) });
    }

    private sealed class TestServer(WebApplication app, HttpClient client) : IAsyncDisposable
    {
        public HttpClient Client { get; } = client;

        public async ValueTask DisposeAsync()
        {
            Client.Dispose();
            await app.StopAsync();
            await app.DisposeAsync();
        }
    }
}