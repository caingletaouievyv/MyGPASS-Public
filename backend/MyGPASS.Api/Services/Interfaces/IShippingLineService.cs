using MyGPASS.Api.DTOs.ShippingLines;

namespace MyGPASS.Api.Services.Interfaces;

public interface IShippingLineService
{
    Task<IReadOnlyList<ShippingLineResponseDto>> GetShippingLinesAsync();
}