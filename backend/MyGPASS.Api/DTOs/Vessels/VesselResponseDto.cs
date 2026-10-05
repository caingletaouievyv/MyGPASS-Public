namespace MyGPASS.Api.DTOs.Vessels;

public class VesselResponseDto
{
    public long VesselId { get; set; }

    public long ShippingLineId { get; set; }

    public string Name { get; set; } = null!;
}