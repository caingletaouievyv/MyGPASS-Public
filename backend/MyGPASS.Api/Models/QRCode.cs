namespace MyGPASS.Api.Models;

public class QRCode
{
    public long QRCodeId { get; set; }

    public long BookingId { get; set; }

    public int PassengerNumber { get; set; }

    public string QRCodeValue { get; set; } = null!;

    public string Status { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public DateTime? ExpiresAt { get; set; }

    public Booking Booking { get; set; } = null!;

    public ICollection<ScanLog> ScanLogs { get; set; } = new List<ScanLog>();
}