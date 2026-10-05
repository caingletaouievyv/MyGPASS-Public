namespace MyGPASS.Api.Configuration;

public class GCashOptions
{
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
    public string MerchantId { get; set; } = string.Empty;
    public string SubMerchantId { get; set; } = string.Empty;
    public string SubMerchantName { get; set; } = string.Empty;
    public string ProductCode { get; set; } = string.Empty;

    public string ApiBaseUrl { get; set; } = string.Empty;

    public string PayReturnUrl { get; set; } = string.Empty;
    public string CancelReturnUrl { get; set; } = string.Empty;
    public string NotificationUrl { get; set; } = string.Empty;
}