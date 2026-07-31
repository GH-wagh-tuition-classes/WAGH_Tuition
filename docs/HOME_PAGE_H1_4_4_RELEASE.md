# WAGH Tuition Classes — H1.4.4 Full-Screen Free Tests & Inline Student Login

**Release type:** Frontend-only development hotfix/interaction patch  
**Base:** H1.4.3 Homepage Interaction Consolidation  
**Referral base:** tested H1.4.1  
**Production baseline:** `WTC-H1.3C-PROD-LOCK-20260727-R1`  
**Architecture:** LOCKED v2.3.1 R2 — unchanged  
**Time standard:** Tapi, Gujarat, India — `Asia/Kolkata` / IST

## Purpose

H1.4.4 corrects the Daily Chapter Challenge popup readability, adds Student-only login inside the same challenge screen, and makes both Free Test experiences use the full available browser viewport.

## Changes

### Full-screen Free Test experiences

- Daily Chapter Challenge opens as a full-screen in-page experience on mobile, tablet and desktop.
- Targeted Test opens in the same full-screen format.
- Each experience uses a fixed top toolbar and its own scrollable content area.
- The homepage remains behind the experience without background scrolling.
- The homepage Call/WhatsApp/Free Test bar and floating WhatsApp control are hidden while a Free Test is open.
- `100dvh` and safe-area spacing are used for modern Android browsers.
- Close, Escape and browser/Android Back behaviour from H1.4.3 are preserved.

### Daily Challenge visibility correction

- Restored the dark challenge background inside the full-screen experience.
- Restored white heading text, warm high-contrast paragraph text and readable rule badges.
- Preserved the white status card and its existing challenge-state colours.

### Student-only login inside Daily Challenge

- `Login to Join` opens a compact login form inside the current Daily Challenge screen.
- The login form contains only Student mobile number and password.
- No Teacher, Admin or Parent role selector is shown.
- The request is forced to role `Student` and the returned session is checked again before storage.
- Successful login does not navigate to the Student Portal.
- The challenge status reloads inside the same full-screen experience.
- Normal homepage Login behaviour remains backward compatible and continues redirecting by role.

## Existing behaviour preserved

- Daily Challenge opening, timing, one-attempt rules, private leaderboard and IST schedule.
- Daily Challenge separation from Student Progress and academic results.
- Targeted Test chapter selection, question flow, report and lead capture.
- `#daily-challenge` and `#diagnostic` deep links.
- H1.4.1 referral attribution and H1.4.3 homepage layout.
- Runtime and Authoring Apps Script, Google Sheets and API routes.

## Exact functional files to replace

```text
index.html
assets/css/main.css
assets/css/home-daily-challenge.css
assets/js/main.js
assets/js/auth.js
assets/js/home-daily-challenge.js
```

## Deployment

1. Back up the development GitHub repository.
2. Upload the patch files using their exact paths.
3. Do not change Apps Script, Google Sheets, Script Properties, deployments, triggers, `config.js`, `assessment-config.js` or `assets/fonts/`.
4. Wait for GitHub Pages to publish.
5. Close and reopen the browser tab or perform one hard refresh.
6. Complete `docs/HOME_PAGE_H1_4_4_TEST.md`.

H1.4.4 remains a development release until the live checklist passes.
