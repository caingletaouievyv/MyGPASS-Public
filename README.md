# MyGPASS

A full-stack passenger booking system built with Angular, ASP.NET Core, and SQL Server.

MyGPASS provides a user-facing flow for searching routes, creating passenger bookings, managing account access, completing payment steps, and accessing digital passes.

## Demo

**Live demo:** Coming soon

The public repository is a clean, runnable snapshot of the agreed 11-page user-facing MyGPASS application. Admin User Maintenance and Admin Schedule Maintenance UI and API management operations are removed from this public snapshot. The read-only schedule endpoint required for booking route selection remains.

> **Demo/payment note:** Payment functionality in the public project is for demonstration/testing purposes. It does not represent a live production payment gateway or real-money transaction.

## Quick Demo

> **Live demo:** Coming soon
>
> **Repo:** [caingletaouievyv/MyGPASS-Public](https://github.com/caingletaouievyv/MyGPASS-Public)

MyGPASS is a full-stack passenger booking system built with **Angular 22** and **ASP.NET Core 10**. It demonstrates a complete booking lifecycle — route selection, scheduling, payment (demo), digital QR passes, guest access, authentication, and booking history — with security hardening throughout.

**What you can do in the demo:**
- Register / log in or continue as a **guest** (no account needed)
- Select an origin port on a schematic Philippine map
- Choose destination, shipping line, departure day, and time
- Enter passenger count and proceed to demo payment
- Receive a **digital pass with QR code** per passenger
- View booking history and account details (registered users)
- Download QR codes

**Tech highlights for recruiters:**
- Angular 22 (standalone components, signals, responsive UI)
- ASP.NET Core 10 Web API (.NET 10)
- Entity Framework Core + SQL Server (Azure SQL compatible)
- JWT authentication with role-based authorization
- Cryptographically secure guest access tokens (SHA-256 hashed, expiration/revocation/ownership validated)
- Security headers, CSP, CORS, rate limiting, VAPT-oriented hardening
- 75 frontend tests + 58 backend tests passing
- No EF migrations — versioned SQL scripts via SSMS

## Local Demo Setup

This uses a separate local database and fictional schedule data. It does not call a private API, use production credentials, or take a real payment.

### Prerequisites

- Node.js and npm
- .NET 10 SDK
- SQL Server LocalDB (`MSSQLLocalDB`)

### Database

Create an empty database named `MyGPASS_Public_Development` on LocalDB. From the `backend` directory, apply schema scripts `001` through `007`, then `009`, and then the fictional seed:

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

The seed inserts Demo Port A, Demo Port B, Example Shipping Line, Demo Vessel, and one Daily 12:00 visit. Pass `-I` to `sqlcmd` so the filtered guest-booking index in script `006` is created with `QUOTED_IDENTIFIER` on.

### Ignored API settings

Copy the example settings to the gitignored development file and point `ConnectionStrings:GPassDb` at `MyGPASS_Public_Development` on `(localdb)\MSSQLLocalDB` with Windows authentication. Do not commit that file. Leave every GCash value empty.

### Run

```powershell
dotnet build "backend\MyGPASS.Api\MyGPASS.Api.csproj" --nologo
dotnet run --launch-profile http --project "backend\MyGPASS.Api\MyGPASS.Api.csproj"
```

The HTTP profile listens on `http://localhost:5000`. In another terminal:

```powershell
cd frontend/mygpass-client
npm ci
npm start
```

Open `http://localhost:4200`. Development keeps an empty API base URL, and `proxy.conf.json` forwards `/api` to `http://localhost:5000`.

### Verify

`GET http://localhost:5000/api/ports` returns Demo Port A and Demo Port B.

The route map still shows its built-in origin names. The seeded ports are not pins on that map. Open `http://localhost:4200/booking/details?origin=Demo%20Port%20A` to load Demo Port A, choose Demo Port B, Example Shipping Line, a departure date, and 12:00 PM, then use the demo payment page. One QR is created per passenger. The payment step is a local demo confirmation only.

## Features

- Passenger route and schedule selection
- Booking details, including the passenger count
- Guest booking access
- Account registration and authentication
- Email verification and password reset flows
- Booking history and account management
- Digital passenger passes with QR codes
- Booking/payment confirmation flow
- Responsive Angular user interface
- Backend API with authentication and authorization
- Automated frontend and backend tests

## Key Features (Recruiter Summary)

- **Full booking flow:** Route → Details → Payment (demo) → Digital Pass with QR
- **Guest booking:** No registration required; cryptographically secure guest tokens
- **Authentication:** JWT-based login/register with email verification and password reset
- **Account & History:** Registered users can view past bookings and manage their account
- **Responsive UI:** Mobile-friendly across all pages
- **Security:** JWT validation, configured CORS, rate limiting, security headers (CSP, HSTS, X-Frame-Options), production-safe error handling, dependency vulnerability scanning (0 npm vulnerabilities)
- **Testing:** 75 frontend tests (Vitest) + 58 backend tests (.NET), production build passing
- **Database:** SQL Server / Azure SQL with versioned migration scripts (no EF migrations)
- **Deployment:** FileZilla-based publish with backend commit verification via `/api/version`

## Booking Flow

The main user journey follows this general flow:

The public app opens on Login. There is no separate landing page. The implemented routes are Login, Register, Forgot Password, Reset Password, Verify Email, Booking Route, Booking Details, Payment, Pass, Account, and History.

1. **Route** (`/booking/route`) — choose an origin port on the schematic map, then choose Passenger Terminal Fee. RORO Terminal Fee is shown and disabled.
2. **Details** (`/booking/details`) — choose the destination, shipping line, departure date, and departure time, and enter the number of passengers. Passenger names are not collected on a separate screen. The order summary is on this page.
3. **Payment** (`/booking/payment`) — complete the demo payment confirmation. This is not a live payment.
4. **Pass** (`/booking/pass`) — open the passenger pass and QR code.
5. **Account / History** — review the signed-in account and previous bookings.

Guest bookings can also be accessed through a protected guest-access mechanism without requiring a registered account.

## Architecture

MyGPASS follows a layered full-stack architecture:

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

The frontend handles the user experience and API integration. The backend exposes controller endpoints and keeps business logic in application services. Data access is handled through Entity Framework Core against SQL Server-compatible storage.

## Security

Security is treated as part of the application design rather than an afterthought.

The public project includes or is structured around:

- JWT-based authentication
- Server-side authorization checks
- Protected authenticated endpoints
- Cryptographically random guest-booking access tokens
- Hashed guest access tokens stored by the backend
- Server-side guest access validation, expiration, and ownership checks
- Security-focused HTTP response headers
- Configured CORS policies
- Rate limiting where appropriate
- Production-safe error handling that avoids exposing internal details
- Validation of user-controlled input on the server

No credentials, secrets, private infrastructure details, or internal production configuration are included in this public repository.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Angular 22, TypeScript |
| Backend | ASP.NET Core / .NET 10 |
| API | ASP.NET Core Web API |
| Data Access | Entity Framework Core |
| Database | SQL Server / Azure SQL |
| Authentication | JWT |
| Frontend Testing | Vitest / Angular testing tools |
| Backend Testing | .NET test stack |

## Project Structure

```text
MyGPASS/
├── frontend/
│   └── mygpass-client/       # Angular frontend
├── backend/
│   ├── MyGPASS.Api/          # ASP.NET Core API
│   └── MyGPASS.Api.Tests/    # Backend tests
├── database/
│   └── schema/               # Database schema scripts
└── docs/                     # Public project documentation
```

The public repository focuses on the user-facing application. Private/internal implementation details are intentionally excluded.

## VAPT preparation

The temporary VAPT handoff documents are not part of this public snapshot. Do not treat this repository as a VAPT certificate or as authorization to test a private environment.

## Local Development

### Prerequisites

Install:

- Node.js and npm
- .NET 10 SDK
- SQL Server or an accessible SQL Server-compatible database

### Frontend

From the frontend directory:

```powershell
cd frontend/mygpass-client
npm ci
npm test
npm run build
```

Configure the frontend using the provided/example configuration appropriate for your local environment. Do not commit real credentials or secrets.

### Backend

Build the API:

```powershell
dotnet build "backend\MyGPASS.Api\MyGPASS.Api.csproj" --nologo
```

Run the backend tests:

```powershell
dotnet test "backend\MyGPASS.Api.Tests\MyGPASS.Api.Tests.csproj" --nologo
```

Database schema changes are maintained as versioned SQL scripts rather than relying on Entity Framework migrations. Apply the appropriate schema scripts to your local database before running the API.

## Testing

The project includes automated tests for both frontend and backend code.

Recommended validation:

```powershell
# Frontend
cd frontend/mygpass-client
npm test
npm run build

# Backend
dotnet build "backend\MyGPASS.Api\MyGPASS.Api.csproj" --nologo
dotnet test "backend\MyGPASS.Api.Tests\MyGPASS.Api.Tests.csproj" --nologo
```

Tests should pass before changes are considered ready for the public repository.

## Screenshots

Screenshots and a hosted demo will be added as the public demo is prepared.

Suggested showcase areas:

- Login and registration
- Route selection
- Booking details and order summary
- Payment demo confirmation
- Digital passenger pass
- Account and booking history

## Current Status

**Public release:** Active development / demo preparation

### What's implemented
- User authentication and account flows (register, login, forgot/reset password, email verification)
- Route and schedule selection with interactive Philippine port map
- Booking creation flow (route → details → payment → pass/QR)
- Guest booking access (no registration, token-secured)
- Booking history and account management
- Digital QR passenger passes (one per passenger)
- Payment/demo confirmation flow
- Security hardening (JWT, CORS, rate limiting, headers, VAPT-oriented)
- Automated testing (75 frontend + 58 backend tests passing)
- Local demo setup (SQL Server LocalDB, fictional seed data, one-command backend start)

### Demo / production boundaries
- A live hosted demo is **not yet published**.
- Production payment processing is **not enabled** (demo payment only).
- Private infrastructure, credentials, internal URLs, and production configuration are excluded.
- Admin maintenance features are intentionally excluded from this public snapshot.

## Project Scope

MyGPASS is maintained as a practical full-stack application with a focus on:

- clear separation between frontend, API, services, and data access
- secure authentication and authorization
- maintainable application structure
- testable code
- safe public-source publishing

The public repository is a sanitized release/demo project and should not be treated as a copy of any private/internal repository.
