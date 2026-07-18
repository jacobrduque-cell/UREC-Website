// RLS invariant tests. Runs the full migration chain against a throwaway
// Postgres, seeds a small fixture (exec + two students + a course + a
// quiz + a file submission), and asserts the security boundaries that
// matter. Run with: npm run test:rls  (needs a local/CI Postgres — see
// harness.mjs for the PG* env vars).

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { freshDb, tryAsUser, asUser } from "./harness.mjs";

const EXEC = "00000000-0000-0000-0000-0000000000e1";
const STU = "00000000-0000-0000-0000-0000000000a1"; // enrolled analyst
const OTHER = "00000000-0000-0000-0000-0000000000a2"; // enrolled analyst
const OUTSIDER = "00000000-0000-0000-0000-0000000000b1"; // signed in, not enrolled

let db;
let course;

before(async () => {
  db = await freshDb();

  // Fixture users: insert into auth.users so the handle_new_auth_user
  // trigger creates the matching public.users rows (public.users.id FKs
  // to auth.users, so we can't insert profiles directly).
  await db.query(
    `insert into auth.users (id, email, raw_user_meta_data) values
       ($1,'exec@berkeley.edu','{"full_name":"Exec"}'::jsonb),
       ($2,'stu@berkeley.edu','{"full_name":"Student"}'::jsonb),
       ($3,'other@berkeley.edu','{"full_name":"Other"}'::jsonb),
       ($4,'outsider@berkeley.edu','{"full_name":"Outsider"}'::jsonb)`,
    [EXEC, STU, OTHER, OUTSIDER],
  );
  await db.query(
    `insert into public.account_roles (user_id, role_id)
       select $1, id from public.roles where name='Co-President'`,
    [EXEC],
  );

  const { rows } = await db.query(`select id from public.courses limit 1`);
  course = rows[0].id;
  // Publish it, as exec would — an unpublished (draft) course is
  // deliberately invisible to enrolled students.
  await db.query(`update public.courses set published = true where id = $1`, [course]);
  const analyst = (await db.query(`select id from public.roles where name='Analyst'`)).rows[0].id;

  await db.query(
    `insert into public.enrollments (user_id, course_id, role_id) values ($1,$3,$4),($2,$3,$4)`,
    [STU, OTHER, course, analyst],
  );

  // A published quiz + question, and a submission with a file.
  await db.query(
    `insert into public.quizzes (id, course_id, title, published)
       values ('11111111-0000-0000-0000-000000000001',$1,'Q1',true)`,
    [course],
  );
  await db.query(
    `insert into public.quiz_submissions (id, quiz_id, user_id, score, submitted_at)
       values ('33333333-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001',$1,0,now())`,
    [STU],
  );
  await db.query(
    `insert into public.assignment_groups (id, course_id, name, weight_pct, position)
       values ('44444444-0000-0000-0000-000000000001',$1,'HW',100,0)`,
    [course],
  );
  await db.query(
    `insert into public.assignments (id, course_id, assignment_group_id, title, submission_type, points_possible, published)
       values ('55555555-0000-0000-0000-000000000001',$1,'44444444-0000-0000-0000-000000000001','HW1','file',100,true)`,
    [course],
  );
  await db.query(
    `insert into public.submissions (id, assignment_id, user_id, submitted_at)
       values ('66666666-0000-0000-0000-000000000001','55555555-0000-0000-0000-000000000001',$1,now())`,
    [STU],
  );
  await db.query(
    `insert into public.files (id, course_id, uploaded_by, storage_path, filename, published)
       values ('77777777-0000-0000-0000-000000000001',$1,$2,'55555555-0000-0000-0000-000000000001/x/secret.pdf','Secret.pdf',false)`,
    [course, STU],
  );
  await db.query(
    `insert into public.submission_files (submission_id, file_id)
       values ('66666666-0000-0000-0000-000000000001','77777777-0000-0000-0000-000000000001')`,
  );
  await db.query(
    `insert into public.files (id, course_id, uploaded_by, storage_path, filename, published)
       values ('77777777-0000-0000-0000-000000000002',$1,$2,'folder/syllabus.pdf','Syllabus.pdf',true)`,
    [course, EXEC],
  );

  // A course meeting to take attendance at.
  await db.query(
    `insert into public.calendar_events (id, course_id, title, starts_at, created_by)
       values ('88888888-0000-0000-0000-000000000001',$1,'GM 1', now(), $2)`,
    [course, EXEC],
  );

  // A group with STU as a member, a group assignment, a group submission
  // (user_id null, group_id set) and a grade on it — the shape the
  // student grades/assignments pages must resolve for team work.
  await db.query(
    `insert into public.groups (id, course_id, name) values ('99999999-0000-0000-0000-000000000001',$1,'Team A')`,
    [course],
  );
  await db.query(
    `insert into public.group_memberships (group_id, user_id) values ('99999999-0000-0000-0000-000000000001',$1)`,
    [STU],
  );
  await db.query(
    `insert into public.assignments (id, course_id, assignment_group_id, title, submission_type, points_possible, published, allow_group_submission)
       values ('55555555-0000-0000-0000-000000000002',$1,'44444444-0000-0000-0000-000000000001','Team HW','text',50,true,true)`,
    [course],
  );
  await db.query(
    `insert into public.submissions (id, assignment_id, group_id, submitted_at)
       values ('66666666-0000-0000-0000-000000000002','55555555-0000-0000-0000-000000000002','99999999-0000-0000-0000-000000000001', now())`,
  );
  await db.query(
    `insert into public.grades (submission_id, points_earned, graded_by)
       values ('66666666-0000-0000-0000-000000000002', 45, $1)`,
    [EXEC],
  );

  // A locked assignment (window already closed) with a STU submission on
  // it, for the submission tamper guard (20260717002300).
  await db.query(
    `insert into public.assignments (id, course_id, title, submission_type, points_possible, published, lock_at)
       values ('55555555-0000-0000-0000-000000000003',$1,'Closed HW','text',20,true, now() - interval '1 day')`,
    [course],
  );
  await db.query(
    `insert into public.submissions (id, assignment_id, user_id, submitted_at)
       values ('66666666-0000-0000-0000-000000000003','55555555-0000-0000-0000-000000000003',$1, now() - interval '2 day')`,
    [STU],
  );
});

after(async () => {
  if (db) await db.end();
});

// ---- Course visibility ----
test("enrolled student can read their course", async () => {
  const r = await tryAsUser(db, STU, `select count(*)::int n from public.courses where id=$1`, [course]);
  assert.equal(r.rows[0].n, 1);
});

test("outsider cannot read a course they're not enrolled in", async () => {
  const r = await tryAsUser(db, OUTSIDER, `select count(*)::int n from public.courses where id=$1`, [course]);
  assert.equal(r.rows[0].n, 0);
});

test("exec can read any course", async () => {
  const r = await tryAsUser(db, EXEC, `select count(*)::int n from public.courses where id=$1`, [course]);
  assert.equal(r.rows[0].n, 1);
});

// ---- Quiz score integrity (fix: 20260717001700) ----
test("student CANNOT update their own quiz score", async () => {
  await tryAsUser(db, STU, `update public.quiz_submissions set score=999 where user_id=$1`, [STU]);
  const { rows } = await db.query(`select score from public.quiz_submissions where user_id=$1`, [STU]);
  assert.equal(Number(rows[0].score), 0, "score must stay 0 — student write must be denied");
});

test("student CANNOT insert a quiz_submission with an inflated score", async () => {
  const r = await tryAsUser(
    db, STU,
    `insert into public.quiz_submissions (quiz_id,user_id,score,submitted_at)
       values ('11111111-0000-0000-0000-000000000001',$1,999,now())`,
    [STU],
  );
  assert.equal(r.ok, false, "insert should be blocked by RLS");
});

test("student can still READ their own quiz submission", async () => {
  const r = await tryAsUser(db, STU, `select count(*)::int n from public.quiz_submissions where user_id=$1`, [STU]);
  assert.equal(r.rows[0].n, 1);
});

test("exec can write a quiz score", async () => {
  const r = await tryAsUser(db, EXEC, `update public.quiz_submissions set score=10 where user_id=$1`, [STU]);
  assert.equal(r.ok, true);
  assert.equal(r.rowCount, 1);
});

// ---- Submission-file metadata privacy (fix: 20260717001800) ----
test("another enrolled member CANNOT read a classmate's submission file metadata", async () => {
  const r = await tryAsUser(db, OTHER, `select count(*)::int n from public.files where filename='Secret.pdf'`);
  assert.equal(r.rows[0].n, 0);
});

test("the submitter CAN read their own submission file metadata", async () => {
  const r = await tryAsUser(db, STU, `select count(*)::int n from public.files where filename='Secret.pdf'`);
  assert.equal(r.rows[0].n, 1);
});

test("exec CAN read submission file metadata", async () => {
  const r = await tryAsUser(db, EXEC, `select count(*)::int n from public.files where filename='Secret.pdf'`);
  assert.equal(r.rows[0].n, 1);
});

test("published course files stay readable by any enrolled member", async () => {
  const r = await tryAsUser(db, OTHER, `select count(*)::int n from public.files where filename='Syllabus.pdf'`);
  assert.equal(r.rows[0].n, 1);
});

// ---- Grades are exec-write-only ----
test("student cannot insert their own grade", async () => {
  const r = await tryAsUser(
    db, STU,
    `insert into public.grades (submission_id, points_earned, graded_by)
       values ('66666666-0000-0000-0000-000000000001', 100, $1)`,
    [STU],
  );
  assert.equal(r.ok, false, "grades write must be exec-only");
});

// ---- Group submissions are visible to teammates (grades fix) ----
test("a group member can read their team's submission and its grade", async () => {
  const sub = await tryAsUser(
    db, STU,
    `select count(*)::int n from public.submissions where group_id='99999999-0000-0000-0000-000000000001'`,
  );
  assert.equal(sub.rows[0].n, 1, "teammate must see the group submission");
  const grade = await tryAsUser(
    db, STU,
    `select points_earned from public.grades where submission_id='66666666-0000-0000-0000-000000000002'`,
  );
  assert.equal(grade.rows.length, 1);
  assert.equal(Number(grade.rows[0].points_earned), 45);
});

test("a non-member cannot read another team's submission", async () => {
  const r = await tryAsUser(
    db, OUTSIDER,
    `select count(*)::int n from public.submissions where group_id='99999999-0000-0000-0000-000000000001'`,
  );
  assert.equal(r.rows[0].n, 0);
});

// ---- Attendance (20260717001900) ----
const EVENT = "88888888-0000-0000-0000-000000000001";

test("exec can record attendance", async () => {
  const r = await tryAsUser(
    db, EXEC,
    `insert into public.attendance_records (event_id, user_id, status, recorded_by)
       values ($1,$2,'present',$3)`,
    [EVENT, STU, EXEC],
  );
  assert.equal(r.ok, true);
});

test("a member cannot record attendance", async () => {
  const r = await tryAsUser(
    db, STU,
    `insert into public.attendance_records (event_id, user_id, status) values ($1,$2,'present')`,
    [EVENT, STU],
  );
  assert.equal(r.ok, false, "attendance write must be exec-only");
});

test("a member sees their own attendance but not a classmate's", async () => {
  // Persist a record as superuser for the read checks.
  await db.query(
    `insert into public.attendance_records (event_id, user_id, status)
       values ($1,$2,'present') on conflict (event_id,user_id) do nothing`,
    [EVENT, STU],
  );
  const own = await tryAsUser(db, STU, `select count(*)::int n from public.attendance_records where user_id=$1`, [STU]);
  assert.equal(own.rows[0].n, 1);
  const other = await tryAsUser(db, OTHER, `select count(*)::int n from public.attendance_records where user_id=$1`, [STU]);
  assert.equal(other.rows[0].n, 0);
});

// ---- Notification preferences (20260717002100) ----
test("a member manages only their own notification prefs", async () => {
  const ok = await tryAsUser(
    db, STU,
    `insert into public.notification_prefs (user_id, type, channel) values ($1,'new_announcement','off')`,
    [STU],
  );
  assert.equal(ok.ok, true);
  // Cannot write a pref for someone else.
  const bad = await tryAsUser(
    db, STU,
    `insert into public.notification_prefs (user_id, type, channel) values ($1,'new_announcement','off')`,
    [OTHER],
  );
  assert.equal(bad.ok, false, "must not set another member's prefs");
  // Cannot read someone else's pref.
  await db.query(
    `insert into public.notification_prefs (user_id, type, channel) values ($1,'new_assignment','off') on conflict do nothing`,
    [OTHER],
  );
  const read = await tryAsUser(db, STU, `select count(*)::int n from public.notification_prefs where user_id=$1`, [OTHER]);
  assert.equal(read.rows[0].n, 0);
});

// ---- Pending-enrollment trigger (fix: 20260717001600) ----
test("signup trigger redeems a pending enrollment into a real one", async () => {
  const analyst = (await db.query(`select id from public.roles where name='Analyst'`)).rows[0].id;
  await db.query(
    `insert into public.pending_enrollments (email, course_id, role_id) values ('newbie@berkeley.edu',$1,$2)`,
    [course, analyst],
  );
  // Simulate first sign-in: insert into auth.users fires handle_new_auth_user.
  const newId = "00000000-0000-0000-0000-0000000000c1";
  await db.query(
    `insert into auth.users (id, email, raw_user_meta_data) values ($1,'NewBie@berkeley.edu','{}'::jsonb)`,
    [newId],
  );
  const enr = await db.query(`select count(*)::int n from public.enrollments where user_id=$1 and course_id=$2`, [newId, course]);
  assert.equal(enr.rows[0].n, 1, "pending enrollment should convert on signup (case-insensitive)");
  const pend = await db.query(`select count(*)::int n from public.pending_enrollments where lower(email)='newbie@berkeley.edu'`);
  assert.equal(pend.rows[0].n, 0, "pending row should be cleared after redemption");
});

// ---- Submission tamper guard (fix: 20260717002300) ----
test("student CANNOT re-target their submission to a different assignment", async () => {
  const r = await tryAsUser(
    db,
    STU,
    `update public.submissions set assignment_id='55555555-0000-0000-0000-000000000002'
       where id='66666666-0000-0000-0000-000000000001'`,
  );
  assert.equal(r.ok, false, "re-targeting assignment_id must be rejected");
});

test("student's backdated submitted_at is overwritten to now()", async () => {
  const stored = await asUser(db, STU, async (c) => {
    await c.query(
      `update public.submissions set submitted_at='2020-01-01T00:00:00Z'
         where id='66666666-0000-0000-0000-000000000001'`,
    );
    const { rows } = await c.query(
      `select submitted_at from public.submissions where id='66666666-0000-0000-0000-000000000001'`,
    );
    return rows[0].submitted_at;
  });
  assert.ok(
    new Date(stored).getUTCFullYear() >= 2026,
    `submitted_at should be re-stamped to now(), got ${stored}`,
  );
});

test("student CANNOT edit a submission after the window closed", async () => {
  const r = await tryAsUser(
    db,
    STU,
    `update public.submissions set body_text='late edit'
       where id='66666666-0000-0000-0000-000000000003'`,
  );
  assert.equal(r.ok, false, "update after lock_at must be rejected");
});

test("exec CAN update a submission even after the window closed", async () => {
  const r = await tryAsUser(
    db,
    EXEC,
    `update public.submissions set body_text='exec fix'
       where id='66666666-0000-0000-0000-000000000003'`,
  );
  assert.equal(r.ok, true, "exec is exempt from the tamper guard");
});

// ---- submission_files file ownership (fix: 20260717002400) ----
test("student CANNOT attach a file they didn't upload to their submission", async () => {
  // 77777777-...0002 is the exec-uploaded syllabus. Linking it to STU's
  // own submission would leak its metadata via files_select_submission_participant.
  const r = await tryAsUser(
    db,
    STU,
    `insert into public.submission_files (submission_id, file_id)
       values ('66666666-0000-0000-0000-000000000001','77777777-0000-0000-0000-000000000002')`,
  );
  assert.equal(r.ok, false, "attaching another user's file must be rejected");
});

// ---- files insert for own uploads (fix: 20260717002500) ----
test("enrolled student CAN insert their own unpublished submission file", async () => {
  const r = await tryAsUser(
    db,
    STU,
    `insert into public.files (course_id, uploaded_by, storage_path, filename, published)
       values ($1,$2,'a/b/own.pdf','own.pdf',false)`,
    [course, STU],
  );
  assert.equal(r.ok, true, "students must be able to upload file submissions");
});

test("student CANNOT insert a PUBLISHED file (repository stays exec-only)", async () => {
  const r = await tryAsUser(
    db,
    STU,
    `insert into public.files (course_id, uploaded_by, storage_path, filename, published)
       values ($1,$2,'a/b/pub.pdf','pub.pdf',true)`,
    [course, STU],
  );
  assert.equal(r.ok, false, "students must not publish to the Files repository");
});

test("student CANNOT insert a file attributed to someone else", async () => {
  const r = await tryAsUser(
    db,
    STU,
    `insert into public.files (course_id, uploaded_by, storage_path, filename, published)
       values ($1,$2,'a/b/forge.pdf','forge.pdf',false)`,
    [course, OTHER],
  );
  assert.equal(r.ok, false, "uploaded_by must be the caller");
});
