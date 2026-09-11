import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Maps the Postgres errors this app can legitimately hit to a sentence a
 * person can act on. Anything else gets a generic message; the details stay in
 * the server logs.
 */
export function friendlyDbError(error: PostgrestError | { code?: string; message?: string } | null): string {
  if (!error) return "Something went wrong. Please try again.";
  switch (error.code) {
    case "42501": // insufficient_privilege: RLS or a grant said no
      return "You are not allowed to do that.";
    case "23505": // unique_violation
      return "That entry already exists.";
    case "23503": // foreign_key_violation (e.g. deleting a coaster that has rides)
      return "That coaster still has rides logged against it. Merge it into another coaster instead.";
    case "23514": // check_violation
      return "One of the values is out of range. Check the date and the note length.";
    case "P0002": // no_data_found (raised by merge_coaster)
      return "That coaster no longer exists.";
    case "22023": // invalid_parameter_value (raised by merge_coaster)
      return error.message ?? "Invalid request.";
    default:
      return "Something went wrong. Please try again.";
  }
}
