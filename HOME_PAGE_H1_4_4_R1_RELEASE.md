# WAGH Tuition Classes — H1.4.4-R1 Targeted Test Clean Runner

**Release type:** Frontend-only development interaction patch  
**Base:** H1.4.4 Full-Screen Free Tests & Inline Student Login  
**Production baseline:** `WTC-H1.3C-PROD-LOCK-20260727-R1`  
**Architecture:** LOCKED v2.3.1 R2 — unchanged  
**Time standard:** Tapi, Gujarat, India — `Asia/Kolkata` / IST

## Purpose

After a visitor starts the Targeted Test, the full-screen experience now becomes a focused question runner instead of keeping the chapter-selection introduction above the questions.

## Behaviour

- The introduction heading and dark instruction card remain visible during chapter selection.
- When the question panel opens, the introduction is hidden automatically.
- The active test workspace expands to the available width and begins directly below the fixed toolbar.
- When the result panel opens, the introduction remains hidden so the report is the only main content.
- Selecting **Try another chapter** restores the original introduction and selector automatically.
- Each state change resets the Targeted Test content scroll to the top.

## Architecture safety

The patch observes the existing selector, test and result panels. It does not replace `home-diagnostic.js`, alter questions, expose answer keys, change scoring or modify any API route.

## Exact functional files to replace

```text
index.html
assets/css/main.css
assets/js/main.js
```

## Do not change

```text
assets/js/home-diagnostic.js
assets/css/home-diagnostic.css
assets/js/assessment-api.js
assets/js/assessment-config.js
apps-script/
Google Sheets
Script Properties
Apps Script deployments or URLs
assets/fonts/
```

## Deployment

1. Back up the WAGH Tuition Classes development repository.
2. Upload the three functional files using their exact paths.
3. Wait for GitHub Pages to publish.
4. Close and reopen the browser tab or perform one hard refresh.
5. Complete `docs/HOME_PAGE_H1_4_4_R1_TEST.md`.

Test in development before any controlled stable promotion.
