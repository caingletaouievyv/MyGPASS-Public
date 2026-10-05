using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using MyGPASS.Api.Data;
using MyGPASS.Api.DTOs.Auth;
using MyGPASS.Api.DTOs.Users;
using MyGPASS.Api.Models;
using MyGPASS.Api.Security;
using MyGPASS.Api.Services.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace MyGPASS.Api.Services;

public class AuthService : IAuthService
{
    private readonly MyGPASSDbContext _dbContext;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly IConfiguration _configuration;
    private readonly IApplicationSettingsService _applicationSettingsService;
    private readonly IEmailService _emailService;
    private readonly SymmetricSecurityKey _signingKey;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        MyGPASSDbContext dbContext,
        IPasswordHasher<User> passwordHasher,
        IConfiguration configuration,
        IApplicationSettingsService applicationSettingsService,
        IEmailService emailService,
        SymmetricSecurityKey signingKey,
        ILogger<AuthService> logger)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _configuration = configuration;
        _applicationSettingsService = applicationSettingsService;
        _emailService = emailService;
        _signingKey = signingKey;
        _logger = logger;
    }

    public async Task<UserResponseDto> RegisterAsync(
        UserRegisterRequestDto request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var mobileNumber = request.MobileNumber.Trim();

        var existingUser = await _dbContext.Users
            .FirstOrDefaultAsync(user =>
                user.Email == email ||
                user.MobileNumber == mobileNumber);

        if (existingUser is not null)
        {
            throw new InvalidOperationException(
                "A user with that email or mobile number already exists.");
        }

        var user = new User
        {
            MobileNumber = mobileNumber,
            FirstName = request.FirstName,
            LastName = request.LastName,
            Email = email,
            IsActive = true,
            IsEmailVerified = false,
            Role = Roles.User,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        user.PasswordHash = _passwordHasher.HashPassword(
            user,
            request.Password);

        _dbContext.Users.Add(user);

        try
        {
            await _dbContext.SaveChangesAsync();
        }
        catch (DbUpdateException exception) when (IsDuplicateEmailViolation(exception))
        {
            throw new InvalidOperationException(
                "A user with that email or mobile number already exists.");
        }

        // Generate and send verification email
        var verificationToken = TokenHelper.GenerateToken();
        var tokenHash = TokenHelper.HashToken(verificationToken);
        var verificationTokenEntity = new EmailVerificationToken
        {
            UserId = user.UserId,
            TokenHash = tokenHash,
            ExpiresAt = DateTime.UtcNow.AddHours(24),
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.EmailVerificationTokens.Add(verificationTokenEntity);
        await _dbContext.SaveChangesAsync();

        // Send verification email
        var frontendBaseUrl = await _applicationSettingsService.GetFrontendBaseUrlAsync();
        var verificationUrl = $"{frontendBaseUrl}/verify-email?token={Uri.EscapeDataString(verificationToken)}";
        var emailBody = EmailTemplates.GetVerificationEmailBody(user.FirstName, verificationUrl);

        var emailSent = await _emailService.SendEmailAsync(
            user.Email!,
            "Verify your GTI PASS email address",
            emailBody);

        if (!emailSent)
        {
            _logger.LogWarning("Failed to send verification email to user {UserId}", user.UserId);
        }

        return new UserResponseDto
        {
            UserId = user.UserId,
            FirstName = user.FirstName,
            LastName = user.LastName,
            MobileNumber = user.MobileNumber,
            Email = user.Email,
            IsActive = user.IsActive,
            IsEmailVerified = user.IsEmailVerified,
            Role = user.Role,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt
        };
    }

    public async Task<User?> GetUserByMobileNumberAsync(string mobileNumber)
    {
        var normalizedMobileNumber = mobileNumber.Trim();
        return await _dbContext.Users
            .FirstOrDefaultAsync(candidate => candidate.MobileNumber == normalizedMobileNumber);
    }

    public async Task<AuthResponseDto?> LoginAsync(UserLoginRequestDto request)
    {
        var mobileNumber = request.MobileNumber.Trim();
        var user = await GetUserByMobileNumberAsync(mobileNumber);

        if (user is null || !user.IsActive)
        {
            return null;
        }

        var verification = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (verification == PasswordVerificationResult.Failed)
        {
            return null;
        }

        if (verification == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);
            user.UpdatedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();
        }

        if (!user.IsEmailVerified)
        {
            _logger.LogWarning("Blocked login for unverified user {UserId}", user.UserId);
            return null;
        }

        var expiresAt = DateTime.UtcNow.AddMinutes(_configuration.GetValue("Jwt:ExpirationMinutes", 60));
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.UserId.ToString()),
            new(ClaimTypes.NameIdentifier, user.UserId.ToString()),
            new(ClaimTypes.Name, user.Email ?? user.MobileNumber),
            new(ClaimTypes.Email, user.Email ?? string.Empty),
            new(ClaimTypes.Role, user.Role),
            new("firstName", user.FirstName),
            new("lastName", user.LastName),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var credentials = new SigningCredentials(_signingKey, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"] ?? "GTIPass.Api",
            audience: _configuration["Jwt:Audience"] ?? "GTIPass.Client",
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials);

        return new AuthResponseDto
        {
            AccessToken = new JwtSecurityTokenHandler().WriteToken(token),
            ExpiresAt = expiresAt,
            User = ToUserResponse(user)
        };
    }

    public async Task<bool> VerifyEmailAsync(string token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return false;
        }

        try
        {
            var tokenHash = TokenHelper.HashToken(token);
            var verificationToken = await _dbContext.EmailVerificationTokens
                .Include(x => x.User)
                .FirstOrDefaultAsync(x => x.TokenHash == tokenHash && x.VerifiedAt == null);

            if (verificationToken is null)
            {
                _logger.LogWarning("Invalid or already-used email verification token attempted");
                return false;
            }

            if (verificationToken.ExpiresAt < DateTime.UtcNow)
            {
                _logger.LogWarning("Expired email verification token attempted for user {UserId}", verificationToken.UserId);
                return false;
            }

            if (verificationToken.User is null)
            {
                _logger.LogError("User not found for email verification token {TokenId}", verificationToken.EmailVerificationTokenId);
                return false;
            }

            verificationToken.VerifiedAt = DateTime.UtcNow;
            verificationToken.User.IsEmailVerified = true;
            verificationToken.User.UpdatedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("Email verified for user {UserId}", verificationToken.UserId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during email verification");
            return false;
        }
    }

    public async Task ForgotPasswordAsync(string email)
    {
        email = email.Trim().ToLowerInvariant();

        // Always return success to prevent email enumeration
        try
        {
            var user = await _dbContext.Users
                .FirstOrDefaultAsync(x => x.Email == email);

            if (user is null)
            {
                _logger.LogInformation("Forgot password requested for unknown account");
                return;
            }

            // Generate reset token
            var resetToken = TokenHelper.GenerateToken();
            var tokenHash = TokenHelper.HashToken(resetToken);
            var resetTokenEntity = new PasswordResetToken
            {
                UserId = user.UserId,
                TokenHash = tokenHash,
                ExpiresAt = DateTime.UtcNow.AddHours(24),
                CreatedAt = DateTime.UtcNow
            };

            _dbContext.PasswordResetTokens.Add(resetTokenEntity);
            await _dbContext.SaveChangesAsync();

            // Send reset email
            var resolvedFrontendBaseUrl = await _applicationSettingsService.GetFrontendBaseUrlAsync();
            var resetUrl = $"{resolvedFrontendBaseUrl}/reset-password?token={Uri.EscapeDataString(resetToken)}";
            var emailBody = EmailTemplates.GetPasswordResetEmailBody(user.FirstName, resetUrl);

            var emailSent = await _emailService.SendEmailAsync(
                user.Email!,
                "Reset your GTI PASS password",
                emailBody);

            if (!emailSent)
            {
                _logger.LogWarning("Failed to send password reset email to user {UserId}", user.UserId);
            }

        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during forgot password process");
        }
    }

    public async Task<bool> ResetPasswordAsync(string token, string newPassword)
    {
        if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(newPassword))
        {
            return false;
        }

        try
        {
            var tokenHash = TokenHelper.HashToken(token);
            var resetToken = await _dbContext.PasswordResetTokens
                .Include(x => x.User)
                .FirstOrDefaultAsync(x => x.TokenHash == tokenHash && x.UsedAt == null);

            if (resetToken is null)
            {
                _logger.LogWarning("Invalid or already-used password reset token attempted");
                return false;
            }

            if (resetToken.ExpiresAt < DateTime.UtcNow)
            {
                _logger.LogWarning("Expired password reset token attempted for user {UserId}", resetToken.UserId);
                return false;
            }

            if (resetToken.User is null)
            {
                _logger.LogError("User not found for password reset token {TokenId}", resetToken.PasswordResetTokenId);
                return false;
            }

            // Update password
            resetToken.User.PasswordHash = _passwordHasher.HashPassword(resetToken.User, newPassword);
            resetToken.User.UpdatedAt = DateTime.UtcNow;
            resetToken.UsedAt = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("Password reset successfully for user {UserId}", resetToken.UserId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during password reset");
            return false;
        }
    }

    private static UserResponseDto ToUserResponse(User user)
    {
        return new UserResponseDto
        {
            UserId = user.UserId,
            FirstName = user.FirstName,
            LastName = user.LastName,
            MobileNumber = user.MobileNumber,
            Email = user.Email,
            IsActive = user.IsActive,
            IsEmailVerified = user.IsEmailVerified,
            Role = user.Role,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt
        };
    }

    private static bool IsDuplicateEmailViolation(DbUpdateException exception)
    {
        for (var current = exception as Exception; current is not null; current = current.InnerException)
        {
            if (current is SqlException sqlException
                && (sqlException.Number == 2601 || sqlException.Number == 2627)
                && sqlException.Message.Contains("UQ_Users_Email", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }
}