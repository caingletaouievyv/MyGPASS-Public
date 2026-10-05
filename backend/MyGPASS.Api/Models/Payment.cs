namespace MyGPASS.Api.Models;

public class Payment
{
    public long PaymentId { get; set; }

    public long BookingId { get; set; }

    public string MerchantTransId { get; set; } = null!;

    public string? AcquirementId { get; set; }

    public string? TransactionId { get; set; }

    public decimal Amount { get; set; }

    public string Currency { get; set; } = "PHP";

    public string PaymentStatus { get; set; } = null!;

    public string? CheckoutUrl { get; set; }

    public DateTime? PaidAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public Booking Booking { get; set; } = null!;

}