using MyGPASS.Api.DTOs.QRCodes;
using MyGPASS.Api.Security;
using MyGPASS.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MyGPASS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class QRCodesController : ControllerBase
{
    private readonly IQRCodeService _qrCodeService;

    public QRCodesController(IQRCodeService qrCodeService)
    {
        _qrCodeService = qrCodeService;
    }

    [HttpGet]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<IReadOnlyList<QRCodeResponseDto>>> GetQRCodes()
    {
        var qrCodes = await _qrCodeService.GetQRCodesAsync();

        return Ok(qrCodes);
    }

    [HttpGet("booking/{bookingId:long}")]
    public async Task<ActionResult<IReadOnlyList<QRCodeResponseDto>>> GetMyQRCodes(long bookingId)
    {
        var userIdClaim =
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");

        if (!long.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        try
        {
            var qrCodes = await _qrCodeService.GetQRCodesForUserAsync(userId, bookingId);
            return Ok(qrCodes);
        }
        catch (ArgumentException)
        {
            return NotFound();
        }
    }

    [HttpGet("guest/booking/{bookingId:long}")]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<QRCodeResponseDto>>> GetGuestQRCodes(
        long bookingId,
        [FromHeader(Name = "X-Guest-Access-Token")] string? guestAccessToken)
    {
        if (string.IsNullOrWhiteSpace(guestAccessToken)) return NotFound();

        try
        {
            var qrCodes = await _qrCodeService.GetQRCodesForGuestAsync(bookingId, guestAccessToken);
            return Ok(qrCodes);
        }
        catch (ArgumentException)
        {
            return NotFound();
        }
    }
}