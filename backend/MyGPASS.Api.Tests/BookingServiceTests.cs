using MyGPASS.Api.Data;
using MyGPASS.Api.DTOs.Bookings;
using MyGPASS.Api.DTOs.Payments;
using MyGPASS.Api.Models;
using MyGPASS.Api.Models.Schedule;
using MyGPASS.Api.Services;
using MyGPASS.Api.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace MyGPASS.Api.Tests;

public class BookingServiceTests
{
    [Fact]
    public async Task CreateBookingAsync_ReturnsCreatedPaymentId()
    {
        await using var context = CreateContext();
        var paymentService = new FakePaymentService();
        var service = new BookingService(context, paymentService);
        var origin = new Port { Name = "Manila" };
        var destination = new Port { Name = "Cebu" };
        var shippingLine = new ShippingLine { Name = "Globalport" };
        var vessel = new Vessel { Name = "MV Demo", ShippingLine = shippingLine };
        var vesselVisit = new VesselVisit
        {
            OriginPort = origin,
            DestinationPort = destination,
            Vessel = vessel,
            DayOfDeparture = "Daily",
            EstimatedTimeOfDeparture = new TimeSpan(9, 0, 0)
        };

        context.Ports.AddRange(origin, destination);
        context.ShippingLines.Add(shippingLine);
        context.Vessels.Add(vessel);
        context.VesselVisits.Add(vesselVisit);
        await context.SaveChangesAsync();

        var result = await service.CreateBookingAsync(7, new BookingCreateRequestDto
        {
            OriginPortId = origin.PortId,
            DestinationPortId = destination.PortId,
            ShippingLineId = shippingLine.ShippingLineId,
            VesselVisitId = vesselVisit.VesselVisitId,
            DepartureAt = DateTime.UtcNow.Date.AddDays(1).AddHours(23),
            PassengerCount = 2
        });

        Assert.Equal(123, result.PaymentId);
        Assert.Equal(result.BookingId, paymentService.BookingId);
        Assert.Equal("Pending", result.Status);
        Assert.Equal(DateTime.UtcNow.Date.AddDays(1).AddHours(9), (await context.Bookings.SingleAsync()).DepartureAt);
    }

    [Fact]
    public async Task CreateBookingAsync_UsesVesselVisitTimeWhenClientSuppliesDifferentTime()
    {
        await using var context = CreateContext();
        var paymentService = new FakePaymentService();
        var service = new BookingService(context, paymentService);
        var origin = new Port { Name = "Manila" };
        var destination = new Port { Name = "Cebu" };
        var shippingLine = new ShippingLine { Name = "Globalport" };
        var vessel = new Vessel { Name = "MV Demo", ShippingLine = shippingLine };
        var vesselVisit = new VesselVisit
        {
            OriginPort = origin,
            DestinationPort = destination,
            Vessel = vessel,
            DayOfDeparture = "Daily",
            EstimatedTimeOfDeparture = new TimeSpan(9, 0, 0)
        };

        context.Ports.AddRange(origin, destination);
        context.ShippingLines.Add(shippingLine);
        context.Vessels.Add(vessel);
        context.VesselVisits.Add(vesselVisit);
        await context.SaveChangesAsync();

        var date = DateTime.UtcNow.Date.AddDays(2);
        await service.CreateBookingAsync(7, new BookingCreateRequestDto
        {
            OriginPortId = origin.PortId,
            DestinationPortId = destination.PortId,
            ShippingLineId = shippingLine.ShippingLineId,
            VesselVisitId = vesselVisit.VesselVisitId,
            DepartureAt = date.AddHours(22),
            PassengerCount = 1
        });

        Assert.Equal(date.AddHours(9), (await context.Bookings.SingleAsync()).DepartureAt);
    }

    [Fact]
    public async Task CreateBookingAsync_RejectsDateNotSupportedByVesselVisitSchedule()
    {
        await using var context = CreateContext();
        var paymentService = new FakePaymentService();
        var service = new BookingService(context, paymentService);
        var origin = new Port { Name = "Manila" };
        var destination = new Port { Name = "Cebu" };
        var shippingLine = new ShippingLine { Name = "Globalport" };
        var vessel = new Vessel { Name = "MV Demo", ShippingLine = shippingLine };
        var vesselVisit = new VesselVisit
        {
            OriginPort = origin,
            DestinationPort = destination,
            Vessel = vessel,
            DayOfDeparture = "Friday",
            EstimatedTimeOfDeparture = new TimeSpan(9, 0, 0)
        };

        context.Ports.AddRange(origin, destination);
        context.ShippingLines.Add(shippingLine);
        context.Vessels.Add(vessel);
        context.VesselVisits.Add(vesselVisit);
        await context.SaveChangesAsync();

        var unsupportedDate = new DateTime(2026, 9, 14);
        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateBookingAsync(7, new BookingCreateRequestDto
        {
            OriginPortId = origin.PortId,
            DestinationPortId = destination.PortId,
            ShippingLineId = shippingLine.ShippingLineId,
            VesselVisitId = vesselVisit.VesselVisitId,
            DepartureAt = unsupportedDate.AddHours(9),
            PassengerCount = 1
        }));

        Assert.Empty(context.Bookings);
    }

    [Fact]
    public async Task CreateBookingAsync_RejectsInvalidVesselVisit()
    {
        await using var context = CreateContext();
        var service = new BookingService(context, new FakePaymentService());

        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateBookingAsync(7, new BookingCreateRequestDto
        {
            OriginPortId = 1,
            DestinationPortId = 2,
            ShippingLineId = 3,
            VesselVisitId = 999,
            DepartureAt = DateTime.UtcNow.Date.AddDays(1).AddHours(9),
            PassengerCount = 1
        }));
    }

    [Fact]
    public async Task CreateBookingAsync_RejectsRouteVesselVisitMismatch()
    {
        await using var context = CreateContext();
        var service = new BookingService(context, new FakePaymentService());
        var visitOrigin = new Port { Name = "Manila" };
        var visitDestination = new Port { Name = "Cebu" };
        var requestedOrigin = new Port { Name = "Davao" };
        var shippingLine = new ShippingLine { Name = "Globalport" };
        var vessel = new Vessel { Name = "MV Demo", ShippingLine = shippingLine };
        var vesselVisit = new VesselVisit
        {
            OriginPort = visitOrigin,
            DestinationPort = visitDestination,
            Vessel = vessel,
            DayOfDeparture = "Daily",
            EstimatedTimeOfDeparture = new TimeSpan(9, 0, 0)
        };

        context.Ports.AddRange(visitOrigin, visitDestination, requestedOrigin);
        context.ShippingLines.Add(shippingLine);
        context.Vessels.Add(vessel);
        context.VesselVisits.Add(vesselVisit);
        await context.SaveChangesAsync();

        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateBookingAsync(7, new BookingCreateRequestDto
        {
            OriginPortId = requestedOrigin.PortId,
            DestinationPortId = visitDestination.PortId,
            ShippingLineId = shippingLine.ShippingLineId,
            VesselVisitId = vesselVisit.VesselVisitId,
            DepartureAt = DateTime.UtcNow.Date.AddDays(1).AddHours(9),
            PassengerCount = 1
        }));
    }

    [Fact]
    public async Task CreateGuestBookingAsync_CreatesBookingWithoutUserAndReturnsOnlyPlaintextToken()
    {
        await using var context = CreateContext();
        var paymentService = new FakePaymentService();
        var service = new BookingService(context, paymentService);
        var origin = new Port { Name = "Manila" };
        var destination = new Port { Name = "Cebu" };
        var shippingLine = new ShippingLine { Name = "Globalport" };
        var vessel = new Vessel { Name = "MV Guest", ShippingLine = shippingLine };
        var vesselVisit = new VesselVisit
        {
            OriginPort = origin,
            DestinationPort = destination,
            Vessel = vessel,
            DayOfDeparture = "Daily",
            EstimatedTimeOfDeparture = new TimeSpan(9, 0, 0)
        };

        context.Ports.AddRange(origin, destination);
        context.ShippingLines.Add(shippingLine);
        context.Vessels.Add(vessel);
        context.VesselVisits.Add(vesselVisit);
        await context.SaveChangesAsync();

        var result = await service.CreateGuestBookingAsync(new BookingCreateRequestDto
        {
            OriginPortId = origin.PortId,
            DestinationPortId = destination.PortId,
            ShippingLineId = shippingLine.ShippingLineId,
            VesselVisitId = vesselVisit.VesselVisitId,
            DepartureAt = DateTime.UtcNow.AddDays(2),
            PassengerCount = 1
        });

        var booking = await context.Bookings.SingleAsync();
        Assert.Null(booking.UserId);
        Assert.False(string.IsNullOrWhiteSpace(result.GuestAccessToken));
        Assert.Equal(GuestAccessTokenService.Hash(result.GuestAccessToken!), booking.GuestAccessTokenHash);
        Assert.NotEqual(result.GuestAccessToken, booking.GuestAccessTokenHash);
    }

    [Fact]
    public async Task CreateGuestBookingAsync_DerivesTokenExpirationFromTrustedVesselVisitTime()
    {
        await using var context = CreateContext();
        var service = new BookingService(context, new FakePaymentService());
        var origin = new Port { Name = "Manila" };
        var destination = new Port { Name = "Cebu" };
        var shippingLine = new ShippingLine { Name = "Globalport" };
        var vessel = new Vessel { Name = "MV Guest Expiration", ShippingLine = shippingLine };
        var vesselVisit = new VesselVisit
        {
            OriginPort = origin,
            DestinationPort = destination,
            Vessel = vessel,
            DayOfDeparture = "Daily",
            EstimatedTimeOfDeparture = new TimeSpan(9, 0, 0)
        };

        context.Ports.AddRange(origin, destination);
        context.ShippingLines.Add(shippingLine);
        context.Vessels.Add(vessel);
        context.VesselVisits.Add(vesselVisit);
        await context.SaveChangesAsync();

        var departureDate = DateTime.UtcNow.Date.AddDays(2);
        await service.CreateGuestBookingAsync(new BookingCreateRequestDto
        {
            OriginPortId = origin.PortId,
            DestinationPortId = destination.PortId,
            ShippingLineId = shippingLine.ShippingLineId,
            VesselVisitId = vesselVisit.VesselVisitId,
            DepartureAt = departureDate.AddHours(23),
            PassengerCount = 1
        });

        var booking = await context.Bookings.SingleAsync();
        var trustedDepartureAt = departureDate.AddHours(9);
        Assert.Equal(trustedDepartureAt, booking.DepartureAt);
        Assert.Equal(trustedDepartureAt.AddHours(24), booking.GuestAccessTokenExpiresAt);
    }

    [Fact]
    public async Task GetBookingsForUserAsync_ExcludesGuestBookings()
    {
        await using var context = CreateContext();
        context.Bookings.AddRange(
            new Booking { UserId = 7, BookingReference = "B-USER", Status = "Confirmed", PassengerCount = 1 },
            new Booking { UserId = null, BookingReference = "B-GUEST", Status = "Confirmed", PassengerCount = 1 });
        await context.SaveChangesAsync();

        var result = await new BookingService(context, new FakePaymentService()).GetBookingsForUserAsync(7);

        Assert.Single(result);
        Assert.Equal("B-USER", result[0].BookingReference);
    }

    private static MyGPASSDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<MyGPASSDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new MyGPASSDbContext(options);
    }

    private sealed class FakePaymentService : IPaymentService
    {
        public long BookingId { get; private set; }

        public Task<IReadOnlyList<PaymentResponseDto>> GetPaymentsAsync()
            => Task.FromResult<IReadOnlyList<PaymentResponseDto>>([]);

        public Task<PaymentResponseDto> CreatePaymentAsync(long bookingId, decimal amount, string merchantTransId)
        {
            BookingId = bookingId;
            return Task.FromResult(new PaymentResponseDto
            {
                PaymentId = 123,
                BookingId = bookingId,
                Amount = amount,
                MerchantTransId = merchantTransId,
                Currency = "PHP",
                PaymentStatus = "INIT",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }

        public Task<PaymentResponseDto> ConfirmPaymentAsync(long paymentId)
            => throw new NotImplementedException();

        public Task<PaymentResponseDto> ConfirmPaymentForUserAsync(long userId, long paymentId)
            => throw new NotImplementedException();

        public Task<PaymentResponseDto> ConfirmPaymentForGuestAsync(long paymentId, string guestAccessToken)
            => throw new NotImplementedException();
    }
}