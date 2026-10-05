using MyGPASS.Api.Data;
using MyGPASS.Api.DTOs.Ports;
using MyGPASS.Api.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MyGPASS.Api.Services;

public class PortService : IPortService
{
    private readonly MyGPASSDbContext _dbContext;

    public PortService(MyGPASSDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<PortResponseDto>> GetPortsAsync()
    {
        return await _dbContext.Ports
            .AsNoTracking()
            .OrderBy(port => port.Name)
            .Select(port => new PortResponseDto
            {
                PortId = port.PortId,
                Name = port.Name
            })
            .ToListAsync();
    }
}