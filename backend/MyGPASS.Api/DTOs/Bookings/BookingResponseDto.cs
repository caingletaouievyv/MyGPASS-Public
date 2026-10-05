namespace MyGPASS.Api.DTOs.Bookings;

public class BookingResponseDto
{
    public long BookingId { get; set; }

    public long? PaymentId { get; set; }

    public long? UserId { get; set; }

    public string? GuestAccessToken { get; set; }

    public string BookingReference { get; set; } = null!;

    public long? OriginPortId { get; set; }

    public long? DestinationPortId { get; set; }

    public long? ShippingLineId { get; set; }

    public long? VesselVisitId { get; set; }

    public DateTime? DepartureAt { get; set; }

    public string? OriginPortName { get; set; }

    public string? DestinationPortName { get; set; }

    public string? ShippingLineName { get; set; }

    public string? VesselName { get; set; }

    public string? DepartureDay { get; set; }

    public TimeSpan? DepartureTime { get; set; }

    public int PassengerCount { get; set; }

    public decimal TotalAmount { get; set; }

    public string Status { get; set; } = null!;

    public string? PaymentStatus { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public DateTime? ExpiresAt { get; set; }
}