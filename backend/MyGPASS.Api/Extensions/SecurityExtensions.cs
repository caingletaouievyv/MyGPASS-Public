using System.Security.Cryptography;
using System.Text;
using System.Globalization;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using MyGPASS.Api.Data;
using MyGPASS.Api.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Threading.RateLimiting;

namespace MyGPASS.Api.Extensions;

public static class SecurityExtensions
{
    public const string AuthLoginRateLimitPolicy = "AuthLogin";
    public const string AuthRegisterRateLimitPolicy = "AuthRegister";
    public const string AuthForgotPasswordRateLimitPolicy = "AuthForgotPassword";
    public const string AuthResetPasswordRateLimitPolicy = "AuthResetPassword";
    public const string AuthVerifyEmailRateLimitPolicy = "AuthVerifyEmail";
    public const string GuestBookingCreateRateLimitPolicy = "GuestBookingCreate";

    public static IServiceCollection AddApiSecurity(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        var signingKey = GetSigningKey(configuration, environment);
        var issuer = configuration["Jwt:Issuer"] ?? "GTIPass.Api";
        var audience = configuration["Jwt:Audience"] ?? "GTIPass.Client";
        var allowedOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
        var securityKey = new SymmetricSecurityKey(signingKey);

        services.AddSingleton(securityKey);

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.MapInboundClaims = true;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = issuer,
                    ValidAudience = audience,
                    IssuerSigningKey = securityKey,
                    ClockSkew = TimeSpan.FromMinutes(1),
                    RoleClaimType = ClaimTypes.Role,
                    NameClaimType = ClaimTypes.NameIdentifier
                };
                options.Events = new JwtBearerEvents
                {
                    OnTokenValidated = ValidateCurrentUserStateAsync
                };
            });

        services.AddAuthorization(options =>
        {
            options.FallbackPolicy = new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .Build();

            options.AddPolicy(
                Roles.Admin,
                policy => policy.RequireRole(Roles.Admin));
        });

        services.AddCors(options =>
        {
            options.AddPolicy("Default", policy =>
            {
                policy.WithOrigins(allowedOrigins)
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .WithExposedHeaders("X-Pagination");
            });
        });

        return services;
    }

    public static IServiceCollection AddAuthenticationRateLimiting(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = async (context, cancellationToken) =>
            {
                var retryAfterSeconds = 60;
                if (context.Lease.TryGetMetadata(
                    MetadataName.RetryAfter.Name,
                    out var retryAfterMetadata) &&
                    retryAfterMetadata is TimeSpan retryAfter)
                {
                    retryAfterSeconds = Math.Max(1, (int)Math.Ceiling(retryAfter.TotalSeconds));
                }

                context.HttpContext.Response.Headers.RetryAfter =
                    retryAfterSeconds.ToString(CultureInfo.InvariantCulture);

                await Results.Problem(
                    statusCode: StatusCodes.Status429TooManyRequests,
                    title: "Too many requests.")
                    .ExecuteAsync(context.HttpContext);
            };

            AddPolicy(
                options,
                AuthLoginRateLimitPolicy,
                permitLimit: 5,
                window: TimeSpan.FromMinutes(15));
            AddPolicy(
                options,
                AuthRegisterRateLimitPolicy,
                permitLimit: 5,
                window: TimeSpan.FromHours(1));
            AddPolicy(
                options,
                AuthForgotPasswordRateLimitPolicy,
                permitLimit: 3,
                window: TimeSpan.FromHours(1));
            AddPolicy(
                options,
                AuthResetPasswordRateLimitPolicy,
                permitLimit: 5,
                window: TimeSpan.FromMinutes(15));
            AddPolicy(
                options,
                AuthVerifyEmailRateLimitPolicy,
                permitLimit: 10,
                window: TimeSpan.FromMinutes(15));
            AddPolicy(
                options,
                GuestBookingCreateRateLimitPolicy,
                permitLimit: 10,
                window: TimeSpan.FromHours(1));
        });

        return services;
    }

    public static WebApplication UseApiCors(this WebApplication app)
    {
        app.UseCors("Default");
        return app;
    }

    public static WebApplication UseApiSecurity(this WebApplication app)
    {
        app.UseAuthentication();
        app.UseAuthorization();
        return app;
    }

    private static byte[] GetSigningKey(IConfiguration configuration, IHostEnvironment environment)
    {
        var configuredKey = configuration["Jwt:SigningKey"];

        if (!string.IsNullOrWhiteSpace(configuredKey))
        {
            var keyBytes = Encoding.UTF8.GetBytes(configuredKey);
            if (keyBytes.Length < 32)
            {
                throw new InvalidOperationException("Jwt:SigningKey must be at least 32 bytes.");
            }

            return keyBytes;
        }

        if (environment.IsProduction())
        {
            throw new InvalidOperationException(
                "Jwt:SigningKey must be configured in production via user secrets or environment variables.");
        }

        return RandomNumberGenerator.GetBytes(32);
    }

    private static async Task ValidateCurrentUserStateAsync(TokenValidatedContext context)
    {
        var userIdClaim = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? context.Principal?.FindFirstValue(JwtRegisteredClaimNames.Sub);

        if (!long.TryParse(userIdClaim, out var userId))
        {
            context.Fail("Invalid token.");
            return;
        }

        var dbContext = context.HttpContext.RequestServices.GetRequiredService<MyGPASSDbContext>();
        var currentUser = await dbContext.Users
            .AsNoTracking()
            .Where(user => user.UserId == userId)
            .Select(user => new { user.IsActive, user.Role })
            .SingleOrDefaultAsync(context.HttpContext.RequestAborted);

        var tokenRole = context.Principal?.FindFirstValue(ClaimTypes.Role);
        if (currentUser is null || !currentUser.IsActive ||
            !string.Equals(currentUser.Role, tokenRole, StringComparison.Ordinal))
        {
            context.Fail("Invalid token.");
        }
    }

    private static void AddPolicy(
        RateLimiterOptions options,
        string policyName,
        int permitLimit,
        TimeSpan window)
    {
        options.AddPolicy<string>(policyName, context =>
            RateLimitPartition.GetFixedWindowLimiter(
                GetClientIpAddress(context),
                _ => new FixedWindowRateLimiterOptions
                {
                    AutoReplenishment = true,
                    PermitLimit = permitLimit,
                    QueueLimit = 0,
                    Window = window
                }));
    }

    private static string GetClientIpAddress(HttpContext context)
        => context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

}
