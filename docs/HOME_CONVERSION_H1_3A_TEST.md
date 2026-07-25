# Home Page H1.3A — Test Report & Live Checklist

## Automated validation completed

- JavaScript syntax: Passed
- Apps Script syntax: Passed
- Duplicate HTML IDs: Passed
- Local asset references: Passed
- Dependent diagnostic selector and test flow: Passed
- Personalized performance report rendering: Passed
- Campaign attribution payload: Passed
- Report-to-signup prefill: Passed
- Admin summary, overdue filter and diagnostic report rendering: Passed
- Public response answer-key protection: Passed
- Server percentage recalculation and performance classification: Passed
- 37-column additive schema validation: Passed

The remaining checks require your deployed development URLs and Google Sheets.

## Diagnostic report

- [ ] Complete a chapter diagnostic.
- [ ] Verify score ring, performance level, strong topics, focus topics and time used.
- [ ] Verify the recommended plan changes according to score.
- [ ] Tap **Get Report & Book Free Demo** and confirm the form is focused.
- [ ] Submit a report request and confirm a new ADMISSION_LEADS row.
- [ ] Verify server-calculated percentage and performance level.
- [ ] Tap **Send Full Report on WhatsApp** and verify the full report text.
- [ ] Tap **Create Student Account** and confirm class, board, medium and student name are prefilled.

## Campaign attribution

- [ ] Open the homepage with `?utm_source=instagram&utm_medium=reel&utm_campaign=test_h13a`.
- [ ] Submit a demo enquiry and a diagnostic report.
- [ ] Confirm `trafficSource`, `campaign`, `campaignMedium` and `landingPage` are saved.
- [ ] Reopen the homepage without parameters and confirm first-touch attribution remains available for up to 30 days.

## Admin conversion panel

- [ ] Load leads using the Admin password.
- [ ] Verify total, new, due today, overdue, demo booked, joined, conversion and reports requested.
- [ ] Verify top traffic source and top campaign.
- [ ] Filter diagnostic reports, campaign, overdue and due-today leads.
- [ ] Open WhatsApp report and verify no other parent data is exposed.
- [ ] Update status, follow-up date and notes; confirm the same sheet row updates.
- [ ] Confirm `lastContactedAt` and `conversionUpdatedAt` are populated.

## Regression

- [ ] Student login and signup still work.
- [ ] H1.0 demo enquiry still saves.
- [ ] H1.1 Admin lead updates still work.
- [ ] H1.2 diagnostic selector and server-side scoring still work.
- [ ] Mobile menu, Call and WhatsApp controls still work.
