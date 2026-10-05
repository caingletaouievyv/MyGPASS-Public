using MyGPASS.Api.DTOs.Payments;

namespace MyGPASS.Api.Services.Interfaces;

public interface IPaymentService
{
    Task<IReadOnlyList<PaymentResponseDto>> GetPaymentsAsync();
    Task<PaymentResponseDto> CreatePaymentAsync(long bookingId, decimal amount, string merchantTransId);
    Task<PaymentResponseDto> ConfirmPaymentAsync(long paymentId);
    Task<PaymentResponseDto> ConfirmPaymentForUserAsync(long userId, long paymentId);
    Task<PaymentResponseDto> ConfirmPaymentForGuestAsync(long paymentId, string guestAccessToken);
}