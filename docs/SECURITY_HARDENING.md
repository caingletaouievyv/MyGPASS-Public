# Public Repository Security Hardening

**Status:** Remediation changes ported from the private MyGPASS repository; independent validation is pending.

## Changes included in this branch

- API Kestrel server header disabled.
- API responses remove `Server` and `X-Powered-By` where the application controls the response.
- API response headers include `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, and `Cache-Control: no-store`.
- API HSTS is configured for non-development HTTPS responses.
- Frontend Express disables its `X-Powered-By` header and adds `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and HSTS on requests Express recognizes as HTTPS.
- SSR HTML receives a per-response nonce-based Content Security Policy and matching nonces for inline scripts/styles and the Angular root.
- A CSP/header smoke-test script and HTML nonce unit tests were added. An API security-header test was added.

## Public-environment boundary

The CSP in this public repository allows the local API origin `https://localhost:5001`, matching the current public repository's production environment configuration. It intentionally does not copy the private production API origin. If a hosted public demo is configured later, update and test the CSP against that explicitly approved public API origin.

## Findings that still need separate verification

- Cookie SameSite findings are not safely fixed by blindly setting attributes in application code. Identify each cookie issuer first. Hosting-generated affinity cookies require the relevant hosting configuration; the public project currently documents no hosted demo.
- Headers added by a proxy, IIS, CDN, or hosting platform must be checked on the actual deployed response.
- These source changes do not prove that all eight baseline findings pass, do not prove deployment, and do not constitute VAPT certification.

## Required validation before describing the public version as VAPT-remediated

1. Run `npm ci`, `npm run build`, `npm run test`, and `npm run test:csp` from `frontend/mygpass-client`.
2. Run `dotnet build backend/MyGPASS.Api/MyGPASS.Api.csproj --nologo` and `dotnet test backend/MyGPASS.Api.Tests/MyGPASS.Api.Tests.csproj --nologo`.
3. Review failures and fix regressions before merge.
4. After any authorized deployment, capture raw responses for the exact in-scope URLs and verify headers, cookies, redirects, and content types at the deployed edge.
5. Use an authorized independent assessment/remediation validation to support any claim that the public deployment passed VAPT.
