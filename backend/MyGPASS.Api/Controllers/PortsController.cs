using MyGPASS.Api.DTOs.Ports;
using MyGPASS.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MyGPASS.Api.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/[controller]")]
public class PortsController : ControllerBase
{
    private readonly IPortService _portService;

    public PortsController(IPortService portService)
    {
        _portService = portService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PortResponseDto>>> GetPorts()
    {
        var ports = await _portService.GetPortsAsync();

        return Ok(ports);
    }
}