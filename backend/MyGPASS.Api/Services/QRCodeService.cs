using MyGPASS.Api.Data;
using MyGPASS.Api.DTOs.QRCodes;
using MyGPASS.Api.Models;
using MyGPASS.Api.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;

namespace MyGPASS.Api.Services;

public class QRCodeService : IQRCodeService
{
    private readonly MyGPASSDbContext _dbContext;

    public QRCodeService(MyGPASSDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<QRCodeResponseDto>> GetQRCodesAsync()
    {
        return await _dbContext.QRCodes
            .AsNoTracking()
            .OrderBy(qr => qr.BookingId)
            .ThenBy(qr => qr.PassengerNumber)
            .Select(qr => new QRCodeResponseDto
            {
                QRCodeId = qr.QRCodeId,
                BookingId = qr.BookingId,
                PassengerNumber = qr.PassengerNumber,
                QRCodeValue = qr.QRCodeValue,
                Status = qr.Status,
                CreatedAt = qr.CreatedAt,
                ExpiresAt = qr.ExpiresAt
            })
            .ToListAsync();
    }

    public async Task<IReadOnlyList<QRCodeResponseDto>> EnsureQRCodesAsync(long bookingId)
    {
        var booking = await _dbContext.Bookings
            .Include(candidate => candidate.QRCodes)
            .FirstOrDefaultAsync(candidate => candidate.BookingId == bookingId);

        if (booking == null)
        {
            throw new ArgumentException("Booking was not found.");
        }

        var expiration = booking.DepartureAt?.AddHours(24);
        var existingQRCodes = booking.QRCodes.ToDictionary(qrCode => qrCode.PassengerNumber);

        for (var passengerNumber = 1; passengerNumber <= booking.PassengerCount; passengerNumber++)
        {
            if (existingQRCodes.TryGetValue(passengerNumber, out var existingQRCode))
            {
                existingQRCode.ExpiresAt = expiration;
                continue;
            }

            _dbContext.QRCodes.Add(new QRCode
            {
                BookingId = bookingId,
                PassengerNumber = passengerNumber,
                QRCodeValue = $"GTI1:{Convert.ToHexString(RandomNumberGenerator.GetBytes(32))}",
                Status = "Active",
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = expiration
            });
        }

        if (_dbContext.ChangeTracker.HasChanges())
        {
            try
            {
                await _dbContext.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                if (_dbContext.Database.CurrentTransaction != null)
                {
                    throw;
                }

                _dbContext.ChangeTracker.Clear();
                var recoveredQRCodes = await GetQRCodesForBookingAsync(bookingId);
                if (recoveredQRCodes.Count < booking.PassengerCount)
                {
                    throw;
                }

                return recoveredQRCodes;
            }
        }

        return await GetQRCodesForBookingAsync(bookingId);
    }

    private static QRCodeResponseDto MapQRCode(QRCode qrCode)
    {
        return new QRCodeResponseDto
        {
            QRCodeId = qrCode.QRCodeId,
            BookingId = qrCode.BookingId,
            PassengerNumber = qrCode.PassengerNumber,
            QRCodeValue = qrCode.QRCodeValue,
            Status = qrCode.Status,
            CreatedAt = qrCode.CreatedAt,
            ExpiresAt = qrCode.ExpiresAt
        };
    }

    public async Task<IReadOnlyList<QRCodeResponseDto>> GetQRCodesForUserAsync(long userId, long bookingId)
    {
        var qrCodes = await _dbContext.QRCodes
            .AsNoTracking()
            .Include(qr => qr.Booking)
            .Where(qr =>
                qr.BookingId == bookingId &&
                qr.Booking.UserId == userId)
            .OrderBy(qr => qr.PassengerNumber)
            .ToListAsync();

        if (qrCodes.Count == 0)
        {
            throw new ArgumentException("QR code was not found.");
        }

        return qrCodes.Select(MapQRCode).ToList();
    }

    public async Task<IReadOnlyList<QRCodeResponseDto>> GetQRCodesForGuestAsync(long bookingId, string guestAccessToken)
    {
        var booking = await _dbContext.Bookings
            .Include(candidate => candidate.QRCodes)
            .FirstOrDefaultAsync(candidate => candidate.BookingId == bookingId);

        if (booking == null || booking.UserId != null ||
            !GuestAccessTokenService.Matches(guestAccessToken, booking.GuestAccessTokenHash) ||
            booking.GuestAccessTokenRevokedAt != null ||
            (booking.GuestAccessTokenExpiresAt.HasValue && booking.GuestAccessTokenExpiresAt <= DateTime.UtcNow))
        {
            throw new ArgumentException("Guest QR code was not found.");
        }

        return booking.QRCodes
            .OrderBy(qrCode => qrCode.PassengerNumber)
            .Select(MapQRCode)
            .ToList();
    }

    private async Task<IReadOnlyList<QRCodeResponseDto>> GetQRCodesForBookingAsync(long bookingId)
    {
        return await _dbContext.QRCodes
            .AsNoTracking()
            .Where(qr => qr.BookingId == bookingId)
            .OrderBy(qr => qr.PassengerNumber)
            .Select(qr => new QRCodeResponseDto
            {
                QRCodeId = qr.QRCodeId,
                BookingId = qr.BookingId,
                PassengerNumber = qr.PassengerNumber,
                QRCodeValue = qr.QRCodeValue,
                Status = qr.Status,
                CreatedAt = qr.CreatedAt,
                ExpiresAt = qr.ExpiresAt
            })
            .ToListAsync();
    }
}