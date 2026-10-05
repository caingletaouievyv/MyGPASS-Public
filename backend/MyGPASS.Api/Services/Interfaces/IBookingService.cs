using MyGPASS.Api.DTOs.Bookings;

namespace MyGPASS.Api.Services.Interfaces;

public interface IBookingService
{
    Task<IReadOnlyList<BookingResponseDto>> GetBookingsAsync();
    Task<IReadOnlyList<BookingResponseDto>> GetBookingsForUserAsync(long userId);
    Task<BookingResponseDto> CreateBookingAsync(long userId, BookingCreateRequestDto request);
    Task<BookingResponseDto> CreateGuestBookingAsync(BookingCreateRequestDto request);
}