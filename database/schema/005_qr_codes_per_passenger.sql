/*
    Allows one QR code per passenger within a booking.

    Existing bookings currently have at most one QR. Existing QR records
    are assigned PassengerNumber = 1. Additional QRs for existing bookings
    will be created when the QR service next ensures the booking's QR set.
*/

IF COL_LENGTH('dbo.QRCodes', 'PassengerNumber') IS NULL
BEGIN
    ALTER TABLE dbo.QRCodes
        ADD PassengerNumber INT NULL;
END;
GO

UPDATE dbo.QRCodes
    SET PassengerNumber = 1
    WHERE PassengerNumber IS NULL;
GO

IF EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.QRCodes')
      AND name = 'PassengerNumber'
      AND is_nullable = 1
)
BEGIN
    ALTER TABLE dbo.QRCodes
        ALTER COLUMN PassengerNumber INT NOT NULL;
END;
GO

IF EXISTS (
    SELECT 1
    FROM sys.key_constraints
    WHERE name = 'UQ_QRCodes_BookingId'
      AND parent_object_id = OBJECT_ID('dbo.QRCodes')
)
BEGIN
    ALTER TABLE dbo.QRCodes
        DROP CONSTRAINT UQ_QRCodes_BookingId;
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UQ_QRCodes_BookingPassenger'
      AND object_id = OBJECT_ID('dbo.QRCodes')
)
BEGIN
    ALTER TABLE dbo.QRCodes
        ADD CONSTRAINT UQ_QRCodes_BookingPassenger
        UNIQUE (BookingId, PassengerNumber);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'CK_QRCodes_PassengerNumber'
      AND parent_object_id = OBJECT_ID('dbo.QRCodes')
)
BEGIN
    ALTER TABLE dbo.QRCodes
        ADD CONSTRAINT CK_QRCodes_PassengerNumber
        CHECK (PassengerNumber > 0);
END;
GO
