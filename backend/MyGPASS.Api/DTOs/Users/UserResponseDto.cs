namespace MyGPASS.Api.DTOs.Users;

public class UserResponseDto
{
    public long UserId { get; set; }

    public string MobileNumber { get; set; } = null!;
    public string FirstName { get; set; } = null!;
    public string LastName { get; set; } = null!;
    public string? Email { get; set; }

    public bool IsActive { get; set; }

    public bool IsEmailVerified { get; set; }

    public string Role { get; set; } = "User";

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}