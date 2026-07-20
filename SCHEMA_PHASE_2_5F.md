# Phase 2.5F Runtime Schema Extension

**Project:** WAGH Tuition Classes  
**Architecture:** LOCKED v2.3.1 R2  
**Migration:** `TEACHER_TEST_ASSIGNMENTS_2_5F_V1`  
**Installer:** `installTestAssignmentSystem()`

## New sheet: `TEST_ASSIGNMENTS`

| Column | Purpose |
|---|---|
| `assignmentId` | Stable student-level assignment ID |
| `assignmentGroupId` | One Teacher send action shared by all selected students |
| `teacherId` | Verified assigning Teacher |
| `studentId` | Verified assigned Student |
| `board` | Student/test Board scope |
| `className` | Student/test Class scope |
| `medium` | Student/test Medium scope |
| `subjectId` | Assigned Subject ID |
| `chapterId` | Assigned Chapter ID |
| `mcqSetId` | Published dynamic MCQ set ID |
| `testId` | Exact published test ID |
| `testTitle` | Snapshot of the test title at assignment time |
| `testType` | Topic/full-length assessment type |
| `assignedAt` | Assignment timestamp |
| `dueAt` | Optional due date |
| `maxAttempts` | `0` for unlimited, otherwise allowed attempt count |
| `teacherMessage` | Optional Teacher instruction, maximum 300 characters |
| `status` | `ASSIGNED`, `COMPLETED` or `CANCELLED` storage state |
| `cancelledAt` | Cancellation timestamp where applicable |
| `createdAt` | Creation timestamp |
| `updatedAt` | Latest update timestamp |

Displayed `PENDING`, `OVERDUE`, `IN_PROGRESS` and group completion states are
derived from assignment rows, exact linked result evidence and due dates.

## Existing sheet additions

Add the optional column below without clearing or rewriting existing rows:

- `TEST_RESULTS.assignmentId`
- `MCQ_ATTEMPTS.assignmentId`

`assignmentId` links a result to one exact Teacher assignment. Old results remain
valid with a blank assignment ID and are not counted as completion of a newly
sent test.

## Migration safety

The installer:

- creates only missing sheets/columns;
- never clears or deletes populated data;
- records the migration in `MIGRATION_LOG`;
- is safe to rerun;
- leaves old static and dynamic MCQ evidence unchanged.
