# Admin Organization Settings

## Component
- File: `src/features/admin/SettingsScreen.jsx`
- Export: `SettingsScreen`
- Rendered from: `FeatureRenderer` when `activeRole === "admin"` and `activeScreen === "settings"`.

## Purpose
Organization settings groups tenant-level controls: users and roles, publishing, domains, branding, and audit-related administration.

## Primary Users
- Tenant admin
- Organization owner

## User Flow
1. Admin opens organization settings.
2. Admin reviews users and access state.
3. Admin checks private URL and custom domain state.
4. Admin can identify pending access or DNS issues.

## Visible Sections
- Settings navigation.
- Users and access table.
- Private URL card.
- Custom domain card.

## Interaction Contract
- Settings navigation is static in the mockup.
- User rows show role and status.
- Domain cards show publication or verification state.

## Data Requirements
- Tenant users.
- Roles and invitation status.
- Private tenant URL.
- Custom domain verification state.
- Optional SSO/SAML configuration state.

## Implementation Notes
- Real implementation should separate settings subroutes.
- Role changes should require confirmation and permission checks.
- Domain verification should expose DNS records and verification retry status.

## Acceptance Criteria
- Users and roles are visible.
- Active, pending, and restricted states are distinct.
- Domain publication state is visible.
