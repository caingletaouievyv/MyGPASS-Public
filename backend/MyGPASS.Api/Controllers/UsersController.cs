using MyGPASS.Api.DTOs.Users;
using MyGPASS.Api.Security;
using MyGPASS.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MyGPASS.Api.Controllers;

[ApiController]
[Authorize(Roles = Roles.Admin)]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<UserResponseDto>>> GetUsers()
    {
        var users = await _userService.GetUsersAsync();

        return Ok(users);
    }

    [HttpPut("{userId:long}")]
    public async Task<ActionResult<UserResponseDto>> UpdateUser(long userId, UserUpdateRequestDto request)
    {
        try
        {
            return Ok(await _userService.UpdateUserAsync(userId, request));
        }
        catch (KeyNotFoundException exception)
        {
            return NotFound(new ProblemDetails { Title = exception.Message });
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(new ProblemDetails { Title = exception.Message });
        }
    }

    [HttpPatch("{userId:long}/status")]
    public Task<ActionResult<UserResponseDto>> UpdateStatus(long userId, UserStatusUpdateRequestDto request)
        => ExecuteManagementAction(() => _userService.UpdateStatusAsync(userId, request.IsActive, CurrentUserId()));

    [HttpPatch("{userId:long}/role")]
    public Task<ActionResult<UserResponseDto>> UpdateRole(long userId, UserRoleUpdateRequestDto request)
        => ExecuteManagementAction(() => _userService.UpdateRoleAsync(userId, request.Role, CurrentUserId()));

    private async Task<ActionResult<UserResponseDto>> ExecuteManagementAction(Func<Task<UserResponseDto>> action)
    {
        try
        {
            return Ok(await action());
        }
        catch (KeyNotFoundException exception)
        {
            return NotFound(new ProblemDetails { Title = exception.Message });
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new ProblemDetails { Title = exception.Message });
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(new ProblemDetails { Title = exception.Message });
        }
    }

    private long CurrentUserId()
        => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}