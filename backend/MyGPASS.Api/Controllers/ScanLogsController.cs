using MyGPASS.Api.DTOs.ScanLogs;
using MyGPASS.Api.Security;
using MyGPASS.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MyGPASS.Api.Controllers;

[ApiController]
[Authorize(Roles = Roles.Admin)]
[Route("api/[controller]")]
public class ScanLogsController : ControllerBase
{
    private readonly IScanLogService _scanLogService;

    public ScanLogsController(IScanLogService scanLogService)
    {
        _scanLogService = scanLogService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ScanLogResponseDto>>> GetScanLogs()
    {
        var scanLogs = await _scanLogService.GetScanLogsAsync();

        return Ok(scanLogs);
    }
}