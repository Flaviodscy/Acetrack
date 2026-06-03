# AceTrack Phase 1

Mobile-first tennis scoring prototype built frontend-only with React, Vite, mock data, and a standalone tennis scoring engine.

## Backend Direction

Start frontend-only for Phase 1. Add a backend after the scoring and match-history UX feels right.

Firebase is the better first backend fit for AceTrack if the next step is quick auth, realtime live scoring sync, Firestore match records, and future storage for highlight clips. Supabase is a strong option if relational ladders, rankings, and analytics-heavy match queries become the core product. For this MVP, Firebase is likely faster and simpler; Supabase may be worth revisiting before building the social ladder deeply.

## Run

```bash
npm install
npm run dev
```

## Verify

```bash
npm test
npm run build
```
