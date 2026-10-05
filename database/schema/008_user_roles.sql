-- Add explicit user access levels. Existing and future accounts default to User.
IF COL_LENGTH('dbo.Users', 'Role') IS NULL
BEGIN
    ALTER TABLE dbo.Users
        ADD Role NVARCHAR(30) NOT NULL
            CONSTRAINT DF_Users_Role DEFAULT N'User';
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = N'CK_Users_Role'
      AND parent_object_id = OBJECT_ID(N'dbo.Users')
)
BEGIN
    ALTER TABLE dbo.Users
        ADD CONSTRAINT CK_Users_Role CHECK (Role IN (N'User', N'Admin'));
END;
GO

-- Administrator assignment is intentionally explicit and must be performed
-- for a known account by an authorized database operator.
-- UPDATE dbo.Users SET Role = N'Admin' WHERE Email = N'admin@example.com';
