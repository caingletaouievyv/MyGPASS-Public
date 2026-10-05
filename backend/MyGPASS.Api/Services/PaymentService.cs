using MyGPASS.Api.Data;
using MyGPASS.Api.DTOs.Payments;
using MyGPASS.Api.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace MyGPASS.Api.Services;

public class PaymentService : IPaymentService
{
    private readonly MyGPASSDbContext _dbContext;
    private readonly IQRCodeService _qrCodeService;

    public PaymentService(MyGPASSDbContext dbContext, IQRCodeService qrCodeService)
    {
        _dbContext = dbContext;
        _qrCodeService = qrCodeService;
    }

    public async Task<IReadOnlyList<PaymentResponseDto>> GetPaymentsAsync()
    {
        return await _dbContext.Payments
            .AsNoTracking()
            .Select(payment => new PaymentResponseDto
            {
                PaymentId = payment.PaymentId,
                BookingId = payment.BookingId,
                MerchantTransId = payment.MerchantTransId,
                AcquirementId = payment.AcquirementId,
                TransactionId = payment.TransactionId,
                Amount = payment.Amount,
                Currency = payment.Currency,
                PaymentStatus = payment.PaymentStatus,
                CheckoutUrl = payment.CheckoutUrl,
                PaidAt = payment.PaidAt,
                CreatedAt = payment.CreatedAt,
                UpdatedAt = payment.UpdatedAt
            })
            .ToListAsync();
    }

    public async Task<PaymentResponseDto> CreatePaymentAsync(long bookingId, decimal amount, string merchantTransId)
    {
        var now = DateTime.UtcNow;

        var payment = new MyGPASS.Api.Models.Payment
        {
            BookingId = bookingId,
            MerchantTransId = merchantTransId,
            Amount = amount,
            Currency = "PHP",
            PaymentStatus = "INIT",
            AcquirementId = null,
            TransactionId = null,
            CheckoutUrl = null,
            PaidAt = null,
            CreatedAt = now,
            UpdatedAt = now
        };

        _dbContext.Payments.Add(payment);
        await _dbContext.SaveChangesAsync();

        return MapPayment(payment);
    }

    public async Task<PaymentResponseDto> ConfirmPaymentAsync(long paymentId)
    {
        var payment = await LoadPaymentAsync(paymentId);
        if (payment == null)
        {
            throw new ArgumentException("Payment was not found.");
        }

        if (payment.PaymentStatus == "PAID")
        {
            await _qrCodeService.EnsureQRCodesAsync(payment.BookingId);
            return MapPayment(payment);
        }

        if (payment.PaymentStatus != "INIT" || payment.Booking.Status != "Pending")
        {
            throw new InvalidOperationException("Payment is not in a confirmable state.");
        }

        var now = DateTime.UtcNow;
        payment.PaymentStatus = "PAID";
        payment.PaidAt = now;
        payment.UpdatedAt = now;
        payment.Booking.Status = "Confirmed";
        payment.Booking.UpdatedAt = now;

        IDbContextTransaction? transaction = null;
        try
        {
            if (_dbContext.Database.IsRelational())
            {
                transaction = await _dbContext.Database.BeginTransactionAsync();
            }

            await _dbContext.SaveChangesAsync();
            await _qrCodeService.EnsureQRCodesAsync(payment.BookingId);

            if (transaction != null)
            {
                await transaction.CommitAsync();
            }
        }
        catch (DbUpdateConcurrencyException)
        {
            if (transaction != null)
            {
                await transaction.RollbackAsync();
            }

            _dbContext.ChangeTracker.Clear();
            payment = await LoadPaymentAsync(paymentId);
            if (payment?.PaymentStatus != "PAID")
            {
                throw;
            }

            await _qrCodeService.EnsureQRCodesAsync(payment.BookingId);
        }
        finally
        {
            if (transaction != null)
            {
                await transaction.DisposeAsync();
            }
        }

        return MapPayment(payment);
    }

    private Task<MyGPASS.Api.Models.Payment?> LoadPaymentAsync(long paymentId)
        => _dbContext.Payments
            .Include(candidate => candidate.Booking)
            .FirstOrDefaultAsync(candidate => candidate.PaymentId == paymentId);

    public async Task<PaymentResponseDto> ConfirmPaymentForUserAsync(long userId, long paymentId)
    {
        var payment = await _dbContext.Payments
            .Include(candidate => candidate.Booking)
            .FirstOrDefaultAsync(candidate => candidate.PaymentId == paymentId);

        if (payment == null)
        {
            throw new ArgumentException("Payment was not found.");
        }

        if (payment.Booking.UserId != userId)
        {
            throw new UnauthorizedAccessException("Payment does not belong to the current user.");
        }

        return await ConfirmPaymentAsync(paymentId);
    }

    public async Task<PaymentResponseDto> ConfirmPaymentForGuestAsync(long paymentId, string guestAccessToken)
    {
        var payment = await _dbContext.Payments
            .Include(candidate => candidate.Booking)
            .FirstOrDefaultAsync(candidate => candidate.PaymentId == paymentId);

        if (payment?.Booking == null || payment.Booking.UserId != null ||
            !GuestAccessTokenService.Matches(guestAccessToken, payment.Booking.GuestAccessTokenHash) ||
            payment.Booking.GuestAccessTokenRevokedAt != null ||
            (payment.Booking.GuestAccessTokenExpiresAt.HasValue && payment.Booking.GuestAccessTokenExpiresAt <= DateTime.UtcNow))
        {
            throw new ArgumentException("Guest payment was not found.");
        }

        return await ConfirmPaymentAsync(paymentId);
    }

    private static PaymentResponseDto MapPayment(MyGPASS.Api.Models.Payment payment)
    {
        return new PaymentResponseDto
        {
            PaymentId = payment.PaymentId,
            BookingId = payment.BookingId,
            MerchantTransId = payment.MerchantTransId,
            AcquirementId = payment.AcquirementId,
            TransactionId = payment.TransactionId,
            Amount = payment.Amount,
            Currency = payment.Currency,
            PaymentStatus = payment.PaymentStatus,
            CheckoutUrl = payment.CheckoutUrl,
            PaidAt = payment.PaidAt,
            CreatedAt = payment.CreatedAt,
            UpdatedAt = payment.UpdatedAt
        };
    }
}