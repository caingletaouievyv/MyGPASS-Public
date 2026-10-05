using System.Security.Claims;
using MyGPASS.Api.DTOs.Bookings;
using MyGPASS.Api.Extensions;
using MyGPASS.Api.Security;
using MyGPASS.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace MyGPASS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class BookingsController : ControllerBase
{
    private readonly IBookingService _bookingService;

    public BookingsController(IBookingService bookingService)
    {
        _bookingService = bookingService;
    }

    [HttpGet]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<IReadOnlyList<BookingResponseDto>>> GetBookings()
    {
        var bookings = await _bookingService.GetBookingsAsync();

        return Ok(bookings);
    }

    [HttpGet("mine")]
    public async Task<ActionResult<IReadOnlyList<BookingResponseDto>>> GetMyBookings()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!long.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        var bookings = await _bookingService.GetBookingsForUserAsync(userId);
        return Ok(bookings);
    }

    [HttpPost]
    public async Task<ActionResult<BookingResponseDto>> CreateBooking(
        BookingCreateRequestDto request)
    {
        var userIdClaim =
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");

        if (!long.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        var booking = await _bookingService.CreateBookingAsync(userId, request);
        return Ok(booking);
    }

    [HttpPost("guest")]
    [AllowAnonymous]
    [EnableRateLimiting(SecurityExtensions.GuestBookingCreateRateLimitPolicy)]
    public async Task<ActionResult<BookingResponseDto>> CreateGuestBooking(BookingCreateRequestDto request)
    {
        var booking = await _bookingService.CreateGuestBookingAsync(request);
        return Ok(booking);
    }
}