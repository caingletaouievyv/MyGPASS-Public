SET NOCOUNT ON;

DECLARE @OriginPortId BIGINT;
DECLARE @DestinationPortId BIGINT;
DECLARE @ShippingLineId BIGINT;
DECLARE @VesselId BIGINT;

IF NOT EXISTS (SELECT 1 FROM dbo.Ports WHERE Name = N'Demo Port A')
    INSERT INTO dbo.Ports (Name) VALUES (N'Demo Port A');

IF NOT EXISTS (SELECT 1 FROM dbo.Ports WHERE Name = N'Demo Port B')
    INSERT INTO dbo.Ports (Name) VALUES (N'Demo Port B');

IF NOT EXISTS (SELECT 1 FROM dbo.ShippingLines WHERE Name = N'Example Shipping Line')
    INSERT INTO dbo.ShippingLines (Name) VALUES (N'Example Shipping Line');

SELECT @OriginPortId = PortId FROM dbo.Ports WHERE Name = N'Demo Port A';
SELECT @DestinationPortId = PortId FROM dbo.Ports WHERE Name = N'Demo Port B';
SELECT @ShippingLineId = ShippingLineId
FROM dbo.ShippingLines
WHERE Name = N'Example Shipping Line';

IF NOT EXISTS
(
    SELECT 1
    FROM dbo.Vessels
    WHERE ShippingLineId = @ShippingLineId
      AND Name = N'Demo Vessel'
)
    INSERT INTO dbo.Vessels (ShippingLineId, Name)
    VALUES (@ShippingLineId, N'Demo Vessel');

SELECT @VesselId = VesselId
FROM dbo.Vessels
WHERE ShippingLineId = @ShippingLineId
  AND Name = N'Demo Vessel';

IF NOT EXISTS
(
    SELECT 1
    FROM dbo.VesselVisits
    WHERE OriginPortId = @OriginPortId
      AND DestinationPortId = @DestinationPortId
      AND VesselId = @VesselId
      AND DayOfDeparture = N'Daily'
      AND EstimatedTimeOfDeparture = '12:00'
)
    INSERT INTO dbo.VesselVisits
    (
        OriginPortId,
        DestinationPortId,
        VesselId,
        DayOfDeparture,
        EstimatedTimeOfDeparture
    )
    VALUES
    (
        @OriginPortId,
        @DestinationPortId,
        @VesselId,
        N'Daily',
        '12:00'
    );