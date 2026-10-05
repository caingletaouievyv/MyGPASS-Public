using MyGPASS.Api.DTOs.ScanLogs;

namespace MyGPASS.Api.Services.Interfaces;

public interface IScanLogService
{
    Task<IReadOnlyList<ScanLogResponseDto>> GetScanLogsAsync();
}