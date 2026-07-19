"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";

// Canvas-style global "quick create" (+) menu. Exec-only; lets exec
// start any content from anywhere without hunting for the right list
// page first. Self-contained dropdown: toggled by useState, closes on
// blur, Escape, click-away overlay, or when a link is clicked.
const LINKS = [
  { href: "/assignments/new", label: "New Assignment" },
  { href: "/quizzes/new", label: "New Quiz" },
  { href: "/announcements/new", label: "Post Announcement" },
  { href: "/pages/new", label: "New Page" },
  { href: "/calendar/new", label: "New Event" },
  { href: "/modules", label: "Manage Modules" },
];

export function QuickCreate() {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onBlur={(e) => {
        // Close when focus leaves the whole dropdown (e.g. Tab out).
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setOpen(false);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1 rounded-md bg-blue px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-sky"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        Create
      </button>

      {open && (
        <>
          {/* Click-away overlay — a transparent layer behind the menu. */}
          <div
            className="fixed inset-0 z-10"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 w-52 rounded-md border border-hair bg-white py-1 shadow-lg"
          >
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-sm text-text hover:bg-[#eef7ff]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
