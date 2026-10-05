using System.ComponentModel.DataAnnotations;

namespace MyGPASS.Api.DTOs.Bookings;

public class BookingCreateRequestDto
{
    [Range(1, long.MaxValue)]
    public long OriginPortId { get; set; }

    [Range(1, long.MaxValue)]
    public long DestinationPortId { get; set; }

    [Range(1, long.MaxValue)]
    public long ShippingLineId { get; set; }

    [Range(1, long.MaxValue)]
    public long VesselVisitId { get; set; }

    [CustomValidation(typeof(BookingCreateRequestDto), nameof(ValidateDepartureAt))]
    public DateTime DepartureAt { get; set; }

    [Range(1, 10)]
    public int PassengerCount { get; set; }

    public static ValidationResult? ValidateDepartureAt(DateTime departureAt)
    {
        return departureAt == default
            ? new ValidationResult("DepartureAt is required.")
            : ValidationResult.Success;
    }
}