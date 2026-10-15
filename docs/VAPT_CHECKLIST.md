# MyGPASS VAPT Scope Checklist

**Status:** Draft for authorized VAPT coordination  
**Scope baseline:** The 11 user-facing pages/modules agreed for the current UAT/PROD version.  
**Important:** This checklist defines scope; it is not evidence that testing has passed or that any environment is secure.

## 1. Target environment details — fill in through the approved internal channel

| Item | Value |
|---|---|
| UAT frontend URL | To be supplied/confirmed by the authorized environment owner |
| UAT API base URL | To be supplied/confirmed by the authorized environment owner |
| PROD frontend URL | To be supplied/confirmed by the authorized environment owner |
| PROD API base URL | To be supplied/confirmed by the authorized environment owner |
| Approved testing window / timezone | To be confirmed by the VAPT coordinator |
| VAPT contact / escalation contact | To be confirmed |
| Written authorization / ticket reference | To be recorded by the coordinator |

Do not guess URLs or test production endpoints until the environment owner and VAPT coordinator have confirmed the targets and written authorization.

## 2. Agreed 11-page/module checklist

Mark each item only after the VAPT team confirms the actual target page and records its test result.

- [ ] 1. Login
- [ ] 2. Register
- [ ] 3. Forgot Password
- [ ] 4. Reset Password
- [ ] 5. Verify Email
- [ ] 6. Booking Route Selection
- [ ] 7. Booking Details
- [ ] 8. Payment (demo/testing flow only; no real-money payment gateway is represented by this public demo)
- [ ] 9. Pass / QR Confirmation
- [ ] 10. Account
- [ ] 11. History

## 3. API and application behavior supporting these pages

The VAPT team should test the API routes and authorization/data-access behavior that directly support the 11 in-scope modules, within the approved target environment and testing window. Record endpoint-level findings in the team's report.

## 4. Exclusions and boundaries

- Admin User Maintenance and Admin Schedule Maintenance are excluded from the agreed 11-page scope.
- Do not deploy or enable those admin UI pages in UAT or PROD as part of this VAPT preparation.
- Administrative API operations and any unrelated internal endpoints are out of scope unless the system owner and VAPT coordinator explicitly approve them in writing. Their presence in source code is not authorization to test them.
- Email Notification Service is excluded from this test engagement.
- The public repository's payment flow is a demo/testing flow, not a live production payment gateway. Do not initiate real-money transactions.
- Infrastructure components such as WAF, IDS/IPS, CDN, reverse proxy, load balancer, and special access controls are not confirmed by this repository; the environment owner must confirm their presence and whether they are in scope.

## 5. Approved test accounts

The environment owner/coordinator must provide approved test accounts and role/access details directly to the VAPT team through an approved secure channel.

- Do not commit usernames, passwords, recovery codes, tokens, or other secrets to this public repository.
- Do not use real customer accounts or data.
- If separate guest, standard-user, or privileged test identities are approved, document the account purpose and permissions in the private engagement record, not here.
- Do not create or use administrator accounts without explicit authorization.

## 6. Testing window and safety

- Confirm the exact testing dates, timezone, permitted hours, source IPs, and escalation path before starting.
- Resolve the engagement's permitted-hours discrepancy with the VAPT coordinator before testing: earlier coordination notes mentioned a weekend restriction and weekday testing from 08:00–17:00. This document does not choose or authorize a window.
- Avoid destructive testing, denial-of-service activity, bulk messaging, real payment activity, and tests against third-party systems unless explicitly authorized.
- Stop and notify the coordinator if testing affects availability, exposes real personal data, or appears to change production records unexpectedly.

## 7. Evidence and reporting

For each finding, record the target environment, timestamp/timezone, affected page or endpoint, prerequisites/role, safe reproduction steps, expected vs. actual result, impact, and redacted evidence. Do not include passwords, tokens, or unnecessary personal data in the report.

## 8. Readiness gates

- [ ] Environment owner confirms UAT and PROD URLs/API base URLs.
- [ ] VAPT coordinator confirms written authorization, scope, source IPs, testing window, and escalation contacts.
- [ ] Approved test accounts are delivered privately to the VAPT team.
- [ ] VAPT team confirms the 11-page baseline matches the environment being tested.
- [ ] Admin User Maintenance and Admin Schedule Maintenance remain excluded and are not deployed/enabled in UAT or PROD.
- [ ] Frontend/backend build and automated test results are recorded from a clean checkout of this repository.
- [ ] Dependency and source security checks are run and their output reviewed.
- [ ] Environment owner confirms relevant infrastructure protections and access restrictions.

**Readiness status:** Not yet confirmed. URLs/accounts are intentionally not published here, and build/test/security checks must be run in a suitable environment before this repository is described as validated for VAPT.
