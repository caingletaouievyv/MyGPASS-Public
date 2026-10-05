using MyGPASS.Api.DTOs.ShippingLines;
using MyGPASS.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MyGPASS.Api.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/[controller]")]
public class ShippingLinesController : ControllerBase
{
    private readonly IShippingLineService _shippingLineService;

    public ShippingLinesController(IShippingLineService shippingLineService)
    {
        _shippingLineService = shippingLineService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ShippingLineResponseDto>>> GetShippingLines()
    {
        var shippingLines = await _shippingLineService.GetShippingLinesAsync();

        return Ok(shippingLines);
    }
}