namespace MyGPASS.Api.DTOs.QRCodes;

public class QRCodeResponseDto
{
    public long QRCodeId { get; set; }

    public long BookingId { get; set; }

    public int PassengerNumber { get; set; }

    public string QRCodeValue { get; set; } = null!;

    public string Status { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public DateTime? ExpiresAt { get; set; }
}