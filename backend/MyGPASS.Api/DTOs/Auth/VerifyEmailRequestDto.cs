using System.ComponentModel.DataAnnotations;

namespace MyGPASS.Api.DTOs.Auth;

public class VerifyEmailRequestDto
{
    [Required, StringLength(256)]
    public string Token { get; set; } = string.Empty;
}
