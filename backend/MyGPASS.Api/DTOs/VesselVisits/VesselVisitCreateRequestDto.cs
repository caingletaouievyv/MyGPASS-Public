using System.ComponentModel.DataAnnotations;

namespace MyGPASS.Api.DTOs.VesselVisits;

public class VesselVisitCreateRequestDto
{
    [Range(1, long.MaxValue)]
    public long OriginPortId { get; set; }

    [Range(1, long.MaxValue)]
    public long DestinationPortId { get; set; }

    [Range(1, long.MaxValue)]
    public long VesselId { get; set; }

    [StringLength(30)]
    public string? DayOfDeparture { get; set; }

    [Required]
    public TimeSpan EstimatedTimeOfDeparture { get; set; }
}
