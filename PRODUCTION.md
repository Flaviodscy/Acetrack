# AceTrack Production Guide

Last updated: 2026-08-13

## What is ready now

- Web build: `npm run build` (Vite + TypeScript)
- Tests: `npm test`
- Firebase project: `acetrack-flavio`
- Shared env loader: `src/config/firebaseEnv.ts` (reads `VITE_*` for web and `EXPO_PUBLIC_*` for Expo)
- Mobile profile hook: `src/hooks/usePlayerProfile.ts` (Firebase + local cache)

## 1. Environment

Copy the example file and fill in your Firebase web app config:

```bash
cp .env.example .env.local
```

Both prefixes are required because web and mobile use different bundlers:

- `VITE_FIREBASE_*` → Vite web app
- `EXPO_PUBLIC_FIREBASE_*` → Expo / React Native app

Restart the dev server after editing env files.

## 2. Firebase Console checklist

In [Firebase Console](https://console.firebase.google.com/) for `acetrack-flavio`:

1. Enable **Firestore**
2. Enable **Authentication** → Anonymous + Email/Password
3. Add your hosting domain under Auth → Settings → Authorized domains (include `localhost` for dev)

## 3. Deploy web (Firebase Hosting)

Log in once, then deploy:

```bash
npx firebase login
npm run build
npx firebase deploy --only hosting,firestore:rules
```

Live URL after deploy: `https://acetrack-flavio.web.app`

If deploy fails with `401`, run `npx firebase login` again and retry.

## 4. Deploy mobile (Expo / EAS)

Install EAS CLI and link the project:

```bash
npm install -g eas-cli
eas login
eas init
```

Fix Expo dependency versions (recommended before first build):

```bash
npx expo install --check
```

Build for iOS:

```bash
eas build --platform ios --profile production
```

Build for Android:

```bash
eas build --platform android --profile production
```

Submit to stores:

```bash
eas submit --platform ios
eas submit --platform android
```

## 5. Run locally

**Web**

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`

**Mobile**

```bash
npm start
```

Then press `i` for iOS simulator or scan the QR code with Expo Go.

## 6. Architecture notes

AceTrack currently has two frontends sharing the same backend layer:

| Platform | Entry | UI |
|----------|-------|-----|
| Web | `src/main.tsx` → `src/App.tsx` | Full-featured monolith (~6,900 lines) |
| Mobile | `App.js` → `src/navigation/RootNavigator.tsx` | Tab screens in `src/screens/` |

Shared backend modules live in `src/backend/`:

- `authRepository.ts` — anonymous + email auth
- `matchRepository.ts` — match history (Firestore or localStorage)
- `profileRepository.ts` — player profiles
- `socialRepository.ts` — friends, messages, ladder

Next unification step: extract web screens out of `App.tsx` into `src/screens/` to match the mobile structure.

## 7. Pre-launch UX checks

- Live Match tap targets ≥ 44px
- Profile saves sync to Firestore when signed in
- Match Complete screen writes to `users/{uid}/matches/{matchId}`
- Test on a real phone before App Store submission
