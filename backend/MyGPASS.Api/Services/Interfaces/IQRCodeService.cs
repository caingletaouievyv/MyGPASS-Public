using MyGPASS.Api.DTOs.QRCodes;

namespace MyGPASS.Api.Services.Interfaces;

public interface IQRCodeService
{
    Task<IReadOnlyList<QRCodeResponseDto>> GetQRCodesAsync();
    Task<IReadOnlyList<QRCodeResponseDto>> EnsureQRCodesAsync(long bookingId);

    Task<IReadOnlyList<QRCodeResponseDto>> GetQRCodesForUserAsync(long userId, long bookingId);
    Task<IReadOnlyList<QRCodeResponseDto>> GetQRCodesForGuestAsync(long bookingId, string guestAccessToken);
}