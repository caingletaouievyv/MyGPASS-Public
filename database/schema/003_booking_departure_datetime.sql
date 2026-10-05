/*
    Adds the actual selected departure date/time to bookings.

    Existing bookings cannot be backfilled because their selected calendar
    dates were never stored. Their DepartureAt values will remain NULL.
*/

IF COL_LENGTH('dbo.Bookings', 'DepartureAt') IS NULL
BEGIN
    ALTER TABLE dbo.Bookings
        ADD DepartureAt DATETIME2(0) NULL;
END;
