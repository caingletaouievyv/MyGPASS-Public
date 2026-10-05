using MyGPASS.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace MyGPASS.Api.Extensions;

public static class DbContextExtensions
{
    public static IServiceCollection AddDatabase(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("GPassDb");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Connection string 'GPassDb' is not configured. Set it with user secrets or environment variables.");
        }

        services.AddDbContext<MyGPASSDbContext>(options =>
            options.UseSqlServer(connectionString));

        return services;
    }
}
