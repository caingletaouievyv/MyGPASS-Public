using MyGPASS.Api.DTOs.Users;

namespace MyGPASS.Api.Services.Interfaces;

public interface IUserService
{
    Task<IReadOnlyList<UserResponseDto>> GetUsersAsync();
    Task<UserResponseDto> UpdateUserAsync(long userId, UserUpdateRequestDto request);
    Task<UserResponseDto> UpdateStatusAsync(long userId, bool isActive, long actorUserId);
    Task<UserResponseDto> UpdateRoleAsync(long userId, string role, long actorUserId);
}