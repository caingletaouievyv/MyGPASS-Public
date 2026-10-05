namespace MyGPASS.Api.Models;

public class TransactionLog
{
    public long TransactionLogId { get; set; }

    public string EventType { get; set; } = null!;

    public string EntityType { get; set; } = null!;

    public long EntityId { get; set; }

    public string? Status { get; set; }

    public string? Details { get; set; }

    public DateTime CreatedAt { get; set; }
}