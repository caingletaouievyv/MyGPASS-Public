using MyGPASS.Api.DTOs.Payments;
using MyGPASS.Api.Security;
using MyGPASS.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MyGPASS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _paymentService;

    public PaymentsController(IPaymentService paymentService)
    {
        _paymentService = paymentService;
    }

    [HttpGet]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<IReadOnlyList<PaymentResponseDto>>> GetPayments()
    {
        var payments = await _paymentService.GetPaymentsAsync();

        return Ok(payments);
    }

    [HttpPost("{paymentId:long}/confirm")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<PaymentResponseDto>> ConfirmPayment(long paymentId)
    {
        var payment = await _paymentService.ConfirmPaymentAsync(paymentId);
        return Ok(payment);
    }

    [HttpPost("{paymentId:long}/demo-confirm")]
    public async Task<ActionResult<PaymentResponseDto>> DemoConfirmPayment(long paymentId)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!long.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        try
        {
            var payment = await _paymentService.ConfirmPaymentForUserAsync(userId, paymentId);
            return Ok(payment);
        }
        catch (ArgumentException)
        {
            return NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPost("{paymentId:long}/guest-demo-confirm")]
    [AllowAnonymous]
    public async Task<ActionResult<PaymentResponseDto>> DemoConfirmGuestPayment(
        long paymentId,
        [FromHeader(Name = "X-Guest-Access-Token")] string? guestAccessToken)
    {
        if (string.IsNullOrWhiteSpace(guestAccessToken)) return NotFound();

        try
        {
            var payment = await _paymentService.ConfirmPaymentForGuestAsync(paymentId, guestAccessToken);
            return Ok(payment);
        }
        catch (ArgumentException)
        {
            return NotFound();
        }
    }
}