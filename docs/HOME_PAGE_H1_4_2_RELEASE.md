# WAGH Tuition Classes — H1.4.2 Homepage QA & Conversion Polish

**Release type:** Frontend-only development patch  
**Base:** Tested H1.4.1 referral build  
**Production baseline:** `WTC-H1.3C-PROD-LOCK-20260727-R1`  
**Architecture:** LOCKED v2.3.1 R2 — unchanged  
**Time standard:** Tapi, Gujarat, India — `Asia/Kolkata` / IST

## Purpose

H1.4.2 resolves the homepage issues found during the live UI/functionality audit before the H1.4 production-lock step.

## Changes

### Login and signup routing

- `index.html#login` opens the Login tab and scrolls to Portal Access.
- `index.html#signup` opens Student Signup and scrolls to Portal Access.
- Existing `LOGIN_PAGE: '/WAGH_Tuition/index.html#login'` remains backward compatible.
- No `config.js` change is required.

### Header and responsive layout

- The full navigation is retained on wide desktop screens.
- A compact hamburger menu is used at crowded widths up to 1280px.
- The header container can use up to 1320px on wide screens.
- Hero content stacks at 1080px and below to avoid a cramped 1024px layout.

### Mobile conversion bar

- The Call / WhatsApp / Free Test bar hides while an input, select, textarea or editable field is focused.
- It restores after focus leaves the form control.
- Bottom placement respects mobile safe-area insets.

### Conversion copy and sharing metadata

- Daily Challenge text now explains the student benefit rather than Admin implementation.
- `General + WTC Students` is replaced by `Open to registered students`.
- Added canonical URL, `og:url`, absolute `og:image`, image alt text and Twitter/X card metadata for the stable homepage.
- Parent-section paragraph contrast is improved.

## Exact frontend files to replace

```text
index.html
assets/css/main.css
assets/js/main.js
```

## Documentation files

```text
CHANGELOG.md
README_FIRST.md
docs/ACTIVE_FILE_MANIFEST.md
docs/HOME_PAGE_H1_4_2_RELEASE.md
docs/HOME_PAGE_H1_4_2_TEST.md
docs/HOME_PAGE_H1_4_2_FILE_MANIFEST.txt
docs/HOME_PAGE_H1_4_2_VALIDATION.md
SHA256SUMS.txt
```

## Deployment

1. Back up the current development GitHub repository.
2. Upload the patch files using their exact paths.
3. Do not change `config.js`, `assessment-config.js`, API URLs, Script Properties, Apps Script deployments, triggers or workbooks.
4. Wait for GitHub Pages to publish.
5. Close and reopen the browser tab, or perform one hard refresh if the old CSS/JS remains cached.
6. Complete the H1.4.2 live checklist.

## Not changed

- Runtime Apps Script
- Authoring Apps Script
- Google Sheets or migrations
- Referral logic or privacy rules
- Daily Challenge backend
- Student/Teacher/Admin portal routes
- Authentication architecture
- Folder structure

H1.4.2 must pass live testing before H1.4.1/H1.4.2 is production-locked.
