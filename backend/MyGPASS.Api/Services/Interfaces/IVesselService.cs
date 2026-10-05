using MyGPASS.Api.DTOs.Vessels;

namespace MyGPASS.Api.Services.Interfaces;

public interface IVesselService
{
    Task<IReadOnlyList<VesselResponseDto>> GetVesselsAsync();
}