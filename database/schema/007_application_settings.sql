IF OBJECT_ID('dbo.ApplicationSettings', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ApplicationSettings (
        SettingKey NVARCHAR(100) NOT NULL,
        SettingValue NVARCHAR(2000) NULL,
        UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_ApplicationSettings_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_ApplicationSettings PRIMARY KEY (SettingKey)
    );
END;
GO

/*
  Insert the approved deployment values manually through SSMS.
  Do not commit the SMTP password or other production credentials to Git.
  The application falls back to existing environment/app configuration while
  these rows are absent or empty.

  Example statements with placeholders only:
  -- MERGE dbo.ApplicationSettings AS target
  -- USING (VALUES
  --   (N'Frontend:BaseUrl', N'<approved frontend base URL>'),
  --   (N'EmailVerification:Smtp:Host', N'<approved SMTP host>'),
  --   (N'EmailVerification:Smtp:Port', N'<approved SMTP port>'),
  --   (N'EmailVerification:Smtp:Username', N'<approved SMTP username>'),
  --   (N'EmailVerification:Smtp:Password', N'<approved SMTP password>'),
  --   (N'EmailVerification:Smtp:From', N'<approved SMTP from address>'),
  --   (N'EmailVerification:Smtp:DisplayName', N'<approved SMTP display name>')
  -- ) AS source (SettingKey, SettingValue)
  -- ON target.SettingKey = source.SettingKey
  -- WHEN MATCHED THEN UPDATE SET SettingValue = source.SettingValue, UpdatedAt = SYSUTCDATETIME()
  -- WHEN NOT MATCHED THEN INSERT (SettingKey, SettingValue) VALUES (source.SettingKey, source.SettingValue);
*/