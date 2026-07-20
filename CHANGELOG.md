# Changelog — Phase 2.5F v1.0

## Teacher Portal

- Added Assign Tests and Sent Tests navigation.
- Added searchable published-test library.
- Added Quick Assign to All.
- Added selected, attention and no-previous-attempt send modes.
- Added due date, maximum attempts and Teacher message options.
- Added sent-test overview, completion metrics and exact student report.
- Added pending cancellation, CSV export and printable report.
- Preserved all Phase 2.5A–2.5E analytics and browser-local Follow-up Centre.

## Student Portal

- Added an injected Assigned Tests dashboard widget and modal.
- Added pending, overdue and completed states.
- Added exact assigned-test launch with attempt-limit enforcement.
- Added a reusable assigned MCQ runner with question palette, timer, review,
  result display, explanations and automatic save.

## Runtime

- Added modular `test_assignments.gs`.
- Added safe migration `installTestAssignmentSystem()`.
- Added `TEST_ASSIGNMENTS`.
- Added optional `assignmentId` to `TEST_RESULTS` and `MCQ_ATTEMPTS`.
- Added eight API actions for Teacher assignment, Student delivery and result save.
- Added strict published-test and Teacher/Student scope checks.
- Added deterministic idempotency for assignment and result writes.
- Added server-side score recalculation from published MCQ rows.
- Added exact assignment analytics and non-destructive cancellation.

## Unchanged

- Authoring Apps Script code and deployment.
- Existing static MCQ pages and shared Static MCQ Engine.
- Existing dynamic MCQ renderer and current result actions.
- Student profile approval system.
- Admin dashboard and content publishing workflow.
- Stable WAGH Tuition environment.
