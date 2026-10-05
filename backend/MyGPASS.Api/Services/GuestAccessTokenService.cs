using System.Security.Cryptography;

namespace MyGPASS.Api.Services;

public static class GuestAccessTokenService
{
    public static string Generate()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');
    }

    public static string Hash(string token)
    {
        return Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(token)));
    }

    public static bool Matches(string token, string? expectedHash)
    {
        if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(expectedHash)) return false;

        try
        {
            var actualHash = Convert.FromHexString(Hash(token));
            var storedHash = Convert.FromHexString(expectedHash);
            return CryptographicOperations.FixedTimeEquals(actualHash, storedHash);
        }
        catch (FormatException)
        {
            return false;
        }
    }
}