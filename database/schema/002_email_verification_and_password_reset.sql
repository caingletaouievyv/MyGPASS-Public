IF COL_LENGTH('dbo.Users', 'IsEmailVerified') IS NULL
BEGIN
    ALTER TABLE dbo.Users
        ADD IsEmailVerified BIT NOT NULL CONSTRAINT DF_Users_IsEmailVerified DEFAULT 0;
END


-- Create EmailVerificationTokens table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'EmailVerificationTokens')
BEGIN
    CREATE TABLE EmailVerificationTokens (
        EmailVerificationTokenId BIGINT IDENTITY(1,1) PRIMARY KEY,
        UserId BIGINT NOT NULL,
        TokenHash NVARCHAR(MAX) NOT NULL,
        ExpiresAt DATETIME2 NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        VerifiedAt DATETIME2 NULL,
        CONSTRAINT FK_EmailVerificationTokens_Users FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
    );

    CREATE INDEX IX_EmailVerificationTokens_UserId ON EmailVerificationTokens(UserId);
END

-- Create PasswordResetTokens table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PasswordResetTokens')
BEGIN
    CREATE TABLE PasswordResetTokens (
        PasswordResetTokenId BIGINT IDENTITY(1,1) PRIMARY KEY,
        UserId BIGINT NOT NULL,
        TokenHash NVARCHAR(MAX) NOT NULL,
        ExpiresAt DATETIME2 NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UsedAt DATETIME2 NULL,
        CONSTRAINT FK_PasswordResetTokens_Users FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
    );

    CREATE INDEX IX_PasswordResetTokens_UserId ON PasswordResetTokens(UserId);
END
