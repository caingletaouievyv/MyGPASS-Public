using MyGPASS.Api.DTOs.VesselVisits;
using MyGPASS.Api.Security;
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

    [HttpPost]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<VesselVisitAdminResponseDto>> CreateVesselVisit(VesselVisitCreateRequestDto request)
    {
        try
        {
            return Ok(await _vesselVisitService.CreateVesselVisitAsync(request));
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

    [HttpPut("{vesselVisitId:long}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<VesselVisitAdminResponseDto>> UpdateVesselVisit(long vesselVisitId, VesselVisitUpdateRequestDto request)
    {
        try
        {
            return Ok(await _vesselVisitService.UpdateVesselVisitAsync(vesselVisitId, request));
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

    [HttpDelete("{vesselVisitId:long}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult> DeleteVesselVisit(long vesselVisitId)
    {
        try
        {
            await _vesselVisitService.DeleteVesselVisitAsync(vesselVisitId);
            return NoContent();
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
}
