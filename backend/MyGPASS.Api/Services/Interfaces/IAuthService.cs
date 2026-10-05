using MyGPASS.Api.DTOs.Auth;
using MyGPASS.Api.DTOs.Users;
using MyGPASS.Api.Models;

namespace MyGPASS.Api.Services.Interfaces;

public interface IAuthService
{
    Task<UserResponseDto> RegisterAsync(UserRegisterRequestDto request);
    Task<User?> GetUserByMobileNumberAsync(string mobileNumber);
    Task<AuthResponseDto?> LoginAsync(UserLoginRequestDto request);
    Task<bool> VerifyEmailAsync(string token);
    Task ForgotPasswordAsync(string email);
    Task<bool> ResetPasswordAsync(string token, string newPassword);
}