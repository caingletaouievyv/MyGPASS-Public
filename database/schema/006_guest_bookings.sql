ALTER TABLE dbo.Bookings
    ALTER COLUMN UserId BIGINT NULL;
GO

IF COL_LENGTH('dbo.Bookings', 'GuestAccessTokenHash') IS NULL
BEGIN
    ALTER TABLE dbo.Bookings
        ADD GuestAccessTokenHash NVARCHAR(128) NULL;
END;
GO

IF COL_LENGTH('dbo.Bookings', 'GuestAccessTokenExpiresAt') IS NULL
BEGIN
    ALTER TABLE dbo.Bookings
        ADD GuestAccessTokenExpiresAt DATETIME2(0) NULL;
END;
GO

IF COL_LENGTH('dbo.Bookings', 'GuestAccessTokenRevokedAt') IS NULL
BEGIN
    ALTER TABLE dbo.Bookings
        ADD GuestAccessTokenRevokedAt DATETIME2(0) NULL;
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_Bookings_GuestAccessTokenHash'
      AND object_id = OBJECT_ID('dbo.Bookings')
)
BEGIN
    CREATE INDEX IX_Bookings_GuestAccessTokenHash
        ON dbo.Bookings(GuestAccessTokenHash)
        WHERE GuestAccessTokenHash IS NOT NULL;
END;
GO