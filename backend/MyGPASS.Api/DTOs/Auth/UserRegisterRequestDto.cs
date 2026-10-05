using System.ComponentModel.DataAnnotations;

namespace MyGPASS.Api.DTOs.Auth;

public class UserRegisterRequestDto
{
    [Required, StringLength(20)]
    [RegularExpression(@"^09(?!0{9}$|1{9}$|2{9}$|3{9}$|4{9}$|5{9}$|6{9}$|7{9}$|8{9}$|9{9}$)\d{9}$")]
    public string MobileNumber { get; set; } = string.Empty;

    [Required, StringLength(255), EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, StringLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required, StringLength(100)]
    public string LastName { get; set; } = string.Empty;

    [Required, StringLength(128, MinimumLength = 8)]
    [RegularExpression(@"^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$", ErrorMessage = "Password must contain at least one uppercase letter, lowercase letter, number, and special character.")]
    public string Password { get; set; } = string.Empty;
}