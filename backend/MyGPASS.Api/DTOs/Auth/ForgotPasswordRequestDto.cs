using System.ComponentModel.DataAnnotations;

namespace MyGPASS.Api.DTOs.Auth;

public class ForgotPasswordRequestDto
{
    [Required, StringLength(255), EmailAddress]
    public string Email { get; set; } = string.Empty;
}
