using MyGPASS.Api.Data;
using MyGPASS.Api.DTOs.Auth;
using MyGPASS.Api.Models;
using MyGPASS.Api.Models.Schedule;
using MyGPASS.Api.Security;
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
        Assert.Equal(Roles.User, user.Role);
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

    [Fact]
    public async Task LoginAsync_EmitsPersistedRoleAsJwtRoleClaim()
    {
        await using var context = CreateContext();
        var service = CreateService(context);
        var user = new User
        {
            MobileNumber = "09171234571",
            Email = "admin@example.com",
            FirstName = "Admin",
            LastName = "User",
            IsActive = true,
            IsEmailVerified = true,
            Role = Roles.Admin,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            PasswordHash = new PasswordHasher<User>().HashPassword(null!, "Password123!")
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var result = await service.LoginAsync(new UserLoginRequestDto
        {
            MobileNumber = user.MobileNumber,
            Password = "Password123!"
        });

        var token = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler().ReadJwtToken(result!.AccessToken);
        Assert.Contains(token.Claims, claim => claim.Type == System.Security.Claims.ClaimTypes.Role && claim.Value == Roles.Admin);
        Assert.Equal(Roles.Admin, result.User.Role);
    }

    [Fact]
    public async Task LoginAsync_AfterRoleChange_EmitsCurrentRoleClaim()
    {
        await using var context = CreateContext();
        const string password = "Password123!";
        var user = new User
        {
            MobileNumber = "09171234573",
            Email = "rolechange@example.com",
            FirstName = "Role",
            LastName = "Change",
            IsActive = true,
            IsEmailVerified = true,
            Role = Roles.User,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            PasswordHash = new PasswordHasher<User>().HashPassword(null!, password)
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        await new UserService(context).UpdateRoleAsync(user.UserId, Roles.Admin, 999);
        var result = await CreateService(context).LoginAsync(new UserLoginRequestDto
        {
            MobileNumber = user.MobileNumber,
            Password = password
        });

        var token = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler().ReadJwtToken(result!.AccessToken);
        Assert.Contains(token.Claims, claim => claim.Type == System.Security.Claims.ClaimTypes.Role && claim.Value == Roles.Admin);
    }

    [Fact]
    public async Task LoginAsync_AfterReactivation_IssuesValidToken()
    {
        await using var context = CreateContext();
        const string password = "Password123!";
        var user = new User
        {
            MobileNumber = "09171234574",
            Email = "reactivation@example.com",
            FirstName = "Reactivated",
            LastName = "User",
            IsActive = false,
            IsEmailVerified = true,
            Role = Roles.User,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            PasswordHash = new PasswordHasher<User>().HashPassword(null!, password)
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var service = new UserService(context);
        Assert.Null(await CreateService(context).LoginAsync(new UserLoginRequestDto
        {
            MobileNumber = user.MobileNumber,
            Password = password
        }));

        await service.UpdateStatusAsync(user.UserId, true, 999);
        var result = await CreateService(context).LoginAsync(new UserLoginRequestDto
        {
            MobileNumber = user.MobileNumber,
            Password = password
        });

        Assert.NotNull(result?.AccessToken);
    }

    [Fact]
    public async Task GetBookingsForUserAsync_ReturnsOnlyCurrentUsersBookings()
    {
        await using var context = CreateContext();
        var service = new BookingService(context, new FakePaymentService());

        var userOne = new User
        {
            MobileNumber = "09170000001",
            Email = "userone@example.com",
            FirstName = "User",
            LastName = "One",
            IsActive = true,
            IsEmailVerified = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            PasswordHash = "hashed-password"
        };

        var userTwo = new User
        {
            MobileNumber = "09170000002",
            Email = "usertwo@example.com",
            FirstName = "User",
            LastName = "Two",
            IsActive = true,
            IsEmailVerified = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            PasswordHash = "hashed-password"
        };

        var originPort = new Port { Name = "Manila" };
        var destinationPort = new Port { Name = "Cebu" };
        var shippingLine = new ShippingLine { Name = "2GO" };
        var vessel = new Vessel { Name = "MV Spot", ShippingLine = shippingLine, ShippingLineId = 1 };
        var vesselVisit = new VesselVisit
        {
            OriginPort = originPort,
            DestinationPort = destinationPort,
            Vessel = vessel,
            DayOfDeparture = "Tuesday",
            EstimatedTimeOfDeparture = new TimeSpan(9, 30, 0)
        };

        context.Users.AddRange(userOne, userTwo);
        context.Ports.AddRange(originPort, destinationPort);
        context.ShippingLines.Add(shippingLine);
        context.Vessels.Add(vessel);
        context.VesselVisits.Add(vesselVisit);
        await context.SaveChangesAsync();

        context.Bookings.AddRange(
            new Booking
            {
                UserId = userOne.UserId,
                BookingReference = "B-1001",
                OriginPortId = originPort.PortId,
                DestinationPortId = destinationPort.PortId,
                ShippingLineId = shippingLine.ShippingLineId,
                VesselVisitId = vesselVisit.VesselVisitId,
                PassengerCount = 2,
                TotalAmount = 1200m,
                Status = "Confirmed",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                User = userOne,
                OriginPort = originPort,
                DestinationPort = destinationPort,
                ShippingLine = shippingLine,
                VesselVisit = vesselVisit
            },
            new Booking
            {
                UserId = userTwo.UserId,
                BookingReference = "B-2002",
                OriginPortId = originPort.PortId,
                DestinationPortId = destinationPort.PortId,
                ShippingLineId = shippingLine.ShippingLineId,
                VesselVisitId = vesselVisit.VesselVisitId,
                PassengerCount = 1,
                TotalAmount = 600m,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                User = userTwo,
                OriginPort = originPort,
                DestinationPort = destinationPort,
                ShippingLine = shippingLine,
                VesselVisit = vesselVisit
            });
        await context.SaveChangesAsync();

        var result = await service.GetBookingsForUserAsync(userOne.UserId);

        Assert.Single(result);
        Assert.Equal(userOne.UserId, result[0].UserId);
        Assert.Equal("B-1001", result[0].BookingReference);
    }

    [Fact]
    public async Task RegisterAsync_UsesEnvironmentFrontendBaseUrlForVerificationLink()
    {
        var originalFrontendBaseUrl = Environment.GetEnvironmentVariable("Frontend__BaseUrl");
        Environment.SetEnvironmentVariable("Frontend__BaseUrl", "http://localhost:4300");

        try
        {
            await using var context = CreateContext();
            var emailService = new CapturingEmailService();
            var service = CreateService(context, emailService, new Dictionary<string, string?>());

            await service.RegisterAsync(new UserRegisterRequestDto
            {
                MobileNumber = "09171234595",
                Email = "networkverify@example.com",
                FirstName = "Network",
                LastName = "User",
                Password = "Password123!"
            });

            Assert.Contains("http://localhost:4300/verify-email?token=", emailService.LastHtmlBody);
            Assert.DoesNotContain("http://localhost:4200/verify-email?token=", emailService.LastHtmlBody);
        }
        finally
        {
            Environment.SetEnvironmentVariable("Frontend__BaseUrl", originalFrontendBaseUrl);
        }
    }

    [Fact]
    public async Task RegisterAsync_UsesDatabaseFrontendBaseUrlForVerificationLink()
    {
        await using var context = CreateContext();
        context.ApplicationSettings.Add(new ApplicationSetting
        {
            SettingKey = "Frontend:BaseUrl",
            SettingValue = "https://db-frontend.example/"
        });
        await context.SaveChangesAsync();

        var emailService = new CapturingEmailService();
        var service = CreateService(context, emailService, new Dictionary<string, string?>
        {
            ["Frontend:BaseUrl"] = "https://config-frontend.example"
        });

        await service.RegisterAsync(new UserRegisterRequestDto
        {
            MobileNumber = "09171234598",
            Email = "dbverify@example.com",
            FirstName = "Database",
            LastName = "Verify",
            Password = "Password123!"
        });

        Assert.Contains("https://db-frontend.example/verify-email?token=", emailService.LastHtmlBody);
    }

    [Fact]
    public async Task ForgotPasswordAsync_UsesEnvironmentFrontendBaseUrlForResetLink()
    {
        var originalFrontendBaseUrl = Environment.GetEnvironmentVariable("Frontend__BaseUrl");
        Environment.SetEnvironmentVariable("Frontend__BaseUrl", "http://localhost:4300");

        try
        {
            await using var context = CreateContext();
            var emailService = new CapturingEmailService();
            var service = CreateService(context, emailService, new Dictionary<string, string?>());

            context.Users.Add(new User
            {
                MobileNumber = "09171234596",
                Email = "networkreset@example.com",
                FirstName = "Network",
                LastName = "Reset",
                IsActive = true,
                IsEmailVerified = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                PasswordHash = "hashed-password"
            });
            await context.SaveChangesAsync();

            await service.ForgotPasswordAsync("networkreset@example.com");

            Assert.Contains("http://localhost:4300/reset-password?token=", emailService.LastHtmlBody);
            Assert.DoesNotContain("http://localhost:4200/reset-password?token=", emailService.LastHtmlBody);
        }
        finally
        {
            Environment.SetEnvironmentVariable("Frontend__BaseUrl", originalFrontendBaseUrl);
        }
    }

    [Fact]
    public async Task ForgotPasswordAsync_UsesDatabaseFrontendBaseUrlForResetLink()
    {
        await using var context = CreateContext();
        context.ApplicationSettings.Add(new ApplicationSetting
        {
            SettingKey = "Frontend:BaseUrl",
            SettingValue = "https://db-frontend.example/"
        });
        context.Users.Add(new User
        {
            MobileNumber = "09171234599",
            Email = "dbreset@example.com",
            FirstName = "Database",
            LastName = "Reset",
            IsActive = true,
            IsEmailVerified = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            PasswordHash = "hashed-password"
        });
        await context.SaveChangesAsync();

        var emailService = new CapturingEmailService();
        var service = CreateService(context, emailService, new Dictionary<string, string?>
        {
            ["Frontend:BaseUrl"] = "https://config-frontend.example"
        });

        await service.ForgotPasswordAsync("dbreset@example.com");

        Assert.Contains("https://db-frontend.example/reset-password?token=", emailService.LastHtmlBody);
    }

    [Fact]
    public async Task VerifyEmailAsync_MarksUserAsVerified()
    {
        await using var context = CreateContext();
        var service = CreateService(context);

        var user = new User
        {
            MobileNumber = "09171234569",
            Email = "verify@example.com",
            FirstName = "Verify",
            LastName = "User",
            IsActive = true,
            IsEmailVerified = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            PasswordHash = "hashed-password"
        };

        context.Users.Add(user);
        await context.SaveChangesAsync();

        var token = TokenHelper.GenerateToken();
        context.EmailVerificationTokens.Add(new EmailVerificationToken
        {
            UserId = user.UserId,
            TokenHash = TokenHelper.HashToken(token),
            ExpiresAt = DateTime.UtcNow.AddHours(1),
            CreatedAt = DateTime.UtcNow
        });
        await context.SaveChangesAsync();

        var result = await service.VerifyEmailAsync(token);

        Assert.True(result);

        var refreshed = await context.Users.SingleAsync(x => x.UserId == user.UserId);
        Assert.True(refreshed.IsEmailVerified);
    }

    [Fact]
    public async Task VerifyEmailAsync_TokenIsSingleUse()
    {
        await using var context = CreateContext();
        var service = CreateService(context);

        var user = new User
        {
            MobileNumber = "09171234570",
            Email = "singleuse@example.com",
            FirstName = "Single",
            LastName = "Use",
            IsActive = true,
            IsEmailVerified = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            PasswordHash = "hashed-password"
        };

        context.Users.Add(user);
        await context.SaveChangesAsync();

        var token = TokenHelper.GenerateToken();
        context.EmailVerificationTokens.Add(new EmailVerificationToken
        {
            UserId = user.UserId,
            TokenHash = TokenHelper.HashToken(token),
            ExpiresAt = DateTime.UtcNow.AddHours(1),
            CreatedAt = DateTime.UtcNow
        });
        await context.SaveChangesAsync();

        var firstAttempt = await service.VerifyEmailAsync(token);
        var secondAttempt = await service.VerifyEmailAsync(token);

        Assert.True(firstAttempt);
        Assert.False(secondAttempt);

        var refreshed = await context.Users.SingleAsync(x => x.UserId == user.UserId);
        Assert.True(refreshed.IsEmailVerified);
    }

    [Fact]
    public async Task ResetPasswordAsync_TokenIsSingleUse()
    {
        await using var context = CreateContext();
        var user = await AddTokenUserAsync(context, 110, "reset-once@example.com");
        var token = await AddPasswordResetTokenAsync(context, user.UserId, DateTime.UtcNow.AddHours(1));

        var firstAttempt = await CreateService(context).ResetPasswordAsync(token, "NewPassword123!");
        var secondAttempt = await CreateService(context).ResetPasswordAsync(token, "AnotherPassword123!");

        Assert.True(firstAttempt);
        Assert.False(secondAttempt);
    }

    [Fact]
    public async Task ResetPasswordAsync_ExpiredTokenFails()
    {
        await using var context = CreateContext();
        var user = await AddTokenUserAsync(context, 111, "reset-expired@example.com");
        var token = await AddPasswordResetTokenAsync(context, user.UserId, DateTime.UtcNow.AddHours(-1));

        var result = await CreateService(context).ResetPasswordAsync(token, "NewPassword123!");

        Assert.False(result);
    }

    [Fact]
    public async Task ResetPasswordAsync_ConcurrentAttemptsAllowAtMostOneSuccess()
    {
        var databaseName = Guid.NewGuid().ToString();
        await using var seedContext = CreateContext(databaseName);
        var user = await AddTokenUserAsync(seedContext, 112, "reset-concurrent@example.com");
        var token = await AddPasswordResetTokenAsync(seedContext, user.UserId, DateTime.UtcNow.AddHours(1));

        var results = await Task.WhenAll(
            ResetPasswordWithNewContextAsync(databaseName, token, "FirstPassword123!"),
            ResetPasswordWithNewContextAsync(databaseName, token, "SecondPassword123!"));

        Assert.Single(results, result => result);
    }

    [Fact]
    public async Task VerifyEmailAsync_ConcurrentAttemptsAllowAtMostOneSuccess()
    {
        var databaseName = Guid.NewGuid().ToString();
        await using var seedContext = CreateContext(databaseName);
        var user = await AddTokenUserAsync(seedContext, 113, "verify-concurrent@example.com", isEmailVerified: false);
        var token = TokenHelper.GenerateToken();
        seedContext.EmailVerificationTokens.Add(new EmailVerificationToken
        {
            UserId = user.UserId,
            TokenHash = TokenHelper.HashToken(token),
            ExpiresAt = DateTime.UtcNow.AddHours(1),
            CreatedAt = DateTime.UtcNow
        });
        await seedContext.SaveChangesAsync();

        var results = await Task.WhenAll(
            VerifyEmailWithNewContextAsync(databaseName, token),
            VerifyEmailWithNewContextAsync(databaseName, token));

        Assert.Single(results, result => result);
    }

    [Fact]
    public async Task VerifyEmailAsync_ExpiredTokenFails()
    {
        await using var context = CreateContext();
        var user = await AddTokenUserAsync(context, 114, "verify-expired@example.com", isEmailVerified: false);
        var token = TokenHelper.GenerateToken();
        context.EmailVerificationTokens.Add(new EmailVerificationToken
        {
            UserId = user.UserId,
            TokenHash = TokenHelper.HashToken(token),
            ExpiresAt = DateTime.UtcNow.AddHours(-1),
            CreatedAt = DateTime.UtcNow
        });
        await context.SaveChangesAsync();

        var result = await CreateService(context).VerifyEmailAsync(token);

        Assert.False(result);
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
