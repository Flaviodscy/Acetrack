# AceTrack Product And UI Standards

AceTrack should feel real, reliable, minimal, premium, and consistent.

## Product Truth

- Do not invent users, nearby players, friends, match history, highlights, rankings, or challenges.
- If real data does not exist, show a clear empty state such as "Nobody in your area yet" or "No saved matches yet."
- Nearby players must come from real GPS-enabled AceTrack users only.
- Match points, match level, and player progress must be earned from saved match data, not manually edited.
- Skills can be self-set, then adjusted by post-match opponent feedback.
- A player should not vote for their own skills. Post-match feedback must clearly distinguish "opponent votes for you" from "you vote for opponent."
- Challenges, pokes, friend requests, and share cards must perform real actions, not just show placeholder messages.

## Visual Direction

- Mobile-first, responsive on all phone sizes, and spacious on desktop.
- Minimal, clean, premium, pastel, with tennis-ball green accents.
- Use generous white space, readable hierarchy, soft cards, and thin tennis-court line graphics.
- Avoid heavy borders, crowded controls, overlapping text, and tiny tap targets.
- Cards should be soft and functional, not decorative clutter.
- Buttons must look consistent across the app and clearly communicate their action.
- Every page should have readable spacing, no clipped cards, no hidden bottom navigation, and no text overflow.
- List rows and social cards must never squeeze names, ratings, XP text, or status copy into unreadable columns. If actions do not fit beside identity/content, stack actions below the content with full-width tap targets.
- Page headings must never be clipped by the top edge, browser chrome, phone frame, or responsive viewport. Keep enough top padding and verify the first line is fully visible.
- Cards must reveal all of their content. Do not allow buttons, pills, tabs, avatars, charts, or generated share cards to overlap section headings or neighboring cards.

## Screen Expectations

- Home should show real pending challenges as a clear card/banner with Accept and Dismiss.
- Match setup and live scoring should be usable in portrait and landscape.
- Singles match setup must show only two player fields. Do not render disabled or empty partner boxes unless doubles is selected.
- Live Match should prioritize tripod use: big readable score, simple point controls, correct serving side, and a clean full-screen landscape layout.
- Match Cards should use real saved match data and produce a shareable social card.
- Social should support real nearby discovery, friend requests, friends, pokes, and challenges.
- Profile should show earned points, match level, skills, vote counts, and editable identity/equipment.
- Admin should manage real profiles without fake seed users.

## QA Checklist

- Check Home, Match Setup, Live Match, Match Complete, Match Cards, Social, Profile, Account, and Admin after meaningful changes.
- Verify key buttons by clicking them where possible.
- Verify mobile spacing and desktop responsive layout at narrow phones, large phones, responsive tablet widths, and desktop. Specifically check that social request/friend cards, match cards, and bottom navigation do not overlap or hide content.
- Run `npm test` and `npm run build`.
- Deploy Firebase Hosting and Firestore rules when frontend or rules change.
