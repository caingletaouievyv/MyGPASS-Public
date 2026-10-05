namespace MyGPASS.Api.Models;

public class EmailVerificationToken
{
    public long EmailVerificationTokenId { get; set; }

    public long UserId { get; set; }

    public string TokenHash { get; set; } = null!;

    public DateTime ExpiresAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? VerifiedAt { get; set; }

    public virtual User? User { get; set; }
}
