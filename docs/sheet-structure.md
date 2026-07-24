STUDENT_MASTER, TEACHER_MASTER, ADMIN_MASTER, SUBJECT_MASTER, CHAPTER_MASTER, CHAPTER_LIST, ACCESS_LOGS, TEST_RESULTS, PROGRESS_TRACKER, PARENT_ACCESS, GAMIFICATION_DATA


## PROFILE_CHANGE_REQUESTS

Additive runtime sheet for Student Profile Change Approval System v1.0.

Columns:

`requestId, studentId, studentName, currentMobile, requestedName, requestedMobile, currentBoard, requestedBoard, currentClassName, requestedClassName, currentMedium, requestedMedium, reason, status, requestedAt, reviewedBy, reviewedAt, adminRemarks, appliedAt, updatedAt`

Status values:

- `PENDING`
- `APPLIED`
- `REJECTED`
- `CANCELLED`

The safe `installProfileChangeApprovalSystem()` function creates only this missing sheet/columns and never clears populated data.


## ADMISSION_LEADS

Additive runtime sheet for the Home Page & Admission Funnel H1.0.

Columns:

`leadId, createdAt, studentName, parentMobile, className, board, medium, subject, preferredTime, source, status, notes, deviceId, pageUrl, consent, updatedAt`

Initial status:

- `NEW`

The safe `installAdmissionLeadSystem()` function creates only the missing sheet/header and never clears existing lead data.


## ADMISSION_LEADS H1.1 additions

The existing lead sheet is extended non-destructively with `demoDate` and `followUpDate`. Existing rows and columns remain unchanged.


## ADMISSION_LEADS — H1.2 extension

Existing H1.1 columns remain unchanged. The safe `installAdmissionLeadDiagnosticSystem()` migration appends only these missing columns:

`chapterId`, `chapterName`, `diagnosticScore`, `diagnosticTotal`, `diagnosticPercent`, `weakTopics`, `diagnosticTakenAt`

These fields are optional for ordinary demo enquiries and populated only for the public diagnostic funnel.
