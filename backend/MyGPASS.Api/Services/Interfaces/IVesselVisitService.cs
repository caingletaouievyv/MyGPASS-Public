using MyGPASS.Api.DTOs.VesselVisits;

namespace MyGPASS.Api.Services.Interfaces;

public interface IVesselVisitService
{
    Task<IReadOnlyList<VesselVisitResponseDto>> GetVesselVisitsAsync();
}
