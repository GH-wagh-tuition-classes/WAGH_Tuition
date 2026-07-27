# H1.4 Referral & Growth Tracking — Live Test Checklist

Use **WAGH Tuition Classes development** only until all required checks pass.

## A. Installer and backend

- [ ] Back up Runtime Apps Script and `WTC_CONTENT_ENGINE`.
- [ ] Add `referral_growth.gs`.
- [ ] Replace only the supplied cumulative `api_router.gs` and `version.gs`.
- [ ] Run `installReferralGrowthSystem()` successfully.
- [ ] `REFERRAL_CODES` exists with 9 columns.
- [ ] `REFERRAL_TRACKER` exists with 27 columns.
- [ ] H1.4 migration appears once in `MIGRATION_LOG`.
- [ ] Re-running the installer does not erase or duplicate data.
- [ ] Runtime Web App is deployed as a new version with the same `/exec` URL.
- [ ] `getSystemVersion` reports Referral Growth H1.4.
- [ ] All timestamps display in Tapi/Gujarat IST.

## B. Student referral dashboard

Test once with an active WTC Student and once with an active General Student.

- [ ] Refer & Grow opens from the sidebar and Student Home card.
- [ ] A valid `WTC-...` code is generated.
- [ ] Refresh returns the same code.
- [ ] Copy Link works.
- [ ] WhatsApp share opens with the WTC link.
- [ ] Native Share works where supported.
- [ ] Share count increases.
- [ ] Student view shows only stages and aggregate counts.
- [ ] Student view does not show referred names, mobile numbers or student IDs.

## C. Public first-touch attribution

- [ ] Open a referral link in an Incognito tab.
- [ ] Homepage displays the referral welcome banner.
- [ ] One pseudonymous row appears in `REFERRAL_TRACKER` with stage `CLICKED`.
- [ ] Refreshing/reopening does not create uncontrolled duplicate click rows.
- [ ] Open a different referral link in the same browser; the first valid code remains attributed for 30 days.
- [ ] Public API response does not expose the referrer name, mobile or student ID.

## D. Signup and enquiry attribution

- [ ] Create a new General Student account from the referral visit.
- [ ] The referral record becomes `SIGNED_UP` and links the new student ID.
- [ ] Submit a Free Demo enquiry from a referral visit.
- [ ] The referral record becomes `ENQUIRY` and links the Admission Lead ID.
- [ ] Submit a Diagnostic Report request from a referral visit.
- [ ] Referral attribution is retained and the lead is linked.
- [ ] Existing non-referral signup/demo/diagnostic flows continue working.

## E. Admission conversion and reward

- [ ] In Admission Leads, change the linked lead to `DEMO_BOOKED`.
- [ ] Referral stage becomes `DEMO_BOOKED`.
- [ ] Change the lead to `JOINED`.
- [ ] Referral stage becomes `JOINED` and reward status becomes `PENDING`.
- [ ] Reward approval before Joined is rejected.
- [ ] Admin approves a reward after Joined with a reward type.
- [ ] Stage becomes `REWARD_APPROVED` and reward status becomes `APPROVED`.
- [ ] Student sees only reward status/type, not the referred student’s identity.
- [ ] Admin rejection records the reason/status.

## F. Anti-abuse

- [ ] Referral using the referrer’s own registered mobile is marked `REJECTED`.
- [ ] The same referred mobile/student cannot be claimed by a second referral code.
- [ ] Disabling a referral code prevents new visit/conversion attribution.
- [ ] Re-enabling the code restores valid future attribution.
- [ ] No reward is issued automatically from a click, signup or enquiry.

## G. Regression and separation

- [ ] Student, Teacher and Admin login still work.
- [ ] Assigned Tests still load.
- [ ] Teacher Dashboard and Teacher Assignments still load.
- [ ] Admission Leads H1.1/H1.3A still work.
- [ ] Diagnostic H1.2/H1.3A still works.
- [ ] Daily Challenge H1.3C still works.
- [ ] No referral action changes `PROGRESS_TRACKER`.
- [ ] No referral action writes standard test/attempt/skill/gamification sheets.
- [ ] No referral activity changes Daily Challenge ranking or streak data.
- [ ] Mobile layouts remain usable on Home, Student and Admin pages.

## H. Completion

Mark H1.4 complete only after all required live checks pass. Then create a new cumulative production lock; do not modify the existing H1.3C production lock retroactively.
