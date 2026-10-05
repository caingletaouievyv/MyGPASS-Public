/*
    Application Initial Database Schema

    Tables:
        Users
        Ports
        ShippingLines
        Vessels
        VesselVisits
        Bookings
        Payments
        QRCodes
        ScanLogs
        TransactionLogs

    Schedule relationship:
        ShippingLines -> Vessels -> VesselVisits

    VesselVisit contains:
        OriginPort
        DestinationPort
        Vessel
        DayOfDeparture
        EstimatedTimeOfDeparture

    Booking relationship:
        Bookings -> Users
        Bookings -> VesselVisits

    A separate Passengers table is not part of the working schema.
*/


-- ============================================================
-- Users
-- ============================================================

CREATE TABLE dbo.Users
(
    UserId BIGINT IDENTITY(1,1) NOT NULL,
    FirstName NVARCHAR(100) NOT NULL,
    LastName NVARCHAR(100) NOT NULL,
    MobileNumber NVARCHAR(20) NOT NULL,
    Email NVARCHAR(255) NULL,
    PasswordHash NVARCHAR(255) NOT NULL,

    CreatedAt DATETIME2(0) NOT NULL
        CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME(),

    UpdatedAt DATETIME2(0) NOT NULL
        CONSTRAINT DF_Users_UpdatedAt DEFAULT SYSUTCDATETIME(),

    IsActive BIT NOT NULL
        CONSTRAINT DF_Users_IsActive DEFAULT 1,

    IsEmailVerified BIT NOT NULL
        CONSTRAINT DF_Users_IsEmailVerified DEFAULT 0,

    CONSTRAINT PK_Users
        PRIMARY KEY (UserId),

    CONSTRAINT UQ_Users_MobileNumber
        UNIQUE (MobileNumber)
);


-- ============================================================
-- Ports
-- ============================================================

CREATE TABLE dbo.Ports
(
    PortId BIGINT IDENTITY(1,1) NOT NULL,
    Name NVARCHAR(150) NOT NULL,

    CONSTRAINT PK_Ports
        PRIMARY KEY (PortId),

    CONSTRAINT UQ_Ports_Name
        UNIQUE (Name)
);


-- ============================================================
-- Shipping Lines
-- ============================================================

CREATE TABLE dbo.ShippingLines
(
    ShippingLineId BIGINT IDENTITY(1,1) NOT NULL,
    Name NVARCHAR(200) NOT NULL,

    CONSTRAINT PK_ShippingLines
        PRIMARY KEY (ShippingLineId),

    CONSTRAINT UQ_ShippingLines_Name
        UNIQUE (Name)
);


-- ============================================================
-- Vessels
-- ============================================================

CREATE TABLE dbo.Vessels
(
    VesselId BIGINT IDENTITY(1,1) NOT NULL,
    ShippingLineId BIGINT NOT NULL,
    Name NVARCHAR(200) NOT NULL,

    CONSTRAINT PK_Vessels
        PRIMARY KEY (VesselId),

    CONSTRAINT FK_Vessels_ShippingLines
        FOREIGN KEY (ShippingLineId)
        REFERENCES dbo.ShippingLines(ShippingLineId)
);


-- ============================================================
-- Vessel Visits / Schedules
-- ============================================================

CREATE TABLE dbo.VesselVisits
(
    VesselVisitId BIGINT IDENTITY(1,1) NOT NULL,

    OriginPortId BIGINT NOT NULL,
    DestinationPortId BIGINT NOT NULL,
    VesselId BIGINT NOT NULL,

    DayOfDeparture NVARCHAR(30) NULL,
    EstimatedTimeOfDeparture TIME(0) NOT NULL,

    CONSTRAINT PK_VesselVisits
        PRIMARY KEY (VesselVisitId),

    CONSTRAINT FK_VesselVisits_OriginPort
        FOREIGN KEY (OriginPortId)
        REFERENCES dbo.Ports(PortId),

    CONSTRAINT FK_VesselVisits_DestinationPort
        FOREIGN KEY (DestinationPortId)
        REFERENCES dbo.Ports(PortId),

    CONSTRAINT FK_VesselVisits_Vessel
        FOREIGN KEY (VesselId)
        REFERENCES dbo.Vessels(VesselId)
);


-- ============================================================
-- Bookings
-- ============================================================

CREATE TABLE dbo.Bookings
(
    BookingId BIGINT IDENTITY(1,1) NOT NULL,
    UserId BIGINT NOT NULL,

    BookingReference NVARCHAR(50) NOT NULL,

    OriginPortId BIGINT NULL,
    DestinationPortId BIGINT NULL,
    ShippingLineId BIGINT NULL,
    VesselVisitId BIGINT NULL,

    PassengerCount INT NOT NULL,
    TotalAmount DECIMAL(18,2) NOT NULL,

    Status NVARCHAR(30) NOT NULL,

    CreatedAt DATETIME2(0) NOT NULL
        CONSTRAINT DF_Bookings_CreatedAt DEFAULT SYSUTCDATETIME(),

    UpdatedAt DATETIME2(0) NOT NULL
        CONSTRAINT DF_Bookings_UpdatedAt DEFAULT SYSUTCDATETIME(),

    ExpiresAt DATETIME2(0) NULL,

    CONSTRAINT PK_Bookings
        PRIMARY KEY (BookingId),

    CONSTRAINT UQ_Bookings_BookingReference
        UNIQUE (BookingReference),

    CONSTRAINT FK_Bookings_Users
        FOREIGN KEY (UserId)
        REFERENCES dbo.Users(UserId),

    CONSTRAINT FK_Bookings_OriginPort
        FOREIGN KEY (OriginPortId)
        REFERENCES dbo.Ports(PortId),

    CONSTRAINT FK_Bookings_DestinationPort
        FOREIGN KEY (DestinationPortId)
        REFERENCES dbo.Ports(PortId),

    CONSTRAINT FK_Bookings_ShippingLine
        FOREIGN KEY (ShippingLineId)
        REFERENCES dbo.ShippingLines(ShippingLineId),

    CONSTRAINT FK_Bookings_VesselVisit
        FOREIGN KEY (VesselVisitId)
        REFERENCES dbo.VesselVisits(VesselVisitId),

    CONSTRAINT CK_Bookings_PassengerCount
        CHECK (PassengerCount > 0),

    CONSTRAINT CK_Bookings_TotalAmount
        CHECK (TotalAmount >= 0)
);


-- ============================================================
-- Payments
-- ============================================================

CREATE TABLE dbo.Payments
(
    PaymentId BIGINT IDENTITY(1,1) NOT NULL,
    BookingId BIGINT NOT NULL,

    MerchantTransId NVARCHAR(100) NOT NULL,
    AcquirementId NVARCHAR(100) NULL,
    TransactionId NVARCHAR(100) NULL,

    Amount DECIMAL(18,2) NOT NULL,
    Currency CHAR(3) NOT NULL
        CONSTRAINT DF_Payments_Currency DEFAULT 'PHP',

    PaymentStatus NVARCHAR(30) NOT NULL,

    CheckoutUrl NVARCHAR(1000) NULL,
    PaidAt DATETIME2(0) NULL,

    CreatedAt DATETIME2(0) NOT NULL
        CONSTRAINT DF_Payments_CreatedAt DEFAULT SYSUTCDATETIME(),

    UpdatedAt DATETIME2(0) NOT NULL
        CONSTRAINT DF_Payments_UpdatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Payments
        PRIMARY KEY (PaymentId),

    CONSTRAINT FK_Payments_Bookings
        FOREIGN KEY (BookingId)
        REFERENCES dbo.Bookings(BookingId),

    CONSTRAINT UQ_Payments_MerchantTransId
        UNIQUE (MerchantTransId),

    CONSTRAINT CK_Payments_Amount
        CHECK (Amount >= 0),

    CONSTRAINT CK_Payments_Currency
        CHECK (Currency = 'PHP')
);


-- ============================================================
-- QR Codes
-- ============================================================

CREATE TABLE dbo.QRCodes
(
    QRCodeId BIGINT IDENTITY(1,1) NOT NULL,
    BookingId BIGINT NOT NULL,

    QRCodeValue NVARCHAR(500) NOT NULL,

    Status NVARCHAR(30) NOT NULL,

    CreatedAt DATETIME2(0) NOT NULL
        CONSTRAINT DF_QRCodes_CreatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_QRCodes
        PRIMARY KEY (QRCodeId),

    CONSTRAINT FK_QRCodes_Bookings
        FOREIGN KEY (BookingId)
        REFERENCES dbo.Bookings(BookingId),

    CONSTRAINT UQ_QRCodes_BookingId
        UNIQUE (BookingId),

    CONSTRAINT UQ_QRCodes_QRCodeValue
        UNIQUE (QRCodeValue)
);


-- ============================================================
-- Scan Logs
-- ============================================================

CREATE TABLE dbo.ScanLogs
(
    ScanLogId BIGINT IDENTITY(1,1) NOT NULL,
    QRCodeId BIGINT NOT NULL,

    ScanType NVARCHAR(30) NOT NULL,
    ScanResult NVARCHAR(30) NOT NULL,

    ScannedAt DATETIME2(0) NOT NULL
        CONSTRAINT DF_ScanLogs_ScannedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_ScanLogs
        PRIMARY KEY (ScanLogId),

    CONSTRAINT FK_ScanLogs_QRCodes
        FOREIGN KEY (QRCodeId)
        REFERENCES dbo.QRCodes(QRCodeId)
);


-- ============================================================
-- Transaction Logs
-- ============================================================

CREATE TABLE dbo.TransactionLogs
(
    TransactionLogId BIGINT IDENTITY(1,1) NOT NULL,

    EventType NVARCHAR(100) NOT NULL,
    EntityType NVARCHAR(50) NOT NULL,
    EntityId BIGINT NOT NULL,

    Status NVARCHAR(50) NULL,
    Details NVARCHAR(MAX) NULL,

    CreatedAt DATETIME2(0) NOT NULL
        CONSTRAINT DF_TransactionLogs_CreatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_TransactionLogs
        PRIMARY KEY (TransactionLogId)
);