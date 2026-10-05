using MyGPASS.Api.DTOs.VesselVisits;

namespace MyGPASS.Api.Services.Interfaces;

public interface IVesselVisitService
{
    Task<IReadOnlyList<VesselVisitResponseDto>> GetVesselVisitsAsync();
    Task<VesselVisitAdminResponseDto> CreateVesselVisitAsync(VesselVisitCreateRequestDto request);
    Task<VesselVisitAdminResponseDto> UpdateVesselVisitAsync(long vesselVisitId, VesselVisitUpdateRequestDto request);
    Task DeleteVesselVisitAsync(long vesselVisitId);
}