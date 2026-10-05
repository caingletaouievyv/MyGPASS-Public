using System.Reflection;
using System.Security.Claims;
using MyGPASS.Api.Controllers;
using MyGPASS.Api.Data;
using MyGPASS.Api.DTOs.Users;
using MyGPASS.Api.Extensions;
using MyGPASS.Api.Models;
using MyGPASS.Api.Security;
using MyGPASS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Xunit;

namespace MyGPASS.Api.Tests;

public class UsersControllerTests
{
    [Fact]
    public void UsersController_RequiresAdministratorRole()
    {
        var authorization = typeof(UsersController).GetCustomAttribute<AuthorizeAttribute>();

        Assert.NotNull(authorization);
        Assert.Equal(Roles.Admin, authorization!.Roles);
    }

    [Fact]
    public async Task AdminPolicy_AllowsOnlyAdministratorRole()
    {
        await using var provider = CreateSecurityProvider();
        var authorization = provider.GetRequiredService<IAuthorizationService>();

        var administrator = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim(ClaimTypes.Role, Roles.Admin)], "test"));
        var normalUser = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim(ClaimTypes.Role, Roles.User)], "test"));
        var anonymous = new ClaimsPrincipal(new ClaimsIdentity());

        Assert.True((await authorization.AuthorizeAsync(administrator, null, Roles.Admin)).Succeeded);
        Assert.False((await authorization.AuthorizeAsync(normalUser, null, Roles.Admin)).Succeeded);
        Assert.False((await authorization.AuthorizeAsync(anonymous, null, Roles.Admin)).Succeeded);
    }

    [Fact]
    public async Task UserService_ReturnsSafeMaintenanceFieldsWithoutPasswordHash()
    {
        await using var context = new MyGPASSDbContext(new DbContextOptionsBuilder<MyGPASSDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);
        context.Users.Add(new User
        {
            MobileNumber = "09171234572",
            FirstName = "Safe",
            LastName = "User",
            Email = "safe@example.com",
            PasswordHash = "must-not-be-returned",
            IsActive = true,
            IsEmailVerified = true,
            Role = Roles.User,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        await context.SaveChangesAsync();

        var result = await new UserService(context).GetUsersAsync();

        var user = Assert.Single(result);
        Assert.Equal("Safe", user.FirstName);
        Assert.Equal("User", user.LastName);
        Assert.Equal("safe@example.com", user.Email);
        Assert.Equal(Roles.User, user.Role);
        Assert.DoesNotContain("PasswordHash", user.GetType().GetProperties().Select(property => property.Name));
    }

    [Fact]
    public async Task UserService_UpdateUser_UpdatesProfileAndUnverifiesChangedEmail()
    {
        await using var context = CreateContext();
        var user = await AddUserAsync(context, 10, "old@example.com", Roles.User, true, true);

        var result = await new UserService(context).UpdateUserAsync(user.UserId, new UserUpdateRequestDto
        {
            FirstName = "Updated",
            LastName = "Name",
            MobileNumber = "09170000010",
            Email = "new@example.com"
        });

        Assert.Equal("Updated", result.FirstName);
        Assert.Equal("new@example.com", result.Email);
        Assert.False(result.IsEmailVerified);
        Assert.Equal("new@example.com", (await context.Users.SingleAsync()).Email);
    }

    [Fact]
    public async Task UserService_UpdateStatus_ActivatesAndDeactivatesAnotherUser()
    {
        await using var context = CreateContext();
        var admin = await AddUserAsync(context, 20, "admin20@example.com", Roles.Admin, true, true);
        var user = await AddUserAsync(context, 21, "user21@example.com", Roles.User, true, true);
        var service = new UserService(context);

        var deactivated = await service.UpdateStatusAsync(user.UserId, false, admin.UserId);
        var activated = await service.UpdateStatusAsync(user.UserId, true, admin.UserId);

        Assert.False(deactivated.IsActive);
        Assert.True(activated.IsActive);
    }

    [Fact]
    public async Task UserService_UpdateStatus_RejectsSelfDeactivation()
    {
        await using var context = CreateContext();
        var admin = await AddUserAsync(context, 30, "admin30@example.com", Roles.Admin, true, true);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            new UserService(context).UpdateStatusAsync(admin.UserId, false, admin.UserId));
    }

    [Fact]
    public async Task UserService_UpdateRole_ChangesAnotherUserButRejectsSelfRoleChange()
    {
        await using var context = CreateContext();
        var admin = await AddUserAsync(context, 40, "admin40@example.com", Roles.Admin, true, true);
        var user = await AddUserAsync(context, 41, "user41@example.com", Roles.User, true, true);
        var service = new UserService(context);

        var promoted = await service.UpdateRoleAsync(user.UserId, Roles.Admin, admin.UserId);

        Assert.Equal(Roles.Admin, promoted.Role);
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.UpdateRoleAsync(admin.UserId, Roles.User, admin.UserId));
    }

    [Fact]
    public async Task UserService_UpdateRole_RejectsDemotingTheLastActiveAdministrator()
    {
        await using var context = CreateContext();
        var admin = await AddUserAsync(context, 50, "admin50@example.com", Roles.Admin, true, true);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            new UserService(context).UpdateRoleAsync(admin.UserId, Roles.User, 999));
    }

    private static MyGPASSDbContext CreateContext()
        => new(new DbContextOptionsBuilder<MyGPASSDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static async Task<User> AddUserAsync(
        MyGPASSDbContext context,
        long userId,
        string email,
        string role,
        bool isActive,
        bool isEmailVerified)
    {
        var user = new User
        {
            UserId = userId,
            MobileNumber = $"0917{userId:0000000}",
            FirstName = "Test",
            LastName = "User",
            Email = email,
            PasswordHash = "not-returned",
            Role = role,
            IsActive = isActive,
            IsEmailVerified = isEmailVerified,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return user;
    }

    private static ServiceProvider CreateSecurityProvider()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:SigningKey"] = "this_is_a_test_signing_key_1234567890",
                ["Jwt:Issuer"] = "MyGPASS.Api",
                ["Jwt:Audience"] = "MyGPASS.Client"
            })
            .Build();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddApiSecurity(configuration, new TestHostEnvironment());
        return services.BuildServiceProvider();
    }

    private sealed class TestHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Development;
        public string ApplicationName { get; set; } = "MyGPASS.Api.Tests";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
