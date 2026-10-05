using System.ComponentModel.DataAnnotations;

namespace MyGPASS.Api.DTOs.Users;

public class UserRoleUpdateRequestDto
{
    [Required, StringLength(20)]
    public string Role { get; set; } = string.Empty;
}
