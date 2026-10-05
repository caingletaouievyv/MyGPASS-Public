using MyGPASS.Api.Data;
using MyGPASS.Api.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MyGPASS.Api.Services;

public class DatabaseService : IDatabaseService
{
    private readonly MyGPASSDbContext _dbContext;

    public DatabaseService(MyGPASSDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<bool> CanConnectAsync()
    {
        return await _dbContext.Database.CanConnectAsync();
    }
}