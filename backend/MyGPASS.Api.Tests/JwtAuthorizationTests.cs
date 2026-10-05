using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using MyGPASS.Api.Data;
using MyGPASS.Api.Extensions;
using MyGPASS.Api.Models;
using MyGPASS.Api.Security;
using MyGPASS.Api.Services;
using MyGPASS.Api.Services.Interfaces;
using Microsoft.AspNetCore.Identity;
using Xunit;

namespace MyGPASS.Api.Tests;

public class JwtAuthorizationTests
{
    [Fact]
    public async Task ExistingToken_IsValidBeforeAccountChanges()
    {
        await using var context = CreateContext();
        var user = await AddUserAsync(context, 100, Roles.User, true);

        var result = await ValidateTokenAsync(context, user, Roles.User);

        Assert.Null(result);
    }

    [Fact]
    public async Task ExistingToken_IsRejectedAfterUserDeactivation()
    {
        await using var context = CreateContext();
        var user = await AddUserAsync(context, 101, Roles.User, true);
        var service = new UserService(context);
        await service.UpdateStatusAsync(user.UserId, false, 999);

        var result = await ValidateTokenAsync(context, user, Roles.User);

        Assert.NotNull(result);
    }

    [Fact]
    public async Task ExistingToken_IsRejectedAfterRoleChange()
    {
        await using var context = CreateContext();
        var user = await AddUserAsync(context, 102, Roles.User, true);
        var service = new UserService(context);
        await service.UpdateRoleAsync(user.UserId, Roles.Admin, 999);

        var result = await ValidateTokenAsync(context, user, Roles.User);

        Assert.NotNull(result);
    }

    [Fact]
    public async Task ExistingAdminToken_IsRejectedAfterAdminIsDemoted()
    {
        await using var context = CreateContext();
        var user = await AddUserAsync(context, 103, Roles.Admin, true);
        var actor = await AddUserAsync(context, 105, Roles.Admin, true);
        var service = new UserService(context);
        await service.UpdateRoleAsync(user.UserId, Roles.User, actor.UserId);

        var result = await ValidateTokenAsync(context, user, Roles.Admin);

        Assert.NotNull(result);
    }

    [Fact]
    public async Task OldUserToken_DoesNotGainAdminAuthorizationAfterPromotion()
    {
        await using var context = CreateContext();
        var user = await AddUserAsync(context, 104, Roles.User, true);
        var service = new UserService(context);
        await service.UpdateRoleAsync(user.UserId, Roles.Admin, 999);

        var result = await ValidateTokenAsync(context, user, Roles.User);

        Assert.NotNull(result);
    }

    private static async Task<AuthenticateResult?> ValidateTokenAsync(
        MyGPASSDbContext context,
        User user,
        string tokenRole)
    {
        await using var provider = CreateSecurityProvider(context);
        var options = provider
            .GetRequiredService<IOptionsMonitor<JwtBearerOptions>>()
            .Get(JwtBearerDefaults.AuthenticationScheme);
        var httpContext = new DefaultHttpContext { RequestServices = provider };
        var scheme = new AuthenticationScheme(
            JwtBearerDefaults.AuthenticationScheme,
            JwtBearerDefaults.AuthenticationScheme,
            typeof(JwtBearerHandler));
        var validationContext = new TokenValidatedContext(httpContext, scheme, options)
        {
            Principal = new ClaimsPrincipal(new ClaimsIdentity(
            [
                new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                new Claim(ClaimTypes.Role, tokenRole)
            ], JwtBearerDefaults.AuthenticationScheme))
        };

        await options.Events.TokenValidated(validationContext);
        return validationContext.Result;
    }

    private static ServiceProvider CreateSecurityProvider(MyGPASSDbContext context)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:SigningKey"] = "this_is_a_test_signing_key_1234567890",
                ["Jwt:Issuer"] = "GTIPass.Api",
                ["Jwt:Audience"] = "GTIPass.Client"
            })
            .Build();
        var services = new ServiceCollection();
        services.AddSingleton(context);
        services.AddApiSecurity(configuration, new TestHostEnvironment());
        return services.BuildServiceProvider();
    }

    private static MyGPASSDbContext CreateContext()
        => new(new DbContextOptionsBuilder<MyGPASSDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static async Task<User> AddUserAsync(
        MyGPASSDbContext context,
        long userId,
        string role,
        bool isActive)
    {
        var user = new User
        {
            UserId = userId,
            MobileNumber = $"0917{userId:0000000}",
            FirstName = "Token",
            LastName = "Test",
            Email = $"token{userId}@example.com",
            PasswordHash = "not-returned",
            Role = role,
            IsActive = isActive,
            IsEmailVerified = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return user;
    }

    private sealed class TestHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Development;
        public string ApplicationName { get; set; } = "MyGPASS.Api.Tests";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
