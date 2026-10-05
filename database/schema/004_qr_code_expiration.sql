/*
    Stores QR/pass expiration based on the selected booking departure.

    Existing QR records cannot be backfilled reliably because older bookings
    did not retain the selected calendar departure date. Their ExpiresAt
    values will remain NULL.
*/

IF COL_LENGTH('dbo.QRCodes', 'ExpiresAt') IS NULL
BEGIN
    ALTER TABLE dbo.QRCodes
        ADD ExpiresAt DATETIME2(0) NULL;
END;
