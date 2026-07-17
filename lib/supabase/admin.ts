import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Full-privilege client that bypasses Row Level Security. Server-only —
 * the "server-only" import throws a build error if this is ever pulled
 * into a client bundle. Use for admin operations (seeding, cross-user
 * queries for exec dashboards), never for regular request handling.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
