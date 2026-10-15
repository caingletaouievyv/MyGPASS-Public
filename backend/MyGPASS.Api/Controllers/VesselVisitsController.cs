using MyGPASS.Api.DTOs.VesselVisits;
using MyGPASS.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MyGPASS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class VesselVisitsController : ControllerBase
{
    private readonly IVesselVisitService _vesselVisitService;

    public VesselVisitsController(IVesselVisitService vesselVisitService)
    {
        _vesselVisitService = vesselVisitService;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<VesselVisitResponseDto>>> GetVesselVisits()
    {
        var vesselVisits = await _vesselVisitService.GetVesselVisitsAsync();

        return Ok(vesselVisits);
    }
}
