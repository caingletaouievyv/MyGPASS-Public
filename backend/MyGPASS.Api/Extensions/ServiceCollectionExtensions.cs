using MyGPASS.Api.Services;
using MyGPASS.Api.Services.Interfaces;
using MyGPASS.Api.Models;
using Microsoft.AspNetCore.Identity;

namespace MyGPASS.Api.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddScoped<IApplicationSettingsService, ApplicationSettingsService>();
        services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IEmailService, EmailService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IBookingService, BookingService>();
        services.AddScoped<IPaymentService, PaymentService>();
        services.AddScoped<IQRCodeService, QRCodeService>();
        services.AddScoped<IScanLogService, ScanLogService>();

        services.AddScoped<IPortService, PortService>();
        services.AddScoped<IShippingLineService, ShippingLineService>();
        services.AddScoped<IVesselService, VesselService>();
        services.AddScoped<IVesselVisitService, VesselVisitService>();

        services.AddScoped<IDatabaseService, DatabaseService>();

        return services;
    }
}
