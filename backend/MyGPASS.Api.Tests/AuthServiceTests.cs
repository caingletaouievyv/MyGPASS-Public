using MyGPASS.Api.Data;
using MyGPASS.Api.DTOs.Auth;
using MyGPASS.Api.Models;
using MyGPASS.Api.Models.Schedule;
using MyGPASS.Api.Services;
using MyGPASS.Api.Services.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.IdentityModel.Tokens;
using Xunit;
using MyGPASS.Api.DTOs.Payments;

namespace MyGPASS.Api.Tests;

public class AuthServiceTests
{
    [Fact]
    public async Task RegisterAsync_CreatesUnverifiedUser()
    {
        await using var context = CreateContext();
        var service = CreateService(context);

        await service.RegisterAsync(new UserRegisterRequestDto
        {
            MobileNumber = "09171234567",
            Email = "newuser@example.com",
            FirstName = "New",
            LastName = "User",
            Password = "Password123!"
        });

        var user = await context.Users.SingleAsync();
        Assert.False(user.IsEmailVerified);
        Assert.True(user.IsActive);
        Assert.Equal("User", (await context.Users.SingleAsync()).Role);
    }

    [Fact]
    public async Task RegisterAsync_RejectsDuplicateEmailCaseVariant()
    {
        await using var context = CreateContext();
        var service = CreateService(context);

        await service.RegisterAsync(new UserRegisterRequestDto
        {
            MobileNumber = "09171234581",
            Email = "duplicate@example.com",
            FirstName = "Duplicate",
            LastName = "User",
            Password = "Password123!"
        });

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.RegisterAsync(new UserRegisterRequestDto
            {
                MobileNumber = "09171234582",
                Email = "Duplicate@Example.com",
                FirstName = "Duplicate",
                LastName = "User2",
                Password = "Password123!"
            }));

        Assert.Equal("A user with that email or mobile number already exists.", exception.Message);
    }

    [Theory]
    [InlineData(2601)]
    [InlineData(2627)]
    public async Task RegisterAsync_MapsSqlUniqueEmailViolationToDuplicateUserError(int sqlErrorNumber)
    {
        var context = new ThrowingDbContext(new DbContextOptionsBuilder<MyGPASSDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options, sqlErrorNumber, "UQ_Users_Email");
        var service = CreateService(context);

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.RegisterAsync(new UserRegisterRequestDto
            {
                MobileNumber = "09171234583",
                Email = "race@example.com",
                FirstName = "Race",
                LastName = "User",
                Password = "Password123!"
            }));

        Assert.Equal("A user with that email or mobile number already exists.", exception.Message);
    }

    [Theory]
    [InlineData(2601)]
    [InlineData(2627)]
    public async Task RegisterAsync_DoesNotMapMobileNumberUniqueViolationToUserDuplicateError(int sqlErrorNumber)
    {
        var context = new ThrowingDbContext(new DbContextOptionsBuilder<MyGPASSDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options, sqlErrorNumber, "UQ_Users_MobileNumber");
        var service = CreateService(context);

        await Assert.ThrowsAsync<DbUpdateException>(() =>
            service.RegisterAsync(new UserRegisterRequestDto
            {
                MobileNumber = "09171234584",
                Email = "mobile@example.com",
                FirstName = "Mobile",
                LastName = "User",
                Password = "Password123!"
            }));
    }

    [Fact]
    public async Task RegisterAsync_DoesNotMapUnrelatedDbUpdateExceptionToUserDuplicateError()
    {
        var context = new ThrowingDbContext(new DbContextOptionsBuilder<MyGPASSDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options, 2627, "UQ_Users_Email", "Some other database failure");
        var service = CreateService(context);

        await Assert.ThrowsAsync<DbUpdateException>(() =>
            service.RegisterAsync(new UserRegisterRequestDto
            {
                MobileNumber = "09171234585",
                Email = "other@example.com",
                FirstName = "Other",
                LastName = "User",
                Password = "Password123!"
            }));
    }

    [Fact]
    public async Task LoginAsync_RejectsUnverifiedUser()
    {
        await using var context = CreateContext();
        var service = CreateService(context);
        const string password = "Password123!";

        var user = new User
        {
            MobileNumber = "09171234567",
            Email = "unverified@example.com",
            FirstName = "Unverified",
            LastName = "User",
            IsActive = true,
            IsEmailVerified = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            PasswordHash = new PasswordHasher<User>().HashPassword(null!, password)
        };

        context.Users.Add(user);
        await context.SaveChangesAsync();

        var result = await service.LoginAsync(new UserLoginRequestDto
        {
            MobileNumber = user.MobileNumber,
            Password = password
        });

        Assert.Null(result);
    }

    [Fact]
    public async Task LoginAsync_AllowsVerifiedUser()
    {
        await using var context = CreateContext();
        var service = CreateService(context);
        const string password = "Password123!";

        var user = new User
        {
            MobileNumber = "09171234568",
            Email = "verified@example.com",
            FirstName = "Verified",
            LastName = "User",
            IsActive = true,
            IsEmailVerified = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            PasswordHash = new PasswordHasher<User>().HashPassword(null!, password)
        };

        context.Users.Add(user);
        await context.SaveChangesAsync();

        var result = await service.LoginAsync(new UserLoginRequestDto
        {
            MobileNumber = user.MobileNumber,
            Password = password
        });

        Assert.NotNull(result);
        Assert.NotNull(result!.AccessToken);
        Assert.Equal(user.UserId, result.User.UserId);
    }


    private static async Task<bool> ResetPasswordWithNewContextAsync(
        string databaseName,
        string token,
        string newPassword)
    {
        await using var context = CreateContext(databaseName);
        return await CreateService(context).ResetPasswordAsync(token, newPassword);
    }

    private static async Task<bool> VerifyEmailWithNewContextAsync(string databaseName, string token)
    {
        await using var context = CreateContext(databaseName);
        return await CreateService(context).VerifyEmailAsync(token);
    }

    private static async Task<User> AddTokenUserAsync(
        MyGPASSDbContext context,
        long userId,
        string email,
        bool isEmailVerified = true)
    {
        var user = new User
        {
            UserId = userId,
            MobileNumber = $"0917{userId:0000000}",
            FirstName = "Token",
            LastName = "User",
            Email = email,
            PasswordHash = "old-password-hash",
            IsActive = true,
            IsEmailVerified = isEmailVerified,
            Role = Roles.User,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return user;
    }

    private static async Task<string> AddPasswordResetTokenAsync(
        MyGPASSDbContext context,
        long userId,
        DateTime expiresAt)
    {
        var token = TokenHelper.GenerateToken();
        context.PasswordResetTokens.Add(new PasswordResetToken
        {
            UserId = userId,
            TokenHash = TokenHelper.HashToken(token),
            ExpiresAt = expiresAt,
            CreatedAt = DateTime.UtcNow
        });
        await context.SaveChangesAsync();
        return token;
    }

    private static MyGPASSDbContext CreateContext()
    {
        return CreateContext(Guid.NewGuid().ToString());
    }

    private static MyGPASSDbContext CreateContext(string databaseName)
    {
        var options = new DbContextOptionsBuilder<MyGPASSDbContext>()
            .UseInMemoryDatabase(databaseName)
            .Options;

        return new MyGPASSDbContext(options);
    }

    private static AuthService CreateService(MyGPASSDbContext context)
    {
        return CreateService(context, new StubEmailService(), new Dictionary<string, string?>
        {
            ["Jwt:Issuer"] = "MyGPASS.Api",
            ["Jwt:Audience"] = "MyGPASS.Client",
            ["Jwt:ExpirationMinutes"] = "60",
            ["Frontend:BaseUrl"] = "http://localhost:4200"
        });
    }

    private sealed class ThrowingDbContext : MyGPASSDbContext
    {
        private readonly int _sqlErrorNumber;
        private readonly string _constraintName;
        private readonly string _errorMessage;

        public ThrowingDbContext(
            DbContextOptions<MyGPASSDbContext> options,
            int sqlErrorNumber,
            string constraintName,
            string? errorMessage = null)
            : base(options)
        {
            _sqlErrorNumber = sqlErrorNumber;
            _constraintName = constraintName;
            _errorMessage = errorMessage ?? $"Violation of UNIQUE KEY constraint '{constraintName}'. Cannot insert duplicate key in object 'dbo.Users'. The duplicate key value is (example@example.com).";
        }

        public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
        {
            throw CreateSqlUpdateException(_sqlErrorNumber, _errorMessage);
        }

        private static DbUpdateException CreateSqlUpdateException(int sqlErrorNumber, string message)
        {
            var sqlErrorCtor = typeof(SqlError).GetConstructor(
                System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic,
                null,
                [typeof(int), typeof(byte), typeof(byte), typeof(string), typeof(string), typeof(string), typeof(int), typeof(int), typeof(Exception)],
                null);

            var sqlError = (SqlError)sqlErrorCtor!.Invoke([
                sqlErrorNumber,
                (byte)0,
                (byte)0,
                "dbo",
                message,
                "proc",
                1,
                1,
                null
            ]);

            var collectionCtor = typeof(SqlErrorCollection).GetConstructor(
                System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic,
                null,
                Type.EmptyTypes,
                null);

            var collection = (SqlErrorCollection)collectionCtor!.Invoke([]);
            var addMethod = typeof(SqlErrorCollection).GetMethod(
                "Add",
                System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic);
            addMethod!.Invoke(collection, [sqlError]);

            var sqlExceptionCtor = typeof(SqlException).GetConstructor(
                System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic,
                null,
                [typeof(string), typeof(SqlErrorCollection), typeof(Exception), typeof(Guid)],
                null);

            var sqlException = (SqlException)sqlExceptionCtor!.Invoke([
                message,
                collection,
                null,
                Guid.NewGuid()
            ]);

            return new DbUpdateException(message, sqlException);
        }
    }

    private static AuthService CreateService(MyGPASSDbContext context, IEmailService emailService, Dictionary<string, string?> configurationValues)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configurationValues)
            .Build();

        return new AuthService(
            context,
            new PasswordHasher<User>(),
            configuration,
            new ApplicationSettingsService(context, configuration),
            emailService,
            new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes("this_is_a_test_signing_key_1234567890")),
            NullLogger<AuthService>.Instance);
    }

    private sealed class StubEmailService : IEmailService
    {
        public Task<bool> SendEmailAsync(string recipientEmail, string subject, string htmlBody)
            => Task.FromResult(true);
    }

    private sealed class CapturingEmailService : IEmailService
    {
        public string LastHtmlBody { get; private set; } = string.Empty;

        public Task<bool> SendEmailAsync(string recipientEmail, string subject, string htmlBody)
        {
            LastHtmlBody = htmlBody;
            return Task.FromResult(true);
        }
    }

    private sealed class FakePaymentService : IPaymentService
    {
        public Task<IReadOnlyList<PaymentResponseDto>> GetPaymentsAsync()
            => Task.FromResult<IReadOnlyList<PaymentResponseDto>>([]);

        public Task<PaymentResponseDto> CreatePaymentAsync(
            long bookingId,
            decimal amount,
            string merchantTransId)
            => throw new NotImplementedException();

        public Task<PaymentResponseDto> ConfirmPaymentAsync(long paymentId)
            => throw new NotImplementedException();

        public Task<PaymentResponseDto> ConfirmPaymentForUserAsync(long userId, long paymentId)
            => throw new NotImplementedException();

        public Task<PaymentResponseDto> ConfirmPaymentForGuestAsync(long paymentId, string guestAccessToken)
            => throw new NotImplementedException();
    }
}
