using MyGPASS.Api.DTOs.Ports;

namespace MyGPASS.Api.Services.Interfaces;

public interface IPortService
{
    Task<IReadOnlyList<PortResponseDto>> GetPortsAsync();
}