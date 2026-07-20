# WAGH Tuition Classes — Teacher Dashboard Phase 2.5B v1.0

## Added

- Verified per-student analytics report.
- Server-side assignment-scope check before returning a student report.
- Chapter-level attempts, average, best, latest, trend and progress.
- Completed, in-progress and not-started chapter counts.
- Full read-only student test history with attempt numbering.
- Class-level chapter analytics.
- Weak-area detection for no attempts, average below 60%, declining trend, repeated low chapter scores and inactivity.
- Performance labels: Excellent, Good, Needs Attention, Critical and No Activity.
- Student, chapter, result and trend filters.
- Responsive Student Analytics detail panel.
- New read-only Runtime actions:
  - `teacherGetStudents`
  - `teacherGetStudentReport`
  - `teacherGetStudentTestHistory`
  - `teacherGetChapterAnalytics`
  - `teacherGetAttentionStudents`

## Preserved

- Phase 2.5A Teacher role guard and active-account validation.
- Existing `teacherDashboard` action name.
- Existing Teacher assignment model using `className` and `subject`.
- Student mobile masking.
- Admin-controlled content publishing.
- Student/Admin portals and all existing APIs.
- Locked folder and workbook architecture.

## Not included

- Marks editing.
- Student profile editing.
- Teacher content publishing.
- New Sheets or columns.
- Formal Teacher-to-student assignment mapping.
- Phase 2.5C class reports/export.
- Skipped AI Pipeline Reliability v1.5.5.
