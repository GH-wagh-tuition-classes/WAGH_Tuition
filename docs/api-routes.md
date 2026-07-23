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
