using System.ComponentModel.DataAnnotations;

namespace MyGPASS.Api.DTOs.Auth;

public class ResetPasswordRequestDto
{
    [Required, StringLength(256)]
    public string Token { get; set; } = string.Empty;

    [Required, StringLength(128, MinimumLength = 8)]
    [RegularExpression(@"^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$", ErrorMessage = "Password must contain at least one uppercase letter, lowercase letter, number, and special character.")]
    public string NewPassword { get; set; } = string.Empty;
}
