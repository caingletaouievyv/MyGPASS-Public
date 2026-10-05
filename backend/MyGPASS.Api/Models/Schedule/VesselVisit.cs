using MyGPASS.Api.Models;

namespace MyGPASS.Api.Models.Schedule;

public class VesselVisit
{
    public long VesselVisitId { get; set; }

    public long OriginPortId { get; set; }

    public long DestinationPortId { get; set; }

    public long VesselId { get; set; }

    public string? DayOfDeparture { get; set; }

    public TimeSpan EstimatedTimeOfDeparture { get; set; }

    public Port OriginPort { get; set; } = null!;

    public Port DestinationPort { get; set; } = null!;

    public Vessel Vessel { get; set; } = null!;

    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
}