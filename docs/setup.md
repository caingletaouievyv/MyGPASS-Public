# Setup

This is the local reference for the public MyGPASS demo. It uses a separate local database and fictional schedule data. It does not call a private API, use production credentials, or take a real payment.

The public repository is a clean, runnable snapshot of the agreed 11-page user-facing application. Admin User Maintenance and Admin Schedule Maintenance UI and API management operations are removed. The read-only schedule endpoint required for booking route selection remains.

Payment functionality is for demonstration and testing. It is not a live payment gateway and it does not move real money.

## Local demo setup

### Prerequisites

- Node.js and npm
- .NET 10 SDK
- SQL Server LocalDB (`MSSQLLocalDB`)

### Database

Create an empty database named `MyGPASS_Public_Development` on LocalDB. From the `backend` directory, apply schema scripts `001` through `007`, then `009`, and then the fictional seed. There is no `008` script in this repository.

```powershell
sqlcmd -S "(localdb)\MSSQLLocalDB" -E -b -Q "IF DB_ID(N'MyGPASS_Public_Development') IS NULL CREATE DATABASE MyGPASS_Public_Development;"
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
    sqlcmd -I -S "(localdb)\MSSQLLocalDB" -d MyGPASS_Public_Development -E -b -i "../database/schema/$name"
    if ($LASTEXITCODE -ne 0) { throw "Failed to apply $name" }
}
sqlcmd -S "(localdb)\MSSQLLocalDB" -d MyGPASS_Public_Development -E -b -i ../database/seeds/schedule_seed.example.sql
```

The seed inserts Demo Port A, Demo Port B, Example Shipping Line, Demo Vessel, and one Daily 12:00 visit. Pass `-I` to `sqlcmd` so the filtered guest-booking index in script `006` is created with `QUOTED_IDENTIFIER` on. The seed is demonstration data only. It is not a live sailing schedule.

### Ignored API settings

From the `backend` directory, copy the tracked example to the gitignored development file:

```powershell
Copy-Item MyGPASS.Api/appsettings.example.json MyGPASS.Api/appsettings.Development.json
```

Point `ConnectionStrings:GPassDb` at `MyGPASS_Public_Development` on `(localdb)\MSSQLLocalDB` with Windows authentication:

```text
Server=(localdb)\MSSQLLocalDB;Database=MyGPASS_Public_Development;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true
```

Do not commit `appsettings.Development.json`. Leave every GCash value empty. Do not put real credentials in tracked files.

### Run

```powershell
dotnet build "backend\MyGPASS.Api\MyGPASS.Api.csproj" --nologo
dotnet run --launch-profile http --project "backend\MyGPASS.Api\MyGPASS.Api.csproj"
```

The HTTP profile listens on `http://localhost:5000`. In Development, the OpenAPI document is at `http://localhost:5000/openapi/v1.json`. In another terminal:

```powershell
cd frontend/mygpass-client
npm ci
npm start
```

Open `http://localhost:4200`. Development keeps an empty API base URL, and `proxy.conf.json` forwards `/api` to `http://localhost:5000`.

### Verify

`GET http://localhost:5000/api/ports` returns Demo Port A and Demo Port B.

The route map still shows its built-in origin names. The seeded ports are not pins on that map. Open `http://localhost:4200/booking/details?origin=Demo%20Port%20A` to load Demo Port A, choose Demo Port B, Example Shipping Line, a departure date, and 12:00 PM, then use the demo payment page. One QR is created per passenger. The payment step is a local demo confirmation only.

### Email verification

Registration stores `IsEmailVerified` as false. Login succeeds only after that account is verified. Forgot-password and verification messages are sent only when SMTP is configured. The example SMTP host, username, and password are empty, so those messages are not sent.

Without SMTP, a newly registered account cannot complete normal login verification through email. For a local development database only, you may mark a demo account you created as verified:

```sql
UPDATE dbo.Users
SET IsEmailVerified = 1
WHERE Email = N'<your-local-demo-email>';
```

Do not change application code to skip verification. Do not run that update against a shared or deployed database.

## Project structure

```text
MyGPASS-Public/
├── frontend/
│   └── mygpass-client/          # Angular 22 frontend
├── backend/
│   ├── MyGPASS.Api/             # ASP.NET Core 10 Web API
│   ├── MyGPASS.Api.Tests/       # Backend tests
│   └── README.md                # Backend configuration notes
├── database/
│   ├── schema/                  # Versioned SQL scripts (no EF migrations)
│   └── seeds/                   # Fictional schedule seed
└── docs/
    ├── setup.md                 # This file
    └── demo/                    # Placeholder GIFs referenced by the README
```

The public repository focuses on the user-facing application. Private and internal implementation details are excluded.

## Booking flow

The public app opens on Login. There is no separate landing page. The implemented routes are Login, Register, Forgot Password, Reset Password, Verify Email, Booking Route, Booking Details, Payment, Pass, Account, and History.

1. **Route** (`/booking/route`) — choose an origin port on the schematic map, then choose Passenger Terminal Fee. RORO Terminal Fee is shown and disabled.
2. **Details** (`/booking/details`) — choose the destination, shipping line, departure date, and departure time, and enter the number of passengers. Passenger names are not collected on a separate screen. The order summary is on this page.
3. **Payment** (`/booking/payment`) — complete the demo payment confirmation. This is not a live payment.
4. **Pass** (`/booking/pass`) — open the passenger pass and QR code.
5. **Account / History** — review the signed-in account and previous bookings.

Guest bookings can also be accessed through a protected guest-access mechanism without requiring a registered account.

## Architecture

```text
Angular Frontend
       │
       ▼
ASP.NET Core Web API
       │
       ▼
Application Services
       │
       ▼
Entity Framework Core
       │
       ▼
SQL Server / Azure SQL
```

The frontend handles the user experience and API integration. The backend exposes controller endpoints and keeps business logic in application services. Data access is handled through Entity Framework Core against SQL Server-compatible storage. Schema changes are versioned SQL scripts, not Entity Framework migrations.

## Security

- JWT-based authentication
- Server-side authorization checks
- Protected authenticated endpoints
- Cryptographically random guest-booking access tokens
- Hashed guest access tokens stored by the backend (SHA-256)
- Server-side guest access validation, expiration, revocation, and ownership checks
- Security headers, including CSP, HSTS, and X-Frame-Options
- Configured CORS policies
- Rate limiting where appropriate
- Production-safe error handling that avoids exposing internal details
- Validation of user-controlled input on the server

No credentials, secrets, private infrastructure details, or internal production configuration are included in this public repository.

## VAPT preparation

The public project includes VAPT-oriented hardening. That is not a VAPT certificate and it is not authorization to test a private environment. Temporary VAPT handoff documents are not part of this public snapshot.

## Testing

```powershell
# Frontend
cd frontend/mygpass-client
npm test
npm run build

# Backend
dotnet build "backend\MyGPASS.Api\MyGPASS.Api.csproj" --nologo
dotnet test "backend\MyGPASS.Api.Tests\MyGPASS.Api.Tests.csproj" --nologo
```

Expected: 75 frontend tests (Vitest) and 58 backend tests. Tests should pass before changes are considered ready for the public repository.

## Deployment

This repository does not include production hostnames, credentials, or publish profiles. A published API can be checked with `GET /api/version`, which reports the commit that is running. The production frontend build uses an empty API base URL, so a hosted site needs its own reverse proxy to forward `/api` to the API. Do not commit development settings or secrets.

## Current status

**Public release:** Active development / demo preparation

### What's implemented

- User authentication and account flows (register, login, forgot/reset password, email verification)
- Route and schedule selection with an interactive Philippine port map
- Booking creation flow (route, details, payment, pass/QR)
- Guest booking access (no registration, token-secured)
- Booking history and account management
- Digital QR passenger passes (one per passenger)
- Payment/demo confirmation flow
- Security hardening (JWT, CORS, rate limiting, headers, VAPT-oriented)
- Automated testing (75 frontend and 58 backend tests passing)
- Local demo setup (SQL Server LocalDB, fictional seed data)

### Demo / production boundaries

- A live hosted demo is not yet published.
- Production payment processing is not enabled (demo payment only).
- Private infrastructure, credentials, internal URLs, and production configuration are excluded.
- Admin maintenance features are excluded from this public snapshot.

## Project scope

MyGPASS is maintained as a practical full-stack application with a focus on clear separation between frontend, API, services, and data access; secure authentication and authorization; a maintainable structure; testable code; and safe public-source publishing.

The public repository is a sanitized release/demo project and should not be treated as a copy of any private or internal repository.
