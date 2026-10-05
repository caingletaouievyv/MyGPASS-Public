using MyGPASS.Api.Models.Schedule;

namespace MyGPASS.Api.Models;

public class Booking
{
    public long BookingId { get; set; }

    public long? UserId { get; set; }

    public string? GuestAccessTokenHash { get; set; }

    public DateTime? GuestAccessTokenExpiresAt { get; set; }

    public DateTime? GuestAccessTokenRevokedAt { get; set; }

    public string BookingReference { get; set; } = null!;

    public long? OriginPortId { get; set; }

    public long? DestinationPortId { get; set; }

    public long? ShippingLineId { get; set; }

    public long? VesselVisitId { get; set; }

    public DateTime? DepartureAt { get; set; }

    public int PassengerCount { get; set; }

    public decimal TotalAmount { get; set; }

    public string Status { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public DateTime? ExpiresAt { get; set; }

    public User? User { get; set; }

    public Port? OriginPort { get; set; }

    public Port? DestinationPort { get; set; }

    public ShippingLine? ShippingLine { get; set; }

    public VesselVisit? VesselVisit { get; set; }

    public ICollection<Payment> Payments { get; set; } = new List<Payment>();

    public ICollection<QRCode> QRCodes { get; set; } = new List<QRCode>();
}