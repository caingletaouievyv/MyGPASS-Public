using MyGPASS.Api.Data;
using MyGPASS.Api.DTOs.Bookings;
using MyGPASS.Api.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MyGPASS.Api.Services;

public class BookingService : IBookingService
{
    private readonly MyGPASSDbContext _dbContext;
    private readonly IPaymentService _paymentService;

    public BookingService(MyGPASSDbContext dbContext, IPaymentService paymentService)
    {
        _dbContext = dbContext;
        _paymentService = paymentService;
    }

    public async Task<IReadOnlyList<BookingResponseDto>> GetBookingsAsync()
    {
        return await _dbContext.Bookings
            .AsNoTracking()
            .Include(booking => booking.OriginPort)
            .Include(booking => booking.DestinationPort)
            .Include(booking => booking.ShippingLine)
            .Include(booking => booking.VesselVisit)
                .ThenInclude(vesselVisit => vesselVisit!.Vessel)
            .Include(booking => booking.Payments)
            .OrderByDescending(booking => booking.CreatedAt)
            .Select(booking => MapBooking(booking))
            .ToListAsync();
    }

    public async Task<IReadOnlyList<BookingResponseDto>> GetBookingsForUserAsync(long userId)
    {
        return await _dbContext.Bookings
            .AsNoTracking()
            .Where(booking => booking.UserId == userId)
            .Include(booking => booking.OriginPort)
            .Include(booking => booking.DestinationPort)
            .Include(booking => booking.ShippingLine)
            .Include(booking => booking.VesselVisit)
                .ThenInclude(vesselVisit => vesselVisit!.Vessel)
            .Include(booking => booking.Payments)
            .OrderByDescending(booking => booking.CreatedAt)
            .Select(booking => MapBooking(booking))
            .ToListAsync();
    }

    private static BookingResponseDto MapBooking(MyGPASS.Api.Models.Booking booking)
    {
        var paymentStatus = booking.Payments
            .OrderByDescending(payment => payment.CreatedAt)
            .Select(payment => payment.PaymentStatus)
            .FirstOrDefault();
        var paymentId = booking.Payments
            .OrderByDescending(payment => payment.CreatedAt)
            .Select(payment => (long?)payment.PaymentId)
            .FirstOrDefault();

        return new BookingResponseDto
        {
            BookingId = booking.BookingId,
            PaymentId = paymentId,
            UserId = booking.UserId,
            BookingReference = booking.BookingReference,
            OriginPortId = booking.OriginPortId,
            DestinationPortId = booking.DestinationPortId,
            ShippingLineId = booking.ShippingLineId,
            VesselVisitId = booking.VesselVisitId,
            DepartureAt = booking.DepartureAt,
            OriginPortName = booking.OriginPort != null ? booking.OriginPort.Name : null,
            DestinationPortName = booking.DestinationPort != null ? booking.DestinationPort.Name : null,
            ShippingLineName = booking.ShippingLine != null ? booking.ShippingLine.Name : null,
            VesselName = booking.VesselVisit != null && booking.VesselVisit.Vessel != null ? booking.VesselVisit.Vessel.Name : null,
            DepartureDay = booking.VesselVisit != null ? booking.VesselVisit.DayOfDeparture : null,
            DepartureTime = booking.VesselVisit != null ? booking.VesselVisit.EstimatedTimeOfDeparture : null,
            PassengerCount = booking.PassengerCount,
            TotalAmount = booking.TotalAmount,
            Status = booking.Status,
            PaymentStatus = paymentStatus,
            CreatedAt = booking.CreatedAt,
            UpdatedAt = booking.UpdatedAt,
            ExpiresAt = booking.ExpiresAt
        };
    }

    public async Task<BookingResponseDto> CreateBookingAsync(
        long userId,
        BookingCreateRequestDto request)
    {
        return await CreateBookingAsync(userId, request, null);
    }

    public async Task<BookingResponseDto> CreateGuestBookingAsync(BookingCreateRequestDto request)
    {
        var guestAccessToken = GuestAccessTokenService.Generate();
        var response = await CreateBookingAsync(null, request, guestAccessToken);
        response.GuestAccessToken = guestAccessToken;
        return response;
    }

    private async Task<BookingResponseDto> CreateBookingAsync(
        long? userId,
        BookingCreateRequestDto request,
        string? guestAccessToken)
    {
        if (request.OriginPortId == request.DestinationPortId)
        {
            throw new ArgumentException("Origin and destination ports must be different.");
        }

        if (request.PassengerCount < 1 || request.PassengerCount > 10)
        {
            throw new ArgumentException("Passenger count must be between 1 and 10.");
        }

        var vesselVisit = await _dbContext.VesselVisits
            .Include(visit => visit.Vessel)
            .FirstOrDefaultAsync(visit =>
                visit.VesselVisitId == request.VesselVisitId &&
                visit.OriginPortId == request.OriginPortId &&
                visit.DestinationPortId == request.DestinationPortId &&
                visit.Vessel.ShippingLineId == request.ShippingLineId);

        if (vesselVisit == null)
        {
            throw new ArgumentException("Selected vessel visit does not match the booking route and shipping line.");
        }

        if (!ScheduleMatchesDate(vesselVisit.DayOfDeparture, request.DepartureAt.Date))
        {
            throw new ArgumentException("Selected departure date is not supported by the vessel visit schedule.");
        }

        var departureAt = request.DepartureAt.Date.Add(vesselVisit.EstimatedTimeOfDeparture);

        const decimal terminalFee = 30m;
        const decimal gcashFee = 1m;

        var totalAmount = (terminalFee * request.PassengerCount) + gcashFee;

        var now = DateTime.UtcNow;

        var booking = new MyGPASS.Api.Models.Booking
        {
            UserId = userId,
            GuestAccessTokenHash = guestAccessToken == null ? null : GuestAccessTokenService.Hash(guestAccessToken),
            GuestAccessTokenExpiresAt = guestAccessToken == null ? null : departureAt.AddHours(24),
            BookingReference = $"B-{Guid.NewGuid():N}",
            OriginPortId = request.OriginPortId,
            DestinationPortId = request.DestinationPortId,
            ShippingLineId = request.ShippingLineId,
            VesselVisitId = request.VesselVisitId,
            DepartureAt = departureAt,
            PassengerCount = request.PassengerCount,
            TotalAmount = totalAmount,
            Status = "Pending",
            CreatedAt = now,
            UpdatedAt = now,
            ExpiresAt = departureAt.AddHours(24)
        };

        _dbContext.Bookings.Add(booking);
        await _dbContext.SaveChangesAsync();

        var merchantTransId = $"GTI-{Guid.NewGuid():N}";

        var payment = await _paymentService.CreatePaymentAsync(booking.BookingId, totalAmount, merchantTransId);

        var response = MapBooking(booking);
        response.PaymentId = payment.PaymentId;
        return response;
    }

    private static bool ScheduleMatchesDate(string? dayOfDeparture, DateTime departureDate)
    {
        var normalizedDay = dayOfDeparture?.Trim();
        return string.Equals(normalizedDay, "Daily", StringComparison.OrdinalIgnoreCase)
            || (Enum.TryParse<DayOfWeek>(normalizedDay, true, out var scheduledDay)
                && scheduledDay == departureDate.DayOfWeek);
    }
}
