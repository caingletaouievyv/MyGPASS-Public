using MyGPASS.Api.DTOs.Users;

namespace MyGPASS.Api.DTOs.Auth;

public class AuthResponseDto
{
    public string AccessToken { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public UserResponseDto User { get; set; } = null!;
}
