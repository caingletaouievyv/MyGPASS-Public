using MyGPASS.Api.Security;

namespace MyGPASS.Api.Models;

public class User
{
    public long UserId { get; set; }

    public string MobileNumber { get; set; } = null!;

    public string FirstName { get; set; } = null!;
    public string LastName  { get; set; } = null!;
    public string? Email { get; set; }

    public string PasswordHash { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public bool IsActive { get; set; }

    public bool IsEmailVerified { get; set; }

    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    public string Role { get; set; } = Roles.User;
}