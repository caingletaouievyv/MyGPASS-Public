using MyGPASS.Api.Data;
using MyGPASS.Api.DTOs.Users;
using MyGPASS.Api.Models;
using MyGPASS.Api.Security;
using MyGPASS.Api.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MyGPASS.Api.Services;

public class UserService : IUserService
{
    private readonly MyGPASSDbContext _dbContext;

    public UserService(MyGPASSDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<UserResponseDto>> GetUsersAsync()
    {
        return await _dbContext.Users
            .AsNoTracking()
            .Select(user => new UserResponseDto
            {
                UserId = user.UserId,
                MobileNumber = user.MobileNumber,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = user.Email,
                IsActive = user.IsActive,
                IsEmailVerified = user.IsEmailVerified,
                Role = user.Role,
                CreatedAt = user.CreatedAt,
                UpdatedAt = user.UpdatedAt
            })
            .ToListAsync();
    }

    public async Task<UserResponseDto> UpdateUserAsync(long userId, UserUpdateRequestDto request)
    {
        var user = await FindUserAsync(userId);
        var mobileNumber = request.MobileNumber.Trim();
        var email = string.IsNullOrWhiteSpace(request.Email)
            ? null
            : request.Email.Trim().ToLowerInvariant();

        await EnsureUniqueAsync(userId, mobileNumber, email);

        var emailChanged = !string.Equals(user.Email, email, StringComparison.OrdinalIgnoreCase);
        user.FirstName = request.FirstName.Trim();
        user.LastName = request.LastName.Trim();
        user.MobileNumber = mobileNumber;
        user.Email = email;
        if (emailChanged)
        {
            user.IsEmailVerified = false;
        }

        user.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();
        return ToResponse(user);
    }

    public async Task<UserResponseDto> UpdateStatusAsync(long userId, bool isActive, long actorUserId)
    {
        var user = await FindUserAsync(userId);
        if (user.UserId == actorUserId)
        {
            throw new InvalidOperationException("Administrators cannot deactivate their own account.");
        }

        if (!isActive && user.IsActive && user.Role == Roles.Admin && await CountActiveAdministratorsAsync() <= 1)
        {
            throw new InvalidOperationException("The last active administrator cannot be deactivated.");
        }

        user.IsActive = isActive;
        user.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();
        return ToResponse(user);
    }

    public async Task<UserResponseDto> UpdateRoleAsync(long userId, string role, long actorUserId)
    {
        var user = await FindUserAsync(userId);
        var normalizedRole = role.Trim();
        if (!string.Equals(normalizedRole, Roles.User, StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(normalizedRole, Roles.Admin, StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("Role must be User or Admin.");
        }

        normalizedRole = string.Equals(normalizedRole, Roles.Admin, StringComparison.OrdinalIgnoreCase)
            ? Roles.Admin
            : Roles.User;
        if (user.UserId == actorUserId)
        {
            throw new InvalidOperationException("Administrators cannot change their own role.");
        }

        if (normalizedRole == Roles.User && user.Role == Roles.Admin && await CountActiveAdministratorsAsync() <= 1)
        {
            throw new InvalidOperationException("The last active administrator cannot be demoted.");
        }

        user.Role = normalizedRole;
        user.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();
        return ToResponse(user);
    }

    private async Task<User> FindUserAsync(long userId)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(candidate => candidate.UserId == userId);
        return user ?? throw new KeyNotFoundException("User was not found.");
    }

    private async Task EnsureUniqueAsync(long userId, string mobileNumber, string? email)
    {
        var duplicate = await _dbContext.Users.AnyAsync(user =>
            user.UserId != userId &&
            (user.MobileNumber == mobileNumber || (email != null && user.Email == email)));
        if (duplicate)
        {
            throw new InvalidOperationException("Another user already has that mobile number or email address.");
        }
    }

    private Task<int> CountActiveAdministratorsAsync()
        => _dbContext.Users.CountAsync(user => user.IsActive && user.Role == Roles.Admin);

    private static UserResponseDto ToResponse(User user)
        => new()
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