# Certificate Platform MVP — Roadmap

## Backend
- [ ] Schema: profiles, user_roles (admin/organizer/viewer), organizations, members, events, templates, participants, certificates, delivery_logs, audit_logs
- [ ] RLS + grants, public verification function for anon
- [ ] Demo/sample data seeded in migration
- [ ] Storage bucket for template backgrounds/logos
- [ ] Scheduled bulk sending (cadence per event) via cron -> public API route

## Frontend
- [ ] Landing page, auth (email/password + Google)
- [ ] Dashboard with stats
- [ ] Organizations & events CRUD
- [ ] Participants: CSV import with required-field validation, mapping preview, row-level errors, block generation until valid
- [ ] Manual participant entry, filters, search
- [ ] Template designer: drag-and-drop text/images/dynamic fields, field mapping
- [ ] Certificate generation with unique verification IDs + QR
- [ ] Delivery status tracking, resend, bulk send, schedule settings
- [ ] Public verification page (validity + event/recipient details)
- [ ] Admin audit log view
- [ ] PWA manifest + service worker, responsive polish
