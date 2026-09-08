import { supabase } from "@/integrations/supabase/client";

/**
 * Single typed entry point for data access. Every service module goes through
 * `table()` so query code stays terse while RLS keeps access safe.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const table = (name: string) => (supabase as any).from(name);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const rpc = (name: string, args?: Record<string, unknown>) =>
  (supabase as any).rpc(name, args);

export { supabase };

export function unwrap<T>(result: { data: unknown; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}
