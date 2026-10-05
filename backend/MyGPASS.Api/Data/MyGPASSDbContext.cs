using MyGPASS.Api.Models;
using MyGPASS.Api.Models.Schedule;
using Microsoft.EntityFrameworkCore;

namespace MyGPASS.Api.Data;

public class MyGPASSDbContext : DbContext
{
    public MyGPASSDbContext(DbContextOptions<MyGPASSDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();

    public DbSet<Booking> Bookings => Set<Booking>();

    public DbSet<Payment> Payments => Set<Payment>();

    public DbSet<QRCode> QRCodes => Set<QRCode>();

    public DbSet<ScanLog> ScanLogs => Set<ScanLog>();

    public DbSet<TransactionLog> TransactionLogs => Set<TransactionLog>();

    public DbSet<Port> Ports => Set<Port>();

    public DbSet<ShippingLine> ShippingLines => Set<ShippingLine>();

    public DbSet<Vessel> Vessels => Set<Vessel>();

    public DbSet<VesselVisit> VesselVisits => Set<VesselVisit>();

    public DbSet<EmailVerificationToken> EmailVerificationTokens => Set<EmailVerificationToken>();

    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();

    public DbSet<ApplicationSetting> ApplicationSettings => Set<ApplicationSetting>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("Users");

            entity.HasKey(x => x.UserId);

            entity.Property(x => x.MobileNumber)
                .HasMaxLength(20)
                .IsRequired();

            entity.Property(x => x.Email)
                .HasMaxLength(255);

            entity.Property(x => x.PasswordHash)
                .HasMaxLength(255)
                .IsRequired();

            entity.HasIndex(x => x.MobileNumber)
                .IsUnique();

            entity.Property(x => x.CreatedAt)
                .HasDefaultValueSql("SYSUTCDATETIME()");

            entity.Property(x => x.UpdatedAt)
                .HasDefaultValueSql("SYSUTCDATETIME()");

            entity.Property(x => x.IsActive)
                .HasDefaultValue(true);

            entity.Property(x => x.IsEmailVerified)
                .HasDefaultValue(false);

            entity.Property(x => x.Role)
                .HasMaxLength(30)
                .IsRequired();
        });

        modelBuilder.Entity<Booking>(entity =>
        {
            entity.ToTable("Bookings");

            entity.HasKey(x => x.BookingId);

            entity.Property(x => x.BookingReference)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(x => x.GuestAccessTokenHash)
                .HasMaxLength(128);

            entity.Property(x => x.UserId)
                .IsConcurrencyToken();

            entity.Property(x => x.GuestAccessTokenRevokedAt)
                .IsConcurrencyToken();

            entity.HasIndex(x => x.BookingReference)
                .IsUnique();

            entity.Property(x => x.TotalAmount)
                .HasPrecision(18, 2);

            entity.Property(x => x.Status)
                .HasMaxLength(30)
                .IsRequired()
                .IsConcurrencyToken();

            entity.HasOne(x => x.User)
                .WithMany(x => x.Bookings)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.OriginPort)
                .WithMany()
                .HasForeignKey(x => x.OriginPortId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.DestinationPort)
                .WithMany()
                .HasForeignKey(x => x.DestinationPortId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.ShippingLine)
                .WithMany()
                .HasForeignKey(x => x.ShippingLineId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.VesselVisit)
                .WithMany(x => x.Bookings)
                .HasForeignKey(x => x.VesselVisitId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Payment>(entity =>
        {
            entity.ToTable("Payments");

            entity.HasKey(x => x.PaymentId);

            entity.Property(x => x.MerchantTransId)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(x => x.AcquirementId)
                .HasMaxLength(100);

            entity.Property(x => x.TransactionId)
                .HasMaxLength(100);

            entity.Property(x => x.Amount)
                .HasPrecision(18, 2);

            entity.Property(x => x.Currency)
                .HasMaxLength(3)
                .IsFixedLength()
                .HasDefaultValue("PHP");

            entity.Property(x => x.PaymentStatus)
                .HasMaxLength(30)
                .IsRequired()
                .IsConcurrencyToken();

            entity.Property(x => x.CheckoutUrl)
                .HasMaxLength(1000);

            entity.HasIndex(x => x.MerchantTransId)
                .IsUnique();

            entity.HasOne(x => x.Booking)
                .WithMany(x => x.Payments)
                .HasForeignKey(x => x.BookingId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<QRCode>(entity =>
        {
            entity.ToTable("QRCodes");

            entity.HasKey(x => x.QRCodeId);

            entity.Property(x => x.QRCodeValue)
                .HasMaxLength(500)
                .IsRequired();

            entity.Property(x => x.Status)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(x => x.ExpiresAt)
                .HasColumnType("datetime2(0)");

            entity.HasIndex(x => x.QRCodeValue)
                .IsUnique();

            entity.HasIndex(x => new { x.BookingId, x.PassengerNumber })
                .IsUnique();

            entity.HasOne(x => x.Booking)
                .WithMany(nameof(Booking.QRCodes))
                .HasForeignKey(nameof(QRCode.BookingId))
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ScanLog>(entity =>
        {
            entity.ToTable("ScanLogs");

            entity.HasKey(x => x.ScanLogId);

            entity.Property(x => x.ScanType)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(x => x.ScanResult)
                .HasMaxLength(30)
                .IsRequired();

            entity.HasOne(x => x.QRCode)
                .WithMany(x => x.ScanLogs)
                .HasForeignKey(x => x.QRCodeId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<TransactionLog>(entity =>
        {
            entity.ToTable("TransactionLogs");

            entity.HasKey(x => x.TransactionLogId);

            entity.Property(x => x.EventType)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(x => x.EntityType)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(x => x.Status)
                .HasMaxLength(50);
        });

        modelBuilder.Entity<Port>(entity =>
        {
            entity.ToTable("Ports");

            entity.HasKey(x => x.PortId);

            entity.Property(x => x.Name)
                .HasMaxLength(150)
                .IsRequired();

            entity.HasIndex(x => x.Name)
                .IsUnique();
        });

        modelBuilder.Entity<ShippingLine>(entity =>
        {
            entity.ToTable("ShippingLines");

            entity.HasKey(x => x.ShippingLineId);

            entity.Property(x => x.Name)
                .HasMaxLength(200)
                .IsRequired();

            entity.HasIndex(x => x.Name)
                .IsUnique();
        });

        modelBuilder.Entity<Vessel>(entity =>
        {
            entity.ToTable("Vessels");

            entity.HasKey(x => x.VesselId);

            entity.Property(x => x.Name)
                .HasMaxLength(200)
                .IsRequired();

            entity.HasOne(x => x.ShippingLine)
                .WithMany(x => x.Vessels)
                .HasForeignKey(x => x.ShippingLineId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<VesselVisit>(entity =>
        {
            entity.ToTable("VesselVisits");

            entity.HasKey(x => x.VesselVisitId);

            entity.Property(x => x.DayOfDeparture)
                .HasMaxLength(30);

            entity.Property(x => x.EstimatedTimeOfDeparture)
                .HasColumnType("time")
                .IsRequired();

            entity.HasOne(x => x.OriginPort)
                .WithMany(x => x.OriginVesselVisits)
                .HasForeignKey(x => x.OriginPortId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.DestinationPort)
                .WithMany(x => x.DestinationVesselVisits)
                .HasForeignKey(x => x.DestinationPortId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.Vessel)
                .WithMany(x => x.VesselVisits)
                .HasForeignKey(x => x.VesselId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<EmailVerificationToken>(entity =>
        {
            entity.ToTable("EmailVerificationTokens");

            entity.HasKey(x => x.EmailVerificationTokenId);

            entity.Property(x => x.TokenHash)
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(x => x.ExpiresAt)
                .IsRequired();

            entity.Property(x => x.CreatedAt)
                .HasDefaultValueSql("SYSUTCDATETIME()");

            entity.Property(x => x.VerifiedAt)
                .IsConcurrencyToken();

            entity.HasIndex(x => x.UserId);

            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PasswordResetToken>(entity =>
        {
            entity.ToTable("PasswordResetTokens");

            entity.HasKey(x => x.PasswordResetTokenId);

            entity.Property(x => x.TokenHash)
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(x => x.ExpiresAt)
                .IsRequired();

            entity.Property(x => x.CreatedAt)
                .HasDefaultValueSql("SYSUTCDATETIME()");

            entity.Property(x => x.UsedAt)
                .IsConcurrencyToken();

            entity.HasIndex(x => x.UserId);

            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ApplicationSetting>(entity =>
        {
            entity.ToTable("ApplicationSettings");

            entity.HasKey(x => x.SettingKey);

            entity.Property(x => x.SettingKey)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(x => x.SettingValue)
                .HasMaxLength(2000);

            entity.Property(x => x.UpdatedAt)
                .HasDefaultValueSql("SYSUTCDATETIME()");
        });
    }
}