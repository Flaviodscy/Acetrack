# AceTrack Phase 1

Mobile-first tennis scoring prototype built frontend-only with React, Vite, mock data, and a standalone tennis scoring engine.

## Backend Direction

Start frontend-only for Phase 1. Add a backend after the scoring and match-history UX feels right.

Firebase is the better first backend fit for AceTrack if the next step is quick auth, realtime live scoring sync, Firestore match records, and future storage for highlight clips. Supabase is a strong option if relational ladders, rankings, and analytics-heavy match queries become the core product. For this MVP, Firebase is likely faster and simpler; Supabase may be worth revisiting before building the social ladder deeply.

The app now includes a backend repository layer. It saves match records locally by default and automatically uses Firebase Firestore when the `VITE_FIREBASE_*` values are configured.

## Firebase Setup

1. Create a Firebase web app (or use the existing `acetrack-flavio` project).
2. Copy `.env.example` to `.env.local`.
3. Fill in both `VITE_FIREBASE_*` and `EXPO_PUBLIC_FIREBASE_*` with the same Firebase web config.
4. Enable Firestore and Auth (anonymous + email/password) in Firebase Console.
5. Restart the dev server.

Config is loaded from `src/config/firebaseEnv.ts`. Hardcoded credentials were removed from source — use `.env.local` locally and CI/hosting env vars in production.

Initial Firestore collection:

- `users/{userId}/matches/{matchId}`: saved match recap records from the Match Complete screen.

Auth:

- Anonymous auth is enabled for the MVP so players can save matches without a signup wall.
- Email/password auth is enabled for the next profile/account step.
- Firestore rules currently require `request.auth.uid` to match the user document path.

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
