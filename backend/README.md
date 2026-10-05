# MyGPASS Backend

ASP.NET Core Web API for the MyGPASS application. The API uses EF Core with SQL Server and retains the existing authentication, booking, administration, payment, email, and QR-code flows.

## Requirements

- .NET 10 SDK (the projects target `net10.0`)
- SQL Server 2019 or later, such as SQL Server Developer or Express, running locally
- A SQL Server login or Windows account permitted to create/use the development database

## Configure a local API

From this directory, create an ignored local settings file from the safe template:

```powershell
Copy-Item MyGPASS.Api/appsettings.example.json MyGPASS.Api/appsettings.Development.json
```

The example connection string uses Windows authentication and a local SQL Server at `localhost`. Edit the ignored `appsettings.Development.json` to match your local SQL Server instance, or supply the connection string with User Secrets:

```powershell
dotnet user-secrets set "ConnectionStrings:GPassDb" "Server=localhost;Database=MyGPASS_Development;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true" --project MyGPASS.Api
```

Do not put real credentials in tracked files. User Secrets or environment variables can override the example settings. The `Jwt:SigningKey` is generated randomly for a development run when omitted; to keep local tokens valid between restarts, provide a private key of at least 32 bytes:

```powershell
dotnet user-secrets set "Jwt:SigningKey" "<your-random-secret-of-at-least-32-bytes>" --project MyGPASS.Api
```

Production startup requires `Jwt:SigningKey` to be configured. Never reuse the example or a test signing key in a deployed environment.

The local CORS origins and frontend URL in the example are `http://localhost:4200` and `http://127.0.0.1:4200`. Change them only to origins you control. SMTP settings are blank, so email verification and password reset emails are not delivered until a developer configures SMTP through local settings, User Secrets, environment variables, or the `ApplicationSettings` table. The existing demo payment confirmation flow remains available. GCash options are retained as empty configuration placeholders, but this source does not include a live GCash gateway client.

## Create the database

The versioned SQL scripts in `../database/schema` are the authoritative database setup workflow. Create an empty local database named `MyGPASS_Development`, configure the `GPassDb` connection string, and apply the scripts once in numeric order using SQL Server Management Studio or `sqlcmd`:

```powershell
Get-ChildItem ../database/schema/*.sql | Sort-Object Name | ForEach-Object {
	sqlcmd -S localhost -d MyGPASS_Development -E -b -i $_.FullName
	if ($LASTEXITCODE -ne 0) { throw "Failed to apply $($_.Name)" }
```

The API requires the `GPassDb` connection string at startup and does not migrate the database automatically. The migration contains schema only; it does not seed user or operational data.
The API requires the `GPassDb` connection string at startup and does not apply schema scripts automatically.
To make the booking flow selectable on a fresh database, optionally apply the synthetic example route (Demo Port A to Demo Port B, Example Shipping Line, Demo Vessel) using SQL Server Management Studio or `sqlcmd`:

```powershell
sqlcmd -S localhost -d MyGPASS_Development -E -i ../database/seeds/schedule_seed.example.sql
```

This is fictional demonstration data, not a live or current sailing schedule. You can remove or replace it with routes you are authorized to use.

## Local administrator access

Register and verify your own local account first. The API has no first-admin bootstrap endpoint; for a local development database only, promote that account with SQL Server Management Studio:

```sql
UPDATE dbo.Users
SET Role = N'Admin'
WHERE Email = N'<your-verified-local-email>';
```

Use a specific account you control, and never apply this bootstrap step to a shared or production database.

## Run and test

```powershell
dotnet restore MyGPASS.Api/MyGPASS.Api.csproj
dotnet run --project MyGPASS.Api/MyGPASS.Api.csproj
dotnet test MyGPASS.Api.Tests/MyGPASS.Api.Tests.csproj
```

The HTTPS launch profile listens on `https://localhost:5001` and HTTP listens on `http://localhost:5000`. The frontend API example uses `https://localhost:5001`. In Development, OpenAPI is available at `https://localhost:5001/openapi/v1.json`.