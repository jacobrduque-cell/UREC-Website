import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-navy-deep px-6 py-24 text-center text-white">
      <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/60">
        UC Berkeley
      </p>
      <h1 className="mt-6 max-w-2xl font-display text-4xl font-bold leading-tight sm:text-5xl">
        Undergraduate Real Estate Club
      </h1>
      <p className="mt-6 max-w-md text-white/70">
        The Deal Library and Member Workspace, home to the UREC Analyst
        Program. Sign in with your @berkeley.edu account below.
      </p>
      <Link
        href="/login"
        className="mt-10 rounded-md bg-white px-8 py-3 text-sm font-medium tracking-wide text-navy-deep transition-colors hover:bg-white/90"
      >
        Member Sign In
      </Link>
    </main>
  );
}
