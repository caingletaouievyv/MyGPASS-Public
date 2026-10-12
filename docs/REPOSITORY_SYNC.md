# Public Repository Sync Policy

**Last reviewed:** October 12, 2026

## Purpose

`MyGPASS-Public` is the sanitized public/demo counterpart to the private `MyGPASS` implementation repository. These repositories are maintained separately; do not assume that changes automatically sync between them.

## Source-of-truth boundaries

- **Private MyGPASS:** authoritative for internal implementation notes, deployment procedures, VAPT tracking, infrastructure details, and developer handoff.
- **MyGPASS-Public:** authoritative for its own public code, safe setup instructions, public-facing feature description, and tests that can be run from this repository.
- **GlobalPort:** authoritative for business/project knowledge and confirmed business decisions.

Keep confirmed, reusable application behavior aligned where it is suitable for public release. Do not copy private documents wholesale.

## Safe synchronization rules

1. Compare the relevant source files and tests in both repositories before syncing.
2. Sync only intentional, reviewed changes; do not mirror entire branches or repositories blindly.
3. Exclude credentials, secrets, private URLs/configuration, personal information, internal deployment paths, and private VAPT/operational documents.
4. Keep public setup and validation instructions accurate for this repository; do not document private deployment steps as public setup steps.
5. A source-code match or GitHub commit does not mean a feature has been approved for UAT/PROD or deployed there.
6. Preserve the public repository's independent history. Use a reviewed branch and pull request for documentation or code synchronization.

## Alignment review — October 12, 2026

The following frontend files were compared between the private and public repositories and had matching content at the time of review:

- `frontend/mygpass-client/src/app/app.routes.ts`
- `frontend/mygpass-client/src/app/features/booking/header/booking-header.component.html`
- `frontend/mygpass-client/src/app/app.spec.ts`

The Admin and Schedule Maintenance routes/navigation are present in both source trees. Their presence in source code is not a deployment approval or a claim that the features are currently enabled in UAT/PROD.

The private repository contains internal deployment documentation and `frontend/mygpass-client/public/web.config` for its IIS hosting arrangement. These are not copied into the public repository as part of this documentation-only alignment because public hosting details and deployment requirements must be independently confirmed for the public demo.

## Before publishing a public sync

- Review the changed-file list and diff.
- Confirm the change does not expose private configuration or infrastructure details.
- Run the frontend tests and production build; run backend tests/build too if backend files changed.
- Update the README if the public setup or advertised feature scope changes.
- Keep deployment verification separate from GitHub merge status.
