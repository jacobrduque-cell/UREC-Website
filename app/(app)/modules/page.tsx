import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec } from "@/lib/data/queries";
import Link from "next/link";
import {
  addModuleItem,
  createModule,
  deleteModule,
  deleteModuleItem,
  toggleModulePublished,
} from "./actions";

type ModuleItem = {
  id: string;
  position: number;
  item_type: "assignment" | "page" | "quiz" | "file" | "url" | "header";
  title: string;
  url: string | null;
  assignment: { id: string; points_possible: number; due_at: string | null } | null;
  page: { slug: string } | null;
  quiz: { id: string } | null;
  file: { storage_path: string } | null;
};
type ModuleRow = {
  id: string;
  name: string;
  position: number;
  published: boolean;
  module_items: ModuleItem[];
};

const TYPE_ICON: Record<string, string> = {
  assignment: "📝",
  page: "📄",
  quiz: "❓",
  file: "📎",
  url: "🔗",
  header: "",
};

function itemHref(item: ModuleItem): string | null {
  if (item.item_type === "assignment" && item.assignment) return `/assignments/${item.assignment.id}`;
  if (item.item_type === "page" && item.page) return `/pages/${item.page.slug}`;
  if (item.item_type === "quiz" && item.quiz) return `/quizzes/${item.quiz.id}`;
  if (item.item_type === "url" && item.url) return item.url;
  return null;
}

export default async function ModulesPage() {
  const [course, isExec] = await Promise.all([getCurrentCourse(), getIsExec()]);
  const supabase = await createClient();

  const [{ data: modulesData }, { data: assignments }, { data: pages }, { data: quizzes }] =
    await Promise.all([
      course
        ? supabase
            .from("modules")
            .select(
              `id, name, position, published,
               module_items(id, position, item_type, title, url,
                 assignment:assignments(id, points_possible, due_at),
                 page:wiki_pages(slug),
                 quiz:quizzes(id),
                 file:files(storage_path))`,
            )
            .eq("course_id", course.id)
            .order("position", { ascending: true })
        : Promise.resolve({ data: null }),
      isExec && course
        ? supabase.from("assignments").select("id, title").eq("course_id", course.id).order("title")
        : Promise.resolve({ data: [] }),
      isExec && course
        ? supabase.from("wiki_pages").select("id, title").eq("course_id", course.id).neq("slug", "syllabus").order("title")
        : Promise.resolve({ data: [] }),
      isExec && course
        ? supabase.from("quizzes").select("id, title").eq("course_id", course.id).order("title")
        : Promise.resolve({ data: [] }),
    ]);

  const modules = (modulesData ?? []) as unknown as ModuleRow[];

  return (
    <div className="mx-auto w-full max-w-4xl px-8 py-10">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-navy-deep">Modules</h1>
        {isExec && (
          <Link
            href="/pages"
            className="whitespace-nowrap rounded-md border border-hair px-4 py-2 text-xs font-medium text-text transition-colors hover:bg-[#eef7ff]"
          >
            Manage Pages
          </Link>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-5">
        {modules.map((m) => {
          const items = [...m.module_items].sort((a, b) => a.position - b.position);
          return (
            <details key={m.id} open className="overflow-hidden rounded-md border border-hair">
              <summary className="flex cursor-pointer items-center justify-between gap-3 bg-[#f2f4f4] px-4 py-3">
                <span className="flex items-center gap-2">
                  <span className="font-ui text-sm font-bold text-navy-deep">{m.name}</span>
                  {!m.published && (
                    <span className="rounded-full border border-hair px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                      Draft
                    </span>
                  )}
                </span>
                {isExec && (
                  <span className="flex items-center gap-2">
                    <form action={toggleModulePublished.bind(null, m.id, m.published)}>
                      <button className="rounded-md border border-hair px-2.5 py-1 text-xs font-medium text-text transition-colors hover:bg-white">
                        {m.published ? "Unpublish" : "Publish"}
                      </button>
                    </form>
                    <form action={deleteModule.bind(null, m.id)}>
                      <button className="rounded-md border border-hair px-2.5 py-1 text-xs font-medium text-neg transition-colors hover:bg-white">
                        Delete
                      </button>
                    </form>
                  </span>
                )}
              </summary>

              <ul className="divide-y divide-hair">
                {items.map((item) => {
                  const href = itemHref(item);
                  if (item.item_type === "header") {
                    return (
                      <li key={item.id} className="flex items-center justify-between gap-3 bg-white px-4 py-2.5">
                        <span className="text-sm font-bold text-navy-deep">{item.title}</span>
                        {isExec && <DeleteItemBtn itemId={item.id} />}
                      </li>
                    );
                  }
                  return (
                    <li key={item.id} className="flex items-center justify-between gap-3 bg-white px-4 py-3">
                      <span className="flex items-center gap-2.5">
                        <span aria-hidden className="text-sm">{TYPE_ICON[item.item_type]}</span>
                        {href ? (
                          <Link
                            href={href}
                            target={item.item_type === "url" ? "_blank" : undefined}
                            rel={item.item_type === "url" ? "noopener noreferrer" : undefined}
                            className="text-sm text-sky hover:underline"
                          >
                            {item.title}
                          </Link>
                        ) : (
                          <span className="text-sm text-text">{item.title}</span>
                        )}
                        {item.assignment && (
                          <span className="text-xs text-muted">
                            {item.assignment.points_possible} pts
                          </span>
                        )}
                      </span>
                      {isExec && <DeleteItemBtn itemId={item.id} />}
                    </li>
                  );
                })}
                {items.length === 0 && (
                  <li className="bg-white px-4 py-3 text-xs text-muted">Empty module.</li>
                )}
              </ul>

              {isExec && (
                <AddItemForm
                  moduleId={m.id}
                  assignments={(assignments ?? []) as { id: string; title: string }[]}
                  pages={(pages ?? []) as { id: string; title: string }[]}
                  quizzes={(quizzes ?? []) as { id: string; title: string }[]}
                />
              )}
            </details>
          );
        })}
        {modules.length === 0 && (
          <p className="text-sm text-muted">No modules yet.</p>
        )}
      </div>

      {isExec && (
        <div className="mt-8 border-t border-hair pt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">New Module</h2>
          <form action={createModule} className="mt-3 flex gap-3">
            <input
              name="name"
              required
              placeholder="e.g. Week 1 — Defining CRE"
              className="flex-1 rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
            />
            <button
              type="submit"
              className="whitespace-nowrap rounded-md bg-blue px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
            >
              Add Module
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function DeleteItemBtn({ itemId }: { itemId: string }) {
  return (
    <form action={deleteModuleItem.bind(null, itemId)}>
      <button className="text-xs text-muted transition-colors hover:text-neg" aria-label="Remove item">
        Remove
      </button>
    </form>
  );
}

function AddItemForm({
  moduleId,
  assignments,
  pages,
  quizzes,
}: {
  moduleId: string;
  assignments: { id: string; title: string }[];
  pages: { id: string; title: string }[];
  quizzes: { id: string; title: string }[];
}) {
  return (
    <details className="border-t border-hair bg-[#fafbfb]">
      <summary className="cursor-pointer px-4 py-2.5 text-xs font-medium text-sky">
        + Add item
      </summary>
      <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
        <form action={addModuleItem.bind(null, moduleId)} className="flex flex-col gap-2 rounded-md border border-hair bg-white p-3">
          <input type="hidden" name="item_type" value="assignment" />
          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted">Assignment</label>
          <select name="ref_id" className="rounded-md border border-hair px-2 py-1.5 text-sm outline-none focus:border-blue">
            {assignments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
          </select>
          <button className="self-start rounded-md border border-hair px-3 py-1 text-xs font-medium text-text hover:bg-[#eef7ff]">Add</button>
        </form>

        <form action={addModuleItem.bind(null, moduleId)} className="flex flex-col gap-2 rounded-md border border-hair bg-white p-3">
          <input type="hidden" name="item_type" value="page" />
          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted">Page</label>
          <select name="ref_id" className="rounded-md border border-hair px-2 py-1.5 text-sm outline-none focus:border-blue">
            {pages.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <button className="self-start rounded-md border border-hair px-3 py-1 text-xs font-medium text-text hover:bg-[#eef7ff]">Add</button>
        </form>

        <form action={addModuleItem.bind(null, moduleId)} className="flex flex-col gap-2 rounded-md border border-hair bg-white p-3">
          <input type="hidden" name="item_type" value="quiz" />
          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted">Quiz</label>
          <select name="ref_id" className="rounded-md border border-hair px-2 py-1.5 text-sm outline-none focus:border-blue">
            {quizzes.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}
          </select>
          <button className="self-start rounded-md border border-hair px-3 py-1 text-xs font-medium text-text hover:bg-[#eef7ff]">Add</button>
        </form>

        <form action={addModuleItem.bind(null, moduleId)} className="flex flex-col gap-2 rounded-md border border-hair bg-white p-3">
          <input type="hidden" name="item_type" value="url" />
          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted">External link</label>
          <input name="title" placeholder="Link text" className="rounded-md border border-hair px-2 py-1.5 text-sm outline-none focus:border-blue" />
          <input name="url" placeholder="https://…" className="rounded-md border border-hair px-2 py-1.5 text-sm outline-none focus:border-blue" />
          <button className="self-start rounded-md border border-hair px-3 py-1 text-xs font-medium text-text hover:bg-[#eef7ff]">Add</button>
        </form>

        <form action={addModuleItem.bind(null, moduleId)} className="flex flex-col gap-2 rounded-md border border-hair bg-white p-3 sm:col-span-2">
          <input type="hidden" name="item_type" value="header" />
          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted">Text header (section label)</label>
          <div className="flex gap-2">
            <input name="title" placeholder="e.g. Readings" className="flex-1 rounded-md border border-hair px-2 py-1.5 text-sm outline-none focus:border-blue" />
            <button className="rounded-md border border-hair px-3 py-1 text-xs font-medium text-text hover:bg-[#eef7ff]">Add</button>
          </div>
        </form>
      </div>
    </details>
  );
}
