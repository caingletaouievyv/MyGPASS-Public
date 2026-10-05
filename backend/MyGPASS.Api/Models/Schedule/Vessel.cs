namespace MyGPASS.Api.Models.Schedule;

public class Vessel
{
    public long VesselId { get; set; }

    public long ShippingLineId { get; set; }

    public string Name { get; set; } = null!;

    public ShippingLine ShippingLine { get; set; } = null!;

    public ICollection<VesselVisit> VesselVisits { get; set; } = new List<VesselVisit>();
}