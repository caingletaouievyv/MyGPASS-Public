using MyGPASS.Api.Data;
using MyGPASS.Api.DTOs.Vessels;
using MyGPASS.Api.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MyGPASS.Api.Services;

public class VesselService : IVesselService
{
    private readonly MyGPASSDbContext _dbContext;

    public VesselService(MyGPASSDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<VesselResponseDto>> GetVesselsAsync()
    {
        return await _dbContext.Vessels
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new VesselResponseDto
            {
                VesselId = x.VesselId,
                ShippingLineId = x.ShippingLineId,
                Name = x.Name
            })
            .ToListAsync();
    }
}