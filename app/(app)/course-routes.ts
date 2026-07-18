// The routes that live *inside* a course. The white course-nav column
// (and the course breadcrumb header) only appear on these — everywhere
// else (Dashboard, Terms & Courses admin, global Notifications) shows
// just the blue global rail, like bCourses.
export const COURSE_ROUTES = [
  "/home",
  "/announcements",
  "/syllabus",
  "/modules",
  "/pages",
  "/assignments",
  "/discussions",
  "/quizzes",
  "/directory",
  "/grades",
  "/files",
  "/calendar",
  "/search",
];

export function isCourseRoute(pathname: string): boolean {
  return COURSE_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
