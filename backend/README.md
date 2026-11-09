# MyGPASS Backend

ASP.NET Core Web API for the public MyGPASS demo. The API uses EF Core with SQL Server for authentication, booking, demo payment confirmation, email, and QR-code flows.

This public snapshot does not include Admin User Maintenance or Admin Schedule Maintenance. Payment confirmation is a demo flow. GCash settings stay empty, and this source does not call a live GCash gateway.

## Requirements

- .NET 10 SDK (the projects target `net10.0`)
- SQL Server 2019 or later, such as SQL Server Developer or Express, running locally
- A SQL Server login or Windows account permitted to create and use the local development database

## Configure a local API

From this `backend` directory, copy the tracked example to the gitignored development settings file:

```powershell
Copy-Item MyGPASS.Api/appsettings.example.json MyGPASS.Api/appsettings.Development.json
```

The example connection string uses Windows authentication and a local SQL Server database named `MyGPASS_Development`. Edit `MyGPASS.Api/appsettings.Development.json` if your instance differs, or set the connection string with User Secrets:

```powershell
dotnet user-secrets set "ConnectionStrings:GPassDb" "Server=localhost;Database=MyGPASS_Development;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true" --project MyGPASS.Api
```

Do not put real credentials in tracked files. User Secrets or environment variables can override the example settings. In Development, `Jwt:SigningKey` is generated randomly for that run when it is omitted. To keep local tokens valid between restarts, set a private key of at least 32 bytes:

```powershell
dotnet user-secrets set "Jwt:SigningKey" "<your-random-secret-of-at-least-32-bytes>" --project MyGPASS.Api
```

Production startup requires `Jwt:SigningKey`. Never reuse an example or test signing key in a deployed environment.

The example CORS origins and frontend URL are `http://localhost:4200` and `http://127.0.0.1:4200`. Change them only to origins you control. Leave every GCash value empty. Use the fictional schedule seed below, not data from a private system.

## Create the database

Create an empty local database named `MyGPASS_Development` and configure `ConnectionStrings:GPassDb` before starting the API. The API does not apply schema scripts or seed data.

From this `backend` directory, apply the public schema scripts in this order: `001` through `007`, then `009`. There is no `008` script in this repository.

```powershell
$scripts = @(
    "001_initial_schema.sql",
    "002_email_verification_and_password_reset.sql",
    "003_booking_departure_datetime.sql",
    "004_qr_code_expiration.sql",
    "005_qr_codes_per_passenger.sql",
    "006_guest_bookings.sql",
    "007_application_settings.sql",
    "009_unique_users_email.sql"
)
foreach ($name in $scripts) {
    sqlcmd -S localhost -d MyGPASS_Development -E -b -i "../database/schema/$name"
    if ($LASTEXITCODE -ne 0) { throw "Failed to apply $name" }
}
```

Then apply the fictional schedule seed (Demo Port A, Demo Port B, Example Shipping Line, and Demo Vessel):

```powershell
sqlcmd -S localhost -d MyGPASS_Development -E -b -i ../database/seeds/schedule_seed.example.sql
```

That seed is demonstration data only. It is not a live sailing schedule.

## Email verification

Registration stores `IsEmailVerified` as false. Login succeeds only after that account is verified. Forgot-password and verification messages are sent only when SMTP is configured through `EmailVerification:Smtp` in local settings, the matching environment variables, User Secrets, or the `ApplicationSettings` table. The example SMTP host, username, and password are empty, so those messages are not sent.

Without SMTP, a newly registered account cannot complete normal login verification through email. For a local development database only, you may mark a demo account you created as verified:

```sql
UPDATE dbo.Users
SET IsEmailVerified = 1
WHERE Email = N'<your-local-demo-email>';
```

Do not change application code to skip verification. Do not run that update against a shared or deployed database.

## Frontend API calls

Local `npm start` uses an empty API base URL. `frontend/mygpass-client/proxy.conf.json` forwards browser requests from `/api` to `http://localhost:5000`. Keep that development proxy on port 5000.

The production frontend build also uses an empty `apiBaseUrl`, so the browser calls `/api` on the same origin as the hosted site. A hosted demo needs the hosting platform or a reverse proxy to forward `/api` to this API. This repository does not set a public API hostname.

## Run and test

Start the API with the HTTP launch profile:

```powershell
dotnet run --launch-profile http --project MyGPASS.Api/MyGPASS.Api.csproj
```

That profile listens on `http://localhost:5000`. In Development, OpenAPI is available at `http://localhost:5000/openapi/v1.json`.

Run the backend tests:

```powershell
dotnet test MyGPASS.Api.Tests/MyGPASS.Api.Tests.csproj
```
