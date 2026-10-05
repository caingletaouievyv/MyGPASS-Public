namespace MyGPASS.Api.Models;

public class PasswordResetToken
{
    public long PasswordResetTokenId { get; set; }

    public long UserId { get; set; }

    public string TokenHash { get; set; } = null!;

    public DateTime ExpiresAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UsedAt { get; set; }

    public virtual User? User { get; set; }
}
