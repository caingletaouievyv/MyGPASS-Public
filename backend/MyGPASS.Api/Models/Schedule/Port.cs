namespace MyGPASS.Api.Models.Schedule;

public class Port
{
    public long PortId { get; set; }

    public string Name { get; set; } = null!;

    public ICollection<VesselVisit> OriginVesselVisits { get; set; } = new List<VesselVisit>();

    public ICollection<VesselVisit> DestinationVesselVisits { get; set; } = new List<VesselVisit>();
}