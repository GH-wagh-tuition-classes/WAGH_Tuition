# H1.4.4 Live Test Checklist

Test in **WAGH Tuition Classes development** only.

## Daily Chapter Challenge — guest view

- [ ] Open the homepage and select **Daily Chapter Challenge**.
- [ ] Confirm the experience occupies the full browser viewport.
- [ ] Confirm the top toolbar remains visible while the challenge content scrolls.
- [ ] Confirm the heading, paragraph, badges and status card are clearly readable.
- [ ] Confirm the homepage mobile conversion bar and floating WhatsApp button are hidden.
- [ ] Tap **Login to Join**.
- [ ] Confirm the login form opens inside the same Daily Challenge screen.
- [ ] Confirm only Student mobile number and password are shown.
- [ ] Confirm there is no role selector and no Teacher/Admin/Parent login option.
- [ ] Confirm **Hide** closes only the inline login form.

## Daily Chapter Challenge — Student login

- [ ] Enter an invalid mobile/password and confirm the error appears inside the challenge screen.
- [ ] Enter a valid Student mobile/password.
- [ ] Confirm the browser stays on the Daily Challenge screen and does not open `student.html`.
- [ ] Confirm today’s subject, chapter, status and action load after login.
- [ ] Confirm **Start**, **Resume** or **View Today’s Result** behaves according to the Student’s challenge state.
- [ ] Confirm a Teacher/Admin/Parent credential cannot be accepted by this inline form.

## Targeted Test

- [ ] Open **Targeted Test** from the Free Tests card.
- [ ] Confirm it occupies the full browser viewport on mobile and desktop.
- [ ] Confirm only the Targeted Test content scrolls.
- [ ] Complete Class → Board → Medium → Subject → Chapter selection.
- [ ] Start and submit a test.
- [ ] Confirm result, focus topics, report form and WhatsApp fallback.

## Navigation and mobile behaviour

- [ ] Confirm Close returns to the same homepage position.
- [ ] Confirm Escape closes the full-screen experience on desktop.
- [ ] Confirm Android/browser Back closes the experience before leaving the homepage.
- [ ] Confirm `index.html#daily-challenge` and `index.html#diagnostic` open the correct full-screen experience.
- [ ] Confirm no horizontal overflow at 320px, 390px, tablet and desktop widths.
- [ ] Confirm keyboard opening does not reveal the homepage conversion bar above the form.

## Regression

- [ ] Hero Login and Signup drawer still works.
- [ ] Normal Student/Teacher/Admin/Parent homepage login still redirects by role.
- [ ] Referral attribution remains attached to signup, demo and diagnostic flows.
- [ ] Free Demo enquiry works.
- [ ] Daily Challenge results remain separate from Student Progress.
- [ ] All displayed challenge dates/times remain IST.

Do not production-lock or promote until every relevant item passes.
