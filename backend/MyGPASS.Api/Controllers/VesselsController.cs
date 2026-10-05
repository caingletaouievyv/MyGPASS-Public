using MyGPASS.Api.DTOs.Vessels;
using MyGPASS.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MyGPASS.Api.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/[controller]")]
public class VesselsController : ControllerBase
{
    private readonly IVesselService _vesselService;

    public VesselsController(IVesselService vesselService)
    {
        _vesselService = vesselService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<VesselResponseDto>>> GetVessels()
    {
        var vessels = await _vesselService.GetVesselsAsync();

        return Ok(vessels);
    }
}