using System.ComponentModel.DataAnnotations;

namespace MyGPASS.Api.DTOs.Auth;

public class UserLoginRequestDto
{
    [Required, StringLength(20)]
    [RegularExpression(@"^09(?!0{9}$|1{9}$|2{9}$|3{9}$|4{9}$|5{9}$|6{9}$|7{9}$|8{9}$|9{9}$)\d{9}$")]
    public string MobileNumber { get; set; } = string.Empty;

    [Required, StringLength(128, MinimumLength = 8)]
    public string Password { get; set; } = string.Empty;
}
