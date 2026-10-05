using System.ComponentModel.DataAnnotations;

namespace MyGPASS.Api.DTOs.Users;

public class UserUpdateRequestDto
{
    [Required, MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    [Required, MaxLength(20)]
    [RegularExpression(@"^09(?!0{9}$|1{9}$|2{9}$|3{9}$|4{9}$|5{9}$|6{9}$|7{9}$|8{9}$|9{9}$)\d{9}$")]
    public string MobileNumber { get; set; } = string.Empty;

    [EmailAddress, MaxLength(255)]
    public string? Email { get; set; }
}
