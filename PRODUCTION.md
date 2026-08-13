# Production Readiness Checklist

## Build
- `npm run build` succeeds, dist/ generated
- Vite + TypeScript no errors

## Environment
- Copy `.env.example` to `.env.local` and fill `VITE_FIREBASE_*`
- Enable Firestore rules in production project
- Enable anonymous and email/password auth in Firebase Console

## Expo / iOS
- `eas.json` configured for production auto-increment
- `app.json` bundleIdentifier `com.acetrack.app` set
- Run `eas build --platform ios --profile production`
- Test Apple Watch connectivity on device

## Web Hosting
- Firebase Hosting: `firebase deploy --only hosting`
- Set `VITE_*` env vars in hosting config or use `.env.production`

## Monitoring
- Add Sentry / error logging before launch
- Enable Firestore security rules tests

## UX
- Live Match tap targets >=44px, server badge prominent
- Mobile layout hides duplicate tables

Completed: 2026-08-13
