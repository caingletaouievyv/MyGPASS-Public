using MyGPASS.Api.Data;
using MyGPASS.Api.DTOs.ShippingLines;
using MyGPASS.Api.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MyGPASS.Api.Services;

public class ShippingLineService : IShippingLineService
{
    private readonly MyGPASSDbContext _dbContext;

    public ShippingLineService(MyGPASSDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<ShippingLineResponseDto>> GetShippingLinesAsync()
    {
        return await _dbContext.ShippingLines
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new ShippingLineResponseDto
            {
                ShippingLineId = x.ShippingLineId,
                Name = x.Name
            })
            .ToListAsync();
    }
}