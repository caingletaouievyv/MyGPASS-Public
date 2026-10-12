# Automated VAPT-Oriented Source-Code Analysis

## Purpose and limits

This guide describes repeatable, repository-level checks that help identify common security weaknesses before a formal Vulnerability Assessment and Penetration Testing (VAPT) engagement.

These checks are **static/dependency analysis and build/test verification**, not penetration testing. A successful run does not prove that the application is secure and is not a claim of VAPT compliance, certification, or approval.

Only scan repositories, systems, and environments for which you have authorization. Do not run active security tests against production or UAT unless the system owner and assessment team have explicitly approved the scope, test accounts, timing, and exclusions.

## Application areas to review

For this Angular and ASP.NET Core application, source-code analysis should pay particular attention to:

- Authentication and JWT validation, including token lifetime and current user/account state.
- Authorization on every sensitive endpoint and object-level ownership checks.
- Guest booking access tokens: entropy, hashing at rest, expiration, revocation, and resource ownership.
- Input/DTO validation, request-size limits, and safe handling of invalid identifiers and dates.
- Authentication and anonymous-resource rate limiting.
- Booking, payment, and QR-code concurrency and state transitions.
- CORS and host filtering, security headers, and production error responses.
- Logging and redaction of credentials, tokens, personal data, and exception details.
- Database access permissions, parameterized data access, and database-enforced uniqueness.
- Dependency vulnerabilities, committed secrets, unsafe configuration, and accidental exposure of development-only endpoints.

The checklist above is a review guide, not a statement that every control is present or that every finding has been resolved. Verify each control against the current code and configuration.

## Repeatable local checks

Run commands from the repository root unless a step says otherwise. Install dependencies using the repository's lockfiles and use the supported Node.js and .NET SDK versions.

### 1. Frontend dependencies

```powershell
Set-Location "frontend\mygpass-client"
npm ci
npm audit
npm audit --omit=dev
npm run build
npm test
```

Review every reported advisory. Record the affected package, dependency path, severity, available fix, and whether the vulnerable code is reachable in this application. Do not blindly use `npm audit fix --force`; major-version changes can introduce breaking updates. If a command or test is unavailable in the current environment, record it as not run rather than as passed.

### 2. Backend dependencies and tests

From the repository root:

```powershell
dotnet restore "backend\MyGPASS.Api\MyGPASS.Api.csproj"
dotnet list "backend\MyGPASS.Api\MyGPASS.Api.csproj" package --vulnerable --include-transitive
dotnet build "backend\MyGPASS.Api\MyGPASS.Api.csproj" --no-restore
dotnet test "backend\MyGPASS.Api.Tests\MyGPASS.Api.Tests.csproj"
```

If the installed SDK does not accept the package-list syntax, check `dotnet list package --help` and use the equivalent supported syntax. Review transitive as well as direct dependencies. Do not describe a scan as clean if the scan failed, was skipped, or could not reach its advisory source.

### 3. Secrets and repository hygiene

Use an approved secret scanner, such as GitHub secret scanning or a locally installed tool, against the current branch and—where available—the repository history. Review findings manually and avoid copying secret values into reports or tickets.

At minimum, check that:

- Real credentials, signing keys, access tokens, and connection strings are not committed.
- Local settings and generated build output are excluded from version control where appropriate.
- Example configuration uses placeholders and clearly documents required environment-specific values.
- Sensitive values are not returned by APIs, written to logs, or embedded in frontend bundles.

If a real credential was committed, removing it from the latest file is not sufficient. Follow the credential owner's rotation/revocation procedure and the repository's incident-response process.

### 4. Static analysis and code review

Where repository tooling and permissions support it, enable a maintained static-analysis workflow such as GitHub CodeQL or an approved equivalent for C# and JavaScript/TypeScript. Review results on the pull request, triage true positives and false positives, and track accepted risks with an owner and rationale.

Manual review remains necessary for authorization decisions, object ownership, business-state transitions, cryptographic token handling, and configuration-dependent controls that automated rules may not understand.

### 5. Regression verification

For every security fix:

1. Add or update a focused regression test that demonstrates the vulnerable behavior is blocked.
2. Run the relevant frontend/backend tests.
3. Run the applicable production build and dependency checks.
4. Review the diff for unrelated changes, secrets, and weakened controls.
5. Record the command, result, date, commit, and any limitations.

A build passing is not equivalent to a security scan passing. A security scanner reporting no findings is not equivalent to a formal VAPT assessment.

## Findings and remediation record

For each finding, record:

| Field | What to capture |
|---|---|
| ID | Stable tracking identifier |
| Finding | Short, non-sensitive description |
| Source | Tool and rule/advisory identifier, or manual review |
| Severity | Tool rating plus validated application impact |
| Evidence | Minimal sanitized file/path/line reference; no secrets or personal data |
| Status | Open, in progress, fixed, deferred, accepted, or not applicable |
| Remediation | Specific code/configuration change or reason for deferral |
| Verification | Regression test and rescan result |
| Owner / date | Responsible role and review date |

Prioritize confirmed exploitable critical/high findings first, then consider exposure, exploitability, affected data, and compensating controls. Do not lower severity solely because a fix is inconvenient. Deferred or accepted risks should have an explicit owner, rationale, and review date.

## Before a formal VAPT engagement

- Obtain written approval for the exact target systems, environment, time window, test accounts, and exclusions.
- Confirm the assessment provider's source-code, dependency, and dynamic-testing scope.
- Coordinate infrastructure-specific questions with the system owner; do not infer WAF, IDS/IPS, CDN, load-balancer, or network controls from application code.
- Keep credentials out of source control and assessment notes.
- Preserve sanitized scan output and remediation evidence in the approved internal location.
- Re-test fixes and obtain the assessment owner's confirmation of closure.

Do not include private production URLs, real account details, credentials, internal network diagrams, or sensitive infrastructure configuration in public documentation.

## Current status

This document defines a repeatable process. It does not report a scan result, assert that a scan has been executed, or claim that the application has passed VAPT. Record actual run results separately, with the commit and tool versions used.
