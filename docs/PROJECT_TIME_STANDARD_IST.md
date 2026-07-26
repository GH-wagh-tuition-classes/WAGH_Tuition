# WAGH Tuition Classes — Project Date & Time Standard

## Locked standard

All current and future WAGH Tuition Classes modules must use:

- **Location:** Tapi, Gujarat, India
- **IANA time zone:** `Asia/Kolkata`
- **Display label:** India Standard Time (IST)
- **UTC offset:** UTC+05:30
- **Daylight saving:** None

This is a project implementation standard. It does not change the locked folder architecture.

## Source of truth

Server/API time is authoritative for:

- Daily Challenge date and schedule
- Test opening/closing windows
- Result and lead timestamps
- Follow-up due calculations returned by the backend
- Migration and access timestamps
- Cleanup expiry

The browser must not use UTC string slicing such as:

```javascript
new Date().toISOString().slice(0, 10)
```

Use `window.WTC_TIME` in browser code and the `wtcProject..._` helpers in Runtime Apps Script.

## Browser utility

File:

```text
assets/js/time.js
```

Common functions:

```javascript
WTC_TIME.todayKey();
WTC_TIME.nowStamp();
WTC_TIME.parse(value);
WTC_TIME.formatDate(value);
WTC_TIME.formatDateTime(value);
WTC_TIME.addDays(dateKey, days);
```

`Date.now()` remains valid for elapsed timers, cache age and opaque IDs because those represent an instant or duration, not a local calendar date.

## Runtime Apps Script utility

File:

```text
apps-script/1_runtime_app_script/datetime.gs
```

Common helpers:

```javascript
wtcProjectToday_();
wtcProjectNow_();
wtcProjectParse_(value);
wtcProjectTimeMs_(value);
wtcProjectAddDays_(dateKey, days);
wtcProjectDisplayDateTime_(value);
```

## Formats

- Internal date: `yyyy-MM-dd`
- Internal timestamp: `yyyy-MM-dd HH:mm:ss`
- Display: `dd MMM yyyy, hh:mm a IST`

API responses include `serverDate`, `serverTime`, `timezone` and `timezoneLabel` where routed through the central API envelope.

## Required platform settings

### Each Apps Script project

Set **Project Settings → Time zone** to:

```text
Asia/Kolkata
```

### Each Google spreadsheet

Set **File → Settings → Time zone** to:

```text
India — GMT+05:30
```

Run the safe Runtime audit when installing R2:

```javascript
installProjectDateTimeStandard()
```

It changes only reachable spreadsheet time-zone settings and reports any Apps Script project setting that still needs manual correction. It does not clear or rewrite workbook data.
