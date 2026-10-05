using MyGPASS.Api.Data;
using MyGPASS.Api.Models;
using MyGPASS.Api.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace MyGPASS.Api.Tests;

public class PaymentServiceTests
{
    [Fact]
    public async Task ConfirmPaymentAsync_ConfirmsPaymentAndBooking()
    {
        await using var context = CreateContext();
        var originalUpdatedAt = DateTime.UtcNow.AddMinutes(-1);
        var booking = new Booking
        {
            BookingReference = "B-CONFIRM",
            Status = "Pending",
            UpdatedAt = originalUpdatedAt,
            CreatedAt = originalUpdatedAt,
            UserId = 1,
            PassengerCount = 1,
            TotalAmount = 31m
        };
        var payment = new Payment
        {
            Booking = booking,
            MerchantTransId = "GTI-CONFIRM",
            Amount = 31m,
            Currency = "PHP",
            PaymentStatus = "INIT",
            CreatedAt = originalUpdatedAt,
            UpdatedAt = originalUpdatedAt
        };

        context.Payments.Add(payment);
        await context.SaveChangesAsync();

        var result = await CreatePaymentService(context).ConfirmPaymentAsync(payment.PaymentId);

        Assert.Equal("PAID", result.PaymentStatus);
        Assert.NotNull(result.PaidAt);
        Assert.True(result.UpdatedAt > originalUpdatedAt);

        var savedPayment = await context.Payments.SingleAsync();
        var savedBooking = await context.Bookings.SingleAsync();
        Assert.Equal("PAID", savedPayment.PaymentStatus);
        Assert.Equal("Confirmed", savedBooking.Status);
        Assert.NotNull(savedPayment.PaidAt);
        Assert.True(savedPayment.UpdatedAt > originalUpdatedAt);
        Assert.True(savedBooking.UpdatedAt > originalUpdatedAt);
        var qrCode = await context.QRCodes.SingleAsync();
        Assert.Equal(booking.BookingId, qrCode.BookingId);
        Assert.Equal("Active", qrCode.Status);
        Assert.StartsWith("GTI1:", qrCode.QRCodeValue);
        Assert.NotEqual(booking.BookingId.ToString(), qrCode.QRCodeValue);
    }

    [Fact]
    public async Task ConfirmPaymentAsync_CreatesOneQRCodePerPassengerWithDepartureExpiration()
    {
        await using var context = CreateContext();
        var departureAt = new DateTime(2026, 9, 11, 20, 0, 0, DateTimeKind.Utc);
        var booking = new Booking
        {
            BookingReference = "B-MULTI-QR",
            Status = "Pending",
            UpdatedAt = departureAt,
            CreatedAt = departureAt,
            DepartureAt = departureAt,
            UserId = 1,
            PassengerCount = 3,
            TotalAmount = 91m
        };
        var payment = new Payment
        {
            Booking = booking,
            MerchantTransId = "GTI-MULTI-QR",
            Amount = 91m,
            Currency = "PHP",
            PaymentStatus = "INIT",
            CreatedAt = departureAt,
            UpdatedAt = departureAt
        };

        context.Payments.Add(payment);
        await context.SaveChangesAsync();

        var service = CreatePaymentService(context);
        await service.ConfirmPaymentAsync(payment.PaymentId);
        await service.ConfirmPaymentAsync(payment.PaymentId);

        var qrCodes = await context.QRCodes
            .OrderBy(qrCode => qrCode.PassengerNumber)
            .ToListAsync();

        Assert.Equal(3, qrCodes.Count);
        Assert.Equal(new[] { 1, 2, 3 }, qrCodes.Select(qrCode => qrCode.PassengerNumber));
        Assert.All(qrCodes, qrCode =>
        {
            Assert.Equal("Active", qrCode.Status);
            Assert.Equal(departureAt.AddHours(24), qrCode.ExpiresAt);
        });
    }

    [Fact]
    public async Task ConfirmPaymentAsync_AlreadyPaidPaymentIsIdempotent()
    {
        await using var context = CreateContext();
        var originalUpdatedAt = DateTime.UtcNow.AddMinutes(-1);
        var originalPaidAt = DateTime.UtcNow.AddMinutes(-2);
        var booking = new Booking
        {
            BookingReference = "B-PAID",
            Status = "Confirmed",
            UpdatedAt = originalUpdatedAt,
            CreatedAt = originalUpdatedAt,
            UserId = 1,
            PassengerCount = 1,
            TotalAmount = 31m
        };
        var payment = new Payment
        {
            Booking = booking,
            MerchantTransId = "GTI-PAID",
            Amount = 31m,
            Currency = "PHP",
            PaymentStatus = "PAID",
            PaidAt = originalPaidAt,
            CreatedAt = originalUpdatedAt,
            UpdatedAt = originalUpdatedAt
        };

        context.Payments.Add(payment);
        await context.SaveChangesAsync();

        var result = await CreatePaymentService(context).ConfirmPaymentAsync(payment.PaymentId);
        await CreatePaymentService(context).ConfirmPaymentAsync(payment.PaymentId);

        Assert.Equal("PAID", result.PaymentStatus);
        Assert.Equal(originalPaidAt, result.PaidAt);
        Assert.Equal(originalUpdatedAt, result.UpdatedAt);
        Assert.Equal(1, await context.Payments.CountAsync());
        Assert.Equal(1, await context.QRCodes.CountAsync());
    }

    [Fact]
    public async Task ConfirmPaymentAsync_ConcurrentRequestsProduceOnePaidPaymentAndQrSet()
    {
        var databaseName = Guid.NewGuid().ToString();
        await using (var seedContext = CreateContext(databaseName))
        {
            var booking = new Booking
            {
                BookingReference = "B-CONCURRENT-CONFIRM",
                Status = "Pending",
                UserId = 1,
                PassengerCount = 2,
                TotalAmount = 61m,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            seedContext.Payments.Add(new Payment
            {
                Booking = booking,
                MerchantTransId = "GTI-CONCURRENT-CONFIRM",
                Amount = 61m,
                Currency = "PHP",
                PaymentStatus = "INIT",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            await seedContext.SaveChangesAsync();
        }

        await using var firstContext = CreateContext(databaseName);
        await using var secondContext = CreateContext(databaseName);
        var paymentId = await firstContext.Payments.Select(payment => payment.PaymentId).SingleAsync();

        var results = await Task.WhenAll(
            CreatePaymentService(firstContext).ConfirmPaymentAsync(paymentId),
            CreatePaymentService(secondContext).ConfirmPaymentAsync(paymentId));

        Assert.All(results, result => Assert.Equal("PAID", result.PaymentStatus));
        await using var verificationContext = CreateContext(databaseName);
        Assert.Equal("PAID", (await verificationContext.Payments.SingleAsync()).PaymentStatus);
        Assert.Equal("Confirmed", (await verificationContext.Bookings.SingleAsync()).Status);
        Assert.Equal(2, await verificationContext.QRCodes.CountAsync());
        Assert.Equal(2, (await verificationContext.QRCodes
            .Select(qrCode => qrCode.PassengerNumber)
            .ToListAsync()).Distinct().Count());
    }

    [Fact]
    public async Task EnsureQRCodesAsync_ConcurrentRequestsCreateOneQrPerPassenger()
    {
        var databaseName = Guid.NewGuid().ToString();
        await using (var seedContext = CreateContext(databaseName))
        {
            seedContext.Bookings.Add(new Booking
            {
                BookingReference = "B-CONCURRENT-QR",
                Status = "Confirmed",
                UserId = 1,
                PassengerCount = 2,
                TotalAmount = 61m,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            await seedContext.SaveChangesAsync();
        }

        await using var firstContext = CreateContext(databaseName);
        await using var secondContext = CreateContext(databaseName);
        var bookingId = await firstContext.Bookings.Select(booking => booking.BookingId).SingleAsync();

        var results = await Task.WhenAll(
            new QRCodeService(firstContext).EnsureQRCodesAsync(bookingId),
            new QRCodeService(secondContext).EnsureQRCodesAsync(bookingId));

        Assert.All(results, result => Assert.Equal(2, result.Count));
        await using var verificationContext = CreateContext(databaseName);
        Assert.Equal(2, await verificationContext.QRCodes.CountAsync());
        Assert.Equal(new[] { 1, 2 }, await verificationContext.QRCodes
            .OrderBy(qrCode => qrCode.PassengerNumber)
            .Select(qrCode => qrCode.PassengerNumber)
            .ToArrayAsync());
    }

    [Fact]
    public async Task ConfirmPaymentAsync_UnknownPaymentThrowsArgumentException()
    {
        await using var context = CreateContext();

        var exception = await Assert.ThrowsAsync<ArgumentException>(
            () => CreatePaymentService(context).ConfirmPaymentAsync(999));

        Assert.Equal("Payment was not found.", exception.Message);
    }

    [Fact]
    public async Task ConfirmPaymentAsync_ReusesExistingQRCode()
    {
        await using var context = CreateContext();
        var booking = new Booking
        {
            BookingReference = "B-EXISTING-QR",
            Status = "Pending",
            UserId = 1,
            PassengerCount = 1,
            TotalAmount = 31m,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        var existingQrCode = new QRCode
        {
            Booking = booking,
            PassengerNumber = 1,
            QRCodeValue = "GTI1:existing-token",
            Status = "Active",
            CreatedAt = DateTime.UtcNow.AddMinutes(-1)
        };
        var payment = new Payment
        {
            Booking = booking,
            MerchantTransId = "GTI-EXISTING-QR",
            Amount = 31m,
            Currency = "PHP",
            PaymentStatus = "INIT",
            CreatedAt = DateTime.UtcNow.AddMinutes(-1),
            UpdatedAt = DateTime.UtcNow.AddMinutes(-1)
        };

        context.QRCodes.Add(existingQrCode);
        context.Payments.Add(payment);
        await context.SaveChangesAsync();

        await CreatePaymentService(context).ConfirmPaymentAsync(payment.PaymentId);

        var qrCodes = await context.QRCodes.ToListAsync();
        Assert.Single(qrCodes);
        Assert.Equal(existingQrCode.QRCodeId, qrCodes[0].QRCodeId);
        Assert.Equal("GTI1:existing-token", qrCodes[0].QRCodeValue);
    }

    [Fact]
    public async Task ConfirmPaymentForUserAsync_ConfirmsOwnedPaymentAndCreatesQRCode()
    {
        await using var context = CreateContext();
        var booking = new Booking
        {
            BookingReference = "B-USER-CONFIRM",
            Status = "Pending",
            UserId = 42,
            PassengerCount = 1,
            TotalAmount = 31m,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        var payment = new Payment
        {
            Booking = booking,
            MerchantTransId = "GTI-USER-CONFIRM",
            Amount = 31m,
            Currency = "PHP",
            PaymentStatus = "INIT",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        context.Payments.Add(payment);
        await context.SaveChangesAsync();

        var result = await CreatePaymentService(context).ConfirmPaymentForUserAsync(42, payment.PaymentId);

        Assert.Equal("PAID", result.PaymentStatus);
        Assert.Equal("Confirmed", (await context.Bookings.SingleAsync()).Status);
        Assert.Equal("Active", (await context.QRCodes.SingleAsync()).Status);
    }

    [Fact]
    public async Task ConfirmPaymentForUserAsync_RejectsPaymentOwnedByAnotherUser()
    {
        await using var context = CreateContext();
        var booking = new Booking
        {
            BookingReference = "B-OTHER-USER",
            Status = "Pending",
            UserId = 84,
            PassengerCount = 1,
            TotalAmount = 31m,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        var payment = new Payment
        {
            Booking = booking,
            MerchantTransId = "GTI-OTHER-USER",
            Amount = 31m,
            Currency = "PHP",
            PaymentStatus = "INIT",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        context.Payments.Add(payment);
        await context.SaveChangesAsync();

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => CreatePaymentService(context).ConfirmPaymentForUserAsync(42, payment.PaymentId));

        Assert.Equal("INIT", (await context.Payments.SingleAsync()).PaymentStatus);
        Assert.Equal(0, await context.QRCodes.CountAsync());
    }

    [Fact]
    public async Task ConfirmPaymentForGuestAsync_ConfirmsWithCorrectToken()
    {
        await using var context = CreateContext();
        var accessToken = GuestAccessTokenService.Generate();
        var booking = new Booking
        {
            BookingReference = "B-GUEST-CONFIRM",
            Status = "Pending",
            GuestAccessTokenHash = GuestAccessTokenService.Hash(accessToken),
            GuestAccessTokenExpiresAt = DateTime.UtcNow.AddHours(1),
            PassengerCount = 1,
            TotalAmount = 31m,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        var payment = new Payment
        {
            Booking = booking,
            MerchantTransId = "GTI-GUEST-CONFIRM",
            Amount = 31m,
            Currency = "PHP",
            PaymentStatus = "INIT",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        context.Payments.Add(payment);
        await context.SaveChangesAsync();

        var result = await CreatePaymentService(context).ConfirmPaymentForGuestAsync(payment.PaymentId, accessToken);

        Assert.Equal("PAID", result.PaymentStatus);
        Assert.Single(await context.QRCodes.ToListAsync());
    }

    [Fact]
    public async Task ConfirmPaymentForGuestAsync_RejectsIncorrectToken()
    {
        await using var context = CreateContext();
        var booking = new Booking
        {
            BookingReference = "B-GUEST-WRONG-TOKEN",
            Status = "Pending",
            GuestAccessTokenHash = GuestAccessTokenService.Hash(GuestAccessTokenService.Generate()),
            GuestAccessTokenExpiresAt = DateTime.UtcNow.AddHours(1),
            PassengerCount = 1,
            TotalAmount = 31m,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        var payment = new Payment
        {
            Booking = booking,
            MerchantTransId = "GTI-GUEST-WRONG-TOKEN",
            Amount = 31m,
            Currency = "PHP",
            PaymentStatus = "INIT",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        context.Payments.Add(payment);
        await context.SaveChangesAsync();

        await Assert.ThrowsAsync<ArgumentException>(() =>
            CreatePaymentService(context).ConfirmPaymentForGuestAsync(payment.PaymentId, GuestAccessTokenService.Generate()));
        Assert.Equal("INIT", (await context.Payments.SingleAsync()).PaymentStatus);
    }

    [Fact]
    public async Task ConfirmPaymentForGuestAsync_RejectsExpiredToken()
    {
        await using var context = CreateContext();
        var accessToken = GuestAccessTokenService.Generate();
        var payment = await AddGuestPaymentAsync(context, "B-GUEST-EXPIRED", accessToken, DateTime.UtcNow.AddMinutes(-1));

        await Assert.ThrowsAsync<ArgumentException>(() =>
            CreatePaymentService(context).ConfirmPaymentForGuestAsync(payment.PaymentId, accessToken));

        Assert.Equal("INIT", (await context.Payments.SingleAsync()).PaymentStatus);
    }

    [Fact]
    public async Task ConfirmPaymentForGuestAsync_RejectsRevokedToken()
    {
        await using var context = CreateContext();
        var accessToken = GuestAccessTokenService.Generate();
        var payment = await AddGuestPaymentAsync(
            context,
            "B-GUEST-REVOKED",
            accessToken,
            DateTime.UtcNow.AddMinutes(1),
            DateTime.UtcNow.AddMinutes(-1));

        await Assert.ThrowsAsync<ArgumentException>(() =>
            CreatePaymentService(context).ConfirmPaymentForGuestAsync(payment.PaymentId, accessToken));

        Assert.Equal("INIT", (await context.Payments.SingleAsync()).PaymentStatus);
    }

    [Fact]
    public async Task ConfirmPaymentForGuestAsync_RejectsTokenFromAnotherBooking()
    {
        await using var context = CreateContext();
        var accessToken = GuestAccessTokenService.Generate();
        var payment = await AddGuestPaymentAsync(
            context,
            "B-GUEST-OTHER-BOOKING",
            GuestAccessTokenService.Generate(),
            DateTime.UtcNow.AddMinutes(1));

        await Assert.ThrowsAsync<ArgumentException>(() =>
            CreatePaymentService(context).ConfirmPaymentForGuestAsync(payment.PaymentId, accessToken));

        Assert.Equal("INIT", (await context.Payments.SingleAsync()).PaymentStatus);
    }

    [Fact]
    public async Task GetQRCodesForGuestAsync_RequiresCorrectTokenAndBookingOwnership()
    {
        await using var context = CreateContext();
        var accessToken = GuestAccessTokenService.Generate();
        var booking = new Booking
        {
            BookingReference = "B-GUEST-QR",
            Status = "Confirmed",
            GuestAccessTokenHash = GuestAccessTokenService.Hash(accessToken),
            GuestAccessTokenExpiresAt = DateTime.UtcNow.AddHours(1),
            PassengerCount = 1,
            TotalAmount = 31m,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            QRCodes =
            {
                new QRCode
                {
                    PassengerNumber = 1,
                    QRCodeValue = "GTI1:guest-qr",
                    Status = "Active",
                    CreatedAt = DateTime.UtcNow
                }
            }
        };
        context.Bookings.Add(booking);
        await context.SaveChangesAsync();

        var qrService = new QRCodeService(context);
        Assert.Single(await qrService.GetQRCodesForGuestAsync(booking.BookingId, accessToken));
        await Assert.ThrowsAsync<ArgumentException>(() =>
            qrService.GetQRCodesForGuestAsync(booking.BookingId, GuestAccessTokenService.Generate()));
    }

    [Fact]
    public async Task GetQRCodesForGuestAsync_RejectsExpiredToken()
    {
        await using var context = CreateContext();
        var accessToken = GuestAccessTokenService.Generate();
        var booking = new Booking
        {
            BookingReference = "B-GUEST-QR-EXPIRED",
            Status = "Confirmed",
            GuestAccessTokenHash = GuestAccessTokenService.Hash(accessToken),
            GuestAccessTokenExpiresAt = DateTime.UtcNow.AddMinutes(-1),
            PassengerCount = 1,
            TotalAmount = 31m,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Bookings.Add(booking);
        await context.SaveChangesAsync();

        await Assert.ThrowsAsync<ArgumentException>(() =>
            new QRCodeService(context).GetQRCodesForGuestAsync(booking.BookingId, accessToken));
    }

    [Fact]
    public async Task GetQRCodesForGuestAsync_RejectsRevokedToken()
    {
        await using var context = CreateContext();
        var accessToken = GuestAccessTokenService.Generate();
        var booking = new Booking
        {
            BookingReference = "B-GUEST-QR-REVOKED",
            Status = "Confirmed",
            GuestAccessTokenHash = GuestAccessTokenService.Hash(accessToken),
            GuestAccessTokenExpiresAt = DateTime.UtcNow.AddMinutes(1),
            GuestAccessTokenRevokedAt = DateTime.UtcNow.AddMinutes(-1),
            PassengerCount = 1,
            TotalAmount = 31m,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Bookings.Add(booking);
        await context.SaveChangesAsync();

        await Assert.ThrowsAsync<ArgumentException>(() =>
            new QRCodeService(context).GetQRCodesForGuestAsync(booking.BookingId, accessToken));
    }

    [Fact]
    public async Task GetQRCodesForGuestAsync_RejectsTokenFromAnotherBooking()
    {
        await using var context = CreateContext();
        var accessToken = GuestAccessTokenService.Generate();
        var booking = new Booking
        {
            BookingReference = "B-GUEST-QR-OTHER-BOOKING",
            Status = "Confirmed",
            GuestAccessTokenHash = GuestAccessTokenService.Hash(GuestAccessTokenService.Generate()),
            GuestAccessTokenExpiresAt = DateTime.UtcNow.AddMinutes(1),
            PassengerCount = 1,
            TotalAmount = 31m,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Bookings.Add(booking);
        await context.SaveChangesAsync();

        await Assert.ThrowsAsync<ArgumentException>(() =>
            new QRCodeService(context).GetQRCodesForGuestAsync(booking.BookingId, accessToken));
    }

    private static async Task<Payment> AddGuestPaymentAsync(
        MyGPASSDbContext context,
        string bookingReference,
        string storedToken,
        DateTime expiresAt,
        DateTime? revokedAt = null)
    {
        var booking = new Booking
        {
            BookingReference = bookingReference,
            Status = "Pending",
            GuestAccessTokenHash = GuestAccessTokenService.Hash(storedToken),
            GuestAccessTokenExpiresAt = expiresAt,
            GuestAccessTokenRevokedAt = revokedAt,
            PassengerCount = 1,
            TotalAmount = 31m,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        var payment = new Payment
        {
            Booking = booking,
            MerchantTransId = $"GTI-{bookingReference}",
            Amount = 31m,
            Currency = "PHP",
            PaymentStatus = "INIT",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        context.Payments.Add(payment);
        await context.SaveChangesAsync();
        return payment;
    }

    private static PaymentService CreatePaymentService(MyGPASSDbContext context)
    {
        return new PaymentService(context, new QRCodeService(context));
    }

    private static MyGPASSDbContext CreateContext()
        => CreateContext(Guid.NewGuid().ToString());

    private static MyGPASSDbContext CreateContext(string databaseName)
    {
        var options = new DbContextOptionsBuilder<MyGPASSDbContext>()
            .UseInMemoryDatabase(databaseName)
            .Options;

        return new MyGPASSDbContext(options);
    }
}