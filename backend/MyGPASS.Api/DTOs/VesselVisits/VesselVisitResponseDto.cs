namespace MyGPASS.Api.DTOs.VesselVisits;

public class VesselVisitResponseDto
{
    public long VesselVisitId { get; set; }

    public long OriginPortId { get; set; }

    public string OriginPortName { get; set; } = null!;

    public long DestinationPortId { get; set; }

    public string DestinationPortName { get; set; } = null!;

    public long ShippingLineId { get; set; }

    public string ShippingLineName { get; set; } = null!;

    public long VesselId { get; set; }

    public string VesselName { get; set; } = null!;

    public string? DayOfDeparture { get; set; }

    public TimeSpan EstimatedTimeOfDeparture { get; set; }
}