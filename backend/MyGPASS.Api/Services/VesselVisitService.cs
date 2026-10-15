using MyGPASS.Api.Data;
using MyGPASS.Api.DTOs.VesselVisits;
using MyGPASS.Api.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MyGPASS.Api.Services;

public class VesselVisitService : IVesselVisitService
{
    private readonly MyGPASSDbContext _dbContext;

    public VesselVisitService(MyGPASSDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<VesselVisitResponseDto>> GetVesselVisitsAsync()
    {
        return await _dbContext.VesselVisits
            .AsNoTracking()
            .OrderBy(x => x.OriginPort.Name)
            .ThenBy(x => x.DestinationPort.Name)
            .ThenBy(x => x.EstimatedTimeOfDeparture)
            .Select(x => new VesselVisitResponseDto
            {
                VesselVisitId = x.VesselVisitId,
                OriginPortId = x.OriginPortId,
                OriginPortName = x.OriginPort.Name,
                DestinationPortId = x.DestinationPortId,
                DestinationPortName = x.DestinationPort.Name,
                ShippingLineId = x.Vessel.ShippingLineId,
                ShippingLineName = x.Vessel.ShippingLine.Name,
                VesselId = x.VesselId,
                VesselName = x.Vessel.Name,
                DayOfDeparture = x.DayOfDeparture,
                EstimatedTimeOfDeparture = x.EstimatedTimeOfDeparture
            })
            .ToListAsync();
    }
}
