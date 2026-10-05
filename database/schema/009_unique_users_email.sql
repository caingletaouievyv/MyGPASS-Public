/*
    Unique email enforcement for Users

    Purpose:
        The application normalizes email values before storage using Trim().ToLowerInvariant().
        To enforce uniqueness on the normalized stored value, add a database-level unique
        index on Email itself while allowing only non-null email rows.

    Safety checks:
        1. Validate there are no duplicate normalized email values in dbo.Users.
        2. Prevent creation if duplicates exist so the DBA can resolve data before
           enforcing the unique index.
        3. Create the index only after the data check passes.

    IMPORTANT:
        Execute this script against the intended SQL Server database with an authorized account.
*/

SET NOCOUNT ON;

BEGIN TRY
    DECLARE @DuplicateEmailCount INT;

    ;WITH DuplicateNormalizedEmails AS
    (
        SELECT
            Email AS NormalizedEmail,
            COUNT(*) AS DuplicateCount
        FROM dbo.Users
        WHERE Email IS NOT NULL
        GROUP BY Email
        HAVING COUNT(*) > 1
    )
    SELECT @DuplicateEmailCount = COUNT(*)
    FROM DuplicateNormalizedEmails;

    IF @DuplicateEmailCount > 0
    BEGIN
        THROW 50000,
              'Cannot create UQ_Users_Email because duplicate normalized emails exist in dbo.Users. Resolve the data before adding the unique index.',
              1;
    END

    IF EXISTS
    (
        SELECT 1
        FROM sys.indexes i
        INNER JOIN sys.tables t ON t.object_id = i.object_id
        WHERE t.name = 'Users'
          AND i.name = 'UQ_Users_Email'
    )
    BEGIN
        PRINT 'UQ_Users_Email already exists; no action needed.';
        RETURN;
    END

    CREATE UNIQUE INDEX UQ_Users_Email
        ON dbo.Users (Email)
        WHERE Email IS NOT NULL;

    PRINT 'UQ_Users_Email created successfully.';
END TRY
BEGIN CATCH
    DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
    DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
    DECLARE @ErrorState INT = ERROR_STATE();

    RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
END CATCH;
