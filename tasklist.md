# Moe Exam Studio Tasks

2. **Role-Based UI Split**
   - [ ] Detect `user.role === 'admin'` vs. student and gate authoring/import/export tools accordingly.
   - [ ] Replace the student dashboard with a focused “Assigned Exams” + “Completed Exams” layout.

3. **Exam Assignment Workflow (Admin)**
   - [ ] Allow admins to copy/assign any exam from their library to a selected student inside the Admin Panel.
   - [ ] Store assignment metadata (assignedBy, assignedAt, requireCorrectToAdvance flag, etc.) with the student’s exam record.

4. **Student Exam Experience Enhancements**
   - [ ] Add a running timer while a student is actively taking an exam (displayed prominently, counting up).
   - [ ] When a multiple-choice answer is wrong, show “You got it WRONG :'(" before moving on.
   - [ ] Support per-assignment “Only advance when correct” behavior; while enabled, block navigation until the student answers correctly (still logging incorrect attempts).
   - [ ] Track completion timestamps and scores so the student dashboard can show progress history.


5. **Admin Score Management**
   - [ ] Provide controls in the Admin Panel to edit a student’s recorded score/attempt metadata.
