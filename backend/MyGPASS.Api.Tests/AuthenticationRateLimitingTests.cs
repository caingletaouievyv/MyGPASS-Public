using System.Net;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using MyGPASS.Api.Controllers;
using MyGPASS.Api.Extensions;
using System.Threading.RateLimiting;
using Xunit;

namespace MyGPASS.Api.Tests;

public class AuthenticationRateLimitingTests
{
    [Fact]
    public async Task AuthenticationEndpoints_AllowRequestsBelowTheirLimits()
    {
        await using var server = await CreateServerAsync();

        foreach (var path in new[] { "/login", "/register", "/forgot-password", "/reset-password", "/verify-email" })
        {
            using var response = await server.Client.PostAsync(path, content: null);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
    }

    [Fact]
    public async Task LoginPolicy_RejectsExcessiveRequestsWithRetryAfter()
    {
        await using var server = await CreateServerAsync();

        for (var attempt = 0; attempt < 5; attempt++)
        {
            using var response = await server.Client.PostAsync("/login", content: null);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        await Task.Delay(TimeSpan.FromSeconds(2.1));

        using var rejectedResponse = await server.Client.PostAsync("/login", content: null);

        Assert.Equal((HttpStatusCode)429, rejectedResponse.StatusCode);
        Assert.True(rejectedResponse.Headers.TryGetValues("Retry-After", out var retryAfter));
        var retryAfterSeconds = ParseRetryAfterSeconds(Assert.Single(retryAfter!));
        Assert.InRange(retryAfterSeconds, 1, 900);
    }

    [Fact]
    public async Task RateLimitRejection_IncludesConfiguredCorsOrigin()
    {
        await using var server = await CreateCorsRateLimitedServerAsync();

        for (var attempt = 0; attempt < 5; attempt++)
        {
            using var allowedResponse = await server.Client.SendAsync(CreateOriginRequest());
            Assert.Equal(HttpStatusCode.OK, allowedResponse.StatusCode);
        }

        using var rejectedResponse = await server.Client.SendAsync(CreateOriginRequest());

        Assert.Equal((HttpStatusCode)429, rejectedResponse.StatusCode);
        Assert.Equal(
            "http://localhost:4200",
            rejectedResponse.Headers.GetValues("Access-Control-Allow-Origin").Single());
    }

    private static HttpRequestMessage CreateOriginRequest()
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/login");
        request.Headers.Add("Origin", "http://localhost:4200");
        return request;
    }

    [Fact]
    public async Task FixedWindowPartition_ReplenishesPermitsAfterWindowExpires()
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            ApplicationName = typeof(AuthenticationRateLimitingTests).Assembly.GetName().Name,
            EnvironmentName = "Testing"
        });
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.Services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.AddPolicy<string>("ShortFixedWindow", context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    _ => new FixedWindowRateLimiterOptions
                    {
                        AutoReplenishment = true,
                        PermitLimit = 1,
                        QueueLimit = 0,
                        Window = TimeSpan.FromSeconds(2)
                    }));
        });

        var app = builder.Build();
        app.UseRateLimiter();
        app.MapPost("/short-window", () => Results.Ok())
            .RequireRateLimiting("ShortFixedWindow");

        await app.StartAsync();
        using var client = new HttpClient { BaseAddress = new Uri(app.Urls.Single()) };

        try
        {
            using var firstResponse = await client.PostAsync("/short-window", content: null);
            using var secondResponse = await client.PostAsync("/short-window", content: null);

            Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);
            Assert.Equal((HttpStatusCode)429, secondResponse.StatusCode);

            await Task.Delay(TimeSpan.FromSeconds(2.1));

            using var thirdResponse = await client.PostAsync("/short-window", content: null);

            Assert.Equal(HttpStatusCode.OK, thirdResponse.StatusCode);
        }
        finally
        {
            await app.StopAsync();
            await app.DisposeAsync();
        }
    }

    [Fact]
    public async Task AuthenticationPolicies_AreIndependent()
    {
        await using var server = await CreateServerAsync();

        for (var attempt = 0; attempt < 5; attempt++)
        {
            using var response = await server.Client.PostAsync("/login", content: null);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        using var loginResponse = await server.Client.PostAsync("/login", content: null);
        using var registrationResponse = await server.Client.PostAsync("/register", content: null);

        Assert.Equal((HttpStatusCode)429, loginResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, registrationResponse.StatusCode);
    }

    [Fact]
    public async Task GuestBookingCreatePolicy_RejectsRequestsBeyondLimit()
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            ApplicationName = typeof(AuthenticationRateLimitingTests).Assembly.GetName().Name,
            EnvironmentName = "Testing"
        });
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.Services.AddAuthenticationRateLimiting();

        var app = builder.Build();
        app.UseRateLimiter();
        app.MapPost("/api/bookings/guest", () => Results.Ok())
            .AllowAnonymous()
            .RequireRateLimiting(SecurityExtensions.GuestBookingCreateRateLimitPolicy);

        await app.StartAsync();

        try
        {
            using var client = new HttpClient { BaseAddress = new Uri(app.Urls.Single()) };

            for (var attempt = 0; attempt < 10; attempt++)
            {
                using var response = await client.PostAsync("/api/bookings/guest", content: null);
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            }

            using var rejectedResponse = await client.PostAsync("/api/bookings/guest", content: null);

            Assert.Equal((HttpStatusCode)429, rejectedResponse.StatusCode);
            Assert.True(rejectedResponse.Headers.TryGetValues("Retry-After", out var retryAfter));
            var retryAfterSeconds = ParseRetryAfterSeconds(Assert.Single(retryAfter!));
            Assert.InRange(retryAfterSeconds, 1, 3600);
        }
        finally
        {
            await app.StopAsync();
            await app.DisposeAsync();
        }
    }

    [Fact]
    public void AuthenticationController_UsesNamedPoliciesForAllAuthenticationEndpoints()
    {
        AssertPolicy(typeof(AuthController), nameof(AuthController.Register), SecurityExtensions.AuthRegisterRateLimitPolicy);
        AssertPolicy(typeof(AuthController), nameof(AuthController.Login), SecurityExtensions.AuthLoginRateLimitPolicy);
        AssertPolicy(typeof(AuthController), nameof(AuthController.VerifyEmail), SecurityExtensions.AuthVerifyEmailRateLimitPolicy);
        AssertPolicy(typeof(AuthController), nameof(AuthController.ForgotPassword), SecurityExtensions.AuthForgotPasswordRateLimitPolicy);
        AssertPolicy(typeof(AuthController), nameof(AuthController.ResetPassword), SecurityExtensions.AuthResetPasswordRateLimitPolicy);
    }

    [Fact]
    public void BookingsController_UsesNamedPolicyForGuestBookingCreation()
    {
        AssertPolicy(typeof(BookingsController), nameof(BookingsController.CreateGuestBooking), SecurityExtensions.GuestBookingCreateRateLimitPolicy);
    }

    private static void AssertPolicy(Type controllerType, string methodName, string expectedPolicy)
    {
        var method = controllerType.GetMethod(methodName);
        var attributeData = method?
            .GetCustomAttributesData()
            .SingleOrDefault(data => data.AttributeType.FullName == "Microsoft.AspNetCore.RateLimiting.EnableRateLimitingAttribute");

        Assert.NotNull(attributeData);
        var policyName = attributeData!.ConstructorArguments.FirstOrDefault().Value as string;

        Assert.Equal(expectedPolicy, policyName);
    }

    private static async Task<TestServer> CreateServerAsync()
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            ApplicationName = typeof(AuthenticationRateLimitingTests).Assembly.GetName().Name,
            EnvironmentName = "Testing"
        });
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.Services.AddAuthenticationRateLimiting();

        var app = builder.Build();
        app.UseRateLimiter();
        app.MapPost("/login", () => Results.Ok())
            .RequireRateLimiting(SecurityExtensions.AuthLoginRateLimitPolicy);
        app.MapPost("/register", () => Results.Ok())
            .RequireRateLimiting(SecurityExtensions.AuthRegisterRateLimitPolicy);
        app.MapPost("/forgot-password", () => Results.Ok())
            .RequireRateLimiting(SecurityExtensions.AuthForgotPasswordRateLimitPolicy);
        app.MapPost("/reset-password", () => Results.Ok())
            .RequireRateLimiting(SecurityExtensions.AuthResetPasswordRateLimitPolicy);
        app.MapPost("/verify-email", () => Results.Ok())
            .RequireRateLimiting(SecurityExtensions.AuthVerifyEmailRateLimitPolicy);

        await app.StartAsync();
        return new TestServer(app, new HttpClient { BaseAddress = new Uri(app.Urls.Single()) });
    }

    private static async Task<TestServer> CreateCorsRateLimitedServerAsync()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Cors:AllowedOrigins:0"] = "http://localhost:4200",
                ["Jwt:SigningKey"] = "this_is_a_test_signing_key_1234567890",
                ["Jwt:Issuer"] = "GTIPass.Api",
                ["Jwt:Audience"] = "GTIPass.Client"
            })
            .Build();
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            ApplicationName = typeof(AuthenticationRateLimitingTests).Assembly.GetName().Name,
            EnvironmentName = "Testing"
        });
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.Services.AddApiSecurity(configuration, new TestHostEnvironment());
        builder.Services.AddAuthenticationRateLimiting();

        var app = builder.Build();
        app.UseApiCors();
        app.UseRateLimiter();
        app.UseApiSecurity();
        app.MapPost("/login", () => Results.Ok())
            .AllowAnonymous()
            .RequireRateLimiting(SecurityExtensions.AuthLoginRateLimitPolicy);

        await app.StartAsync();
        return new TestServer(app, new HttpClient { BaseAddress = new Uri(app.Urls.Single()) });
    }

    private static int ParseRetryAfterSeconds(string value)
    {
        Assert.True(int.TryParse(value, out var result));
        return result;
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

    private sealed class TestHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Development;
        public string ApplicationName { get; set; } = "MyGPASS.Api.Tests";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } = new Microsoft.Extensions.FileProviders.NullFileProvider();
    }
}
