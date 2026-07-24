# Runtime API Routes

login, signupStudent, updateStudentProfile, getSubjects, getChapters, getChapterFeatures, getStudentProgress, logAccess, adminDashboard


## Student Profile Change Approval System v1.0

Student actions:

- `changeStudentPassword`
- `createProfileChangeRequest`
- `getMyProfileChangeRequests`
- `cancelProfileChangeRequest`

Admin actions:

- `getProfileChangeRequests`
- `approveProfileChangeRequest`
- `rejectProfileChangeRequest`

The legacy `updateStudentProfile` route remains present for compatibility but rejects direct student changes to name, mobile, board, class, medium, student type or access status.


## Home Page Admission Funnel H1.0

Public conversion action:

- `saveAdmissionLead`

The route validates a demo/admission enquiry and saves it to the additive `ADMISSION_LEADS` runtime sheet. It does not create a student account.


## Admission Leads Admin H1.1

- `adminGetAdmissionLeads` — Admin-password protected lead list and conversion summary.
- `adminUpdateAdmissionLead` — Admin-password protected status, notes, demo date and follow-up date update.


## Home Diagnostic Funnel H1.2

Runtime catalogue and lead actions:

- `getSubjects` — returns active subject combinations used by the dependent selector.
- `getChapters` — returns active chapters for the chosen class, board, medium and subject.
- `saveAdmissionLead` — stores the diagnostic context and server-produced result in `ADMISSION_LEADS`.

Authoring/published-content actions:

- `getPublicDiagnostic` — accepts `chapterId`, chooses up to 10 published MCQs and returns question text/options without answer keys. A short-lived diagnostic session is stored server-side.
- `scorePublicDiagnostic` — accepts the diagnostic session ID and selected answers, then returns score, unanswered count and weak-topic feedback from the server-side answer key.

Public diagnostic sessions expire after approximately 30 minutes and do not write to `TEST_RESULTS`, `PROGRESS_TRACKER` or MCQ progress.

