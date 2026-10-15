# VAPT Handoff and Validation Runbook

This repository is a public source snapshot for the approved user-facing MyGPASS VAPT preparation. Follow the [VAPT scope checklist](VAPT_CHECKLIST.md) before testing.

## Before handing this to VAPT

1. Confirm the 11-page scope against the actual UAT/PROD release.
2. Obtain written authorization, approved URLs/API base URLs, testing dates/hours, source IPs, and escalation contacts from the environment owner/coordinator.
3. Deliver approved test accounts through an approved secure channel. Never add passwords, tokens, or recovery codes to this repository.
4. Keep Admin User Maintenance and Admin Schedule Maintenance excluded from UAT/PROD and from this agreed test scope unless the owner approves a scope change in writing.
5. Confirm whether WAF/IDS/IPS/CDN/proxy/load balancer and access restrictions exist and whether they are included in the engagement.
6. Record all validation results. Do not label this repository or any environment “VAPT-passed” based only on compilation or automated tests.

## Frontend checks

Use a clean checkout with the Node.js/npm versions supported by the project:

```powershell
cd frontend/mygpass-client
npm ci
npm test
npm run build
```

## Backend checks

From the repository root with the .NET 10 SDK installed:

```powershell
dotnet restore "backend\MyGPASS.Api\MyGPASS.Api.csproj"
dotnet build "backend\MyGPASS.Api\MyGPASS.Api.csproj" --no-restore --nologo
dotnet test "backend\MyGPASS.Api.Tests\MyGPASS.Api.Tests.csproj" --nologo
```

If tests require database configuration, use a disposable/local test database and documented non-production settings. Never point test suites at PROD.

## Dependency/security checks

Run from a clean checkout and retain the tool output in the internal engagement record:

```powershell
# Frontend dependency audit
cd frontend/mygpass-client
npm audit --omit=dev

# Backend package vulnerability report (from repository root)
dotnet list "backend\MyGPASS.Api\MyGPASS.Api.csproj" package --vulnerable --include-transitive
```

Review the complete output; a command completing successfully is not by itself proof of security. Resolve or formally assess findings before handoff. Use the organization's approved secret-scanning tool and inspect tracked files/configuration for accidental secrets. Do not paste discovered secrets into issues, logs, or reports.

## Record results

For each command, record date/time, commit SHA, tool/runtime versions, exit code, relevant output, and any approved exceptions. This documentation does not claim that these commands have already been run in this environment.

## Scope caution

The frontend routes are limited to the agreed user-facing pages. The backend source may contain operations that are not part of the 11-page engagement; only test endpoints covered by the approved written scope. The presence of an endpoint in source is not authorization to test it.
