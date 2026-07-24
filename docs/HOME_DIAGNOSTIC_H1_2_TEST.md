# Home Diagnostic Funnel H1.2 — Live Test Checklist

## 1. Runtime migration

- [ ] Run `installAdmissionLeadDiagnosticSystem()` successfully.
- [ ] Confirm the original lead rows still exist.
- [ ] Confirm `ADMISSION_LEADS` has 25 headers.
- [ ] Confirm the seven H1.2 columns are appended after `followUpDate`.

## 2. Authoring API

- [ ] Deploy `public_diagnostic.gs` and both new route entries.
- [ ] Confirm a chapter with at least three published valid MCQs starts a diagnostic.
- [ ] Confirm an unpublished/empty chapter shows a friendly unavailable message.
- [ ] Confirm the `getPublicDiagnostic` browser response does not contain `correctOption`.
- [ ] Confirm submitting answers returns a server-calculated score.
- [ ] Confirm an expired session asks the visitor to start again.

## 3. Dependent selector

- [ ] On first load, only Class is usable after the catalogue loads.
- [ ] Select Class; Board becomes available.
- [ ] Select Board; Medium becomes available.
- [ ] Select Medium; Subject becomes available.
- [ ] Select Subject; Chapter loads from the API.
- [ ] Select Chapter; Start Diagnostic becomes enabled.
- [ ] Change an earlier selector and confirm all later selectors reset.
- [ ] Confirm unavailable combinations are not shown.

## 4. Test runner and result

- [ ] Questions display one at a time with four options.
- [ ] Previous/Next navigation preserves answers.
- [ ] Unanswered-submit warning works.
- [ ] Score, correct, wrong, unanswered and weak topics display correctly.
- [ ] Restart returns to the selector and preserves the current catalogue.
- [ ] Mathematics/chemistry notation renders where applicable.

## 5. Diagnostic lead capture

- [ ] Enter student name and a valid parent mobile number.
- [ ] Check contact consent and submit.
- [ ] Confirm one new `ADMISSION_LEADS` row is created.
- [ ] Confirm `source` is `DIAGNOSTIC_TEST`.
- [ ] Confirm class, board, medium, subject, chapter ID/name and result fields are saved.
- [ ] Confirm the server recomputes `diagnosticPercent` from score/total.
- [ ] Confirm the WhatsApp message includes chapter, score and focus topics.

## 6. Admin panel

- [ ] Open Admin Dashboard → Admission Leads.
- [ ] Confirm the diagnostic lead card shows chapter, result and focus topics.
- [ ] Confirm search finds the lead by chapter or focus topic.
- [ ] Confirm Call, WhatsApp, status, notes, demo date and follow-up date still work.
- [ ] Confirm updating the lead changes the same row and creates no duplicate.

## 7. Regression

- [ ] Existing free-demo enquiry works.
- [ ] Existing H1.1 lead-management workflow works.
- [ ] Student login and signup work.
- [ ] Student session and redirect behaviour remain unchanged.
- [ ] Homepage menu, Call and WhatsApp controls work on mobile.
- [ ] Desktop and mobile layouts have no overlap or horizontal scrolling.

## Automated validation completed before packaging

- JavaScript syntax checks: passed.
- HTML duplicate-ID and local-reference audit: passed.
- Desktop dependent-selector/test/result/lead flow: passed.
- Mobile diagnostic entry and selector rendering: passed.
- Public API sample contains no answer key: passed.
- Server-side scoring, weak-topic and expiry logic: passed.
- Runtime 25-column migration/result serialization and server percent recomputation: passed.

Final status remains **development-tested** until the live Apps Script and GitHub checklist above is completed.
