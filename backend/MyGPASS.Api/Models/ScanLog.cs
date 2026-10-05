namespace MyGPASS.Api.Models;

public class ScanLog
{
    public long ScanLogId { get; set; }

    public long QRCodeId { get; set; }

    public string ScanType { get; set; } = null!;

    public string ScanResult { get; set; } = null!;

    public DateTime ScannedAt { get; set; }

    public QRCode QRCode { get; set; } = null!;
}