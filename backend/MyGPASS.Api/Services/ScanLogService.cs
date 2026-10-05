using MyGPASS.Api.Data;
using MyGPASS.Api.DTOs.ScanLogs;
using MyGPASS.Api.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MyGPASS.Api.Services;

public class ScanLogService : IScanLogService
{
    private readonly MyGPASSDbContext _dbContext;

    public ScanLogService(MyGPASSDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<ScanLogResponseDto>> GetScanLogsAsync()
    {
        return await _dbContext.ScanLogs
            .AsNoTracking()
            .Select(scanLog => new ScanLogResponseDto
            {
                ScanLogId = scanLog.ScanLogId,
                QRCodeId = scanLog.QRCodeId,
                ScanType = scanLog.ScanType,
                ScanResult = scanLog.ScanResult,
                ScannedAt = scanLog.ScannedAt
            })
            .ToListAsync();
    }
}