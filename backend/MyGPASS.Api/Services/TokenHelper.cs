using System.Security.Cryptography;
using System.Text;

namespace MyGPASS.Api.Services;

public static class TokenHelper
{
    /// <summary>
    /// Generates a cryptographically secure random token.
    /// </summary>
    public static string GenerateToken(int length = 32)
    {
        var randomBytes = new byte[length];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(randomBytes);
        }
        return Convert.ToBase64String(randomBytes);
    }

    /// <summary>
    /// Generates a SHA256 hash of the token for secure storage.
    /// </summary>
    public static string HashToken(string token)
    {
        using (var sha256 = SHA256.Create())
        {
            var hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(token));
            return Convert.ToBase64String(hashBytes);
        }
    }

    /// <summary>
    /// Verifies that the provided token hashes to the stored hash.
    /// </summary>
    public static bool VerifyToken(string providedToken, string storedHash)
    {
        var providedHash = HashToken(providedToken);
        return providedHash.Equals(storedHash, StringComparison.Ordinal);
    }
}
