# MyGPASS

A full-stack passenger booking system built with Angular, ASP.NET Core, and SQL Server.

MyGPASS provides a user-facing flow for searching routes, creating passenger bookings, managing account access, completing payment steps, and accessing digital passes.

## 🚀 Demo

**Live demo:** Coming soon

The public repository is intended to provide a clean, runnable demonstration of the MyGPASS user-facing application.

> **Demo/payment note:** Payment functionality in the public project is for demonstration/testing purposes. It does not represent a live production payment gateway or real-money transaction.

## ✨ Features

- Passenger route and schedule selection
- Booking details and passenger information
- Guest booking access
- Account registration and authentication
- Email verification and password reset flows
- Booking history and account management
- Digital passenger passes with QR codes
- Booking/payment confirmation flow
- Responsive Angular user interface
- Backend API with authentication and authorization
- Automated frontend and backend tests

## 🧭 Booking Flow

The main user journey follows this general flow:

1. **Route** — select the travel route and schedule.
2. **Details** — provide passenger and booking information.
3. **Payment** — complete the available payment/demo confirmation step.
4. **Pass** — access the generated passenger pass and QR code.
5. **Account / History** — review account information and previous bookings.

Guest bookings can also be accessed through a protected guest-access mechanism without requiring a registered account.

## 🏗️ Architecture

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

## 🔐 Security

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

## 🛠️ Tech Stack

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

## 📁 Project Structure

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

## 💻 Local Development

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

## 🧪 Testing

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

## 📸 Screenshots

Screenshots and a hosted demo will be added as the public demo is prepared.

Suggested showcase areas:

- Landing / home screen
- Route selection
- Booking details
- Payment/demo confirmation
- Digital passenger pass
- Account and booking history

## 📌 Current Status

**Public release:** Active development / demo preparation

The public repository currently focuses on the passenger-facing MyGPASS experience.

### Implemented direction

- User authentication and account flows
- Route and schedule selection
- Booking creation flow
- Guest booking access
- Booking history
- Digital QR passenger passes
- Payment/demo confirmation flow
- Security hardening and automated testing

### Demo / production boundaries

- A live hosted demo is **not yet published**.
- Production payment processing is **not enabled by this public project**.
- Private infrastructure, credentials, internal URLs, and production configuration are intentionally excluded.
- Any provider-specific integrations that are not part of the public release should be treated as unavailable in this repository.

## Project Scope

MyGPASS is maintained as a practical full-stack application with a focus on:

- clear separation between frontend, API, services, and data access
- secure authentication and authorization
- maintainable application structure
- testable code
- safe public-source publishing

The public repository is a sanitized release/demo project and should not be treated as a copy of any private/internal repository.
