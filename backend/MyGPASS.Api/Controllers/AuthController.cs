using MyGPASS.Api.DTOs.Auth;
using MyGPASS.Api.DTOs.Users;
using MyGPASS.Api.Services;
using MyGPASS.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using static MyGPASS.Api.Extensions.SecurityExtensions;

namespace MyGPASS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    [EnableRateLimiting(AuthRegisterRateLimitPolicy)]
    public async Task<ActionResult<UserResponseDto>> Register(
        UserRegisterRequestDto request)
    {
        try
        {
            var user = await _authService.RegisterAsync(request);
            return Ok(user);
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(new ProblemDetails
            {
                Title = "Registration failed.",
                Detail = exception.Message,
                Status = StatusCodes.Status409Conflict
            });
        }
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting(AuthLoginRateLimitPolicy)]
    public async Task<ActionResult<AuthResponseDto>> Login(UserLoginRequestDto request)
    {
        var response = await _authService.LoginAsync(request);

        if (response is not null)
        {
            return Ok(response);
        }

        var user = await _authService.GetUserByMobileNumberAsync(request.MobileNumber);
        if (user is not null && !user.IsEmailVerified)
        {
            return Unauthorized(new ProblemDetails
            {
                Title = "Email verification required.",
                Detail = "Please verify your email address before logging in.",
                Status = StatusCodes.Status401Unauthorized
            });
        }

        return Unauthorized(new ProblemDetails
        {
            Title = "Invalid credentials.",
            Status = StatusCodes.Status401Unauthorized
        });
    }

    [HttpPost("verify-email")]
    [AllowAnonymous]
    [EnableRateLimiting(AuthVerifyEmailRateLimitPolicy)]
    public async Task<IActionResult> VerifyEmail(VerifyEmailRequestDto request)
    {
        var result = await _authService.VerifyEmailAsync(request.Token);
        if (!result)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Email verification failed.",
                Detail = "The verification link is invalid or has expired.",
                Status = StatusCodes.Status400BadRequest
            });
        }

        return Ok(new { message = "Email verified successfully." });
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    [EnableRateLimiting(AuthForgotPasswordRateLimitPolicy)]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequestDto request)
    {
        await _authService.ForgotPasswordAsync(request.Email);

        // Always return success to prevent email enumeration
        return Ok(new { message = "If an account exists for that email address, a password reset link has been sent." });
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    [EnableRateLimiting(AuthResetPasswordRateLimitPolicy)]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequestDto request)
    {
        var result = await _authService.ResetPasswordAsync(request.Token, request.NewPassword);
        if (!result)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Password reset failed.",
                Detail = "The reset link is invalid or has expired.",
                Status = StatusCodes.Status400BadRequest
            });
        }

        return Ok(new { message = "Password reset successfully." });
    }
}