namespace MyGPASS.Api.Models.Schedule;

public class ShippingLine
{
    public long ShippingLineId { get; set; }

    public string Name { get; set; } = null!;

    public ICollection<Vessel> Vessels { get; set; } = new List<Vessel>();

}