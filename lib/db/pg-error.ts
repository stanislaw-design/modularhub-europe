// Root cause fix, /debug (spec 0037 /check verify): this driver
// (drizzle-orm/neon-http, ^0.45.2) wraps every failing query in a
// DrizzleQueryError whose own `.code` is always undefined; the real Postgres
// error (with the SQLSTATE on `.code`) sits at `error.cause`. Checking
// `error.code` directly (the pattern this file replaces, previously
// duplicated in lib/project-request-specs.ts and lib/project-quote-actions.ts)
// never matches, for both the query builder and `db.execute(sql\`...\`)` --
// confirmed empirically against a real Postgres error of each shape.
export function getPgErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;

  const cause = "cause" in error ? (error as { cause: unknown }).cause : undefined;
  if (typeof cause === "object" && cause !== null && "code" in cause && typeof (cause as { code: unknown }).code === "string") {
    return (cause as { code: string }).code;
  }

  // Fallback for a driver error passed in directly, unwrapped (e.g. a test double).
  if ("code" in error && typeof (error as { code: unknown }).code === "string") {
    return (error as { code: string }).code;
  }

  return undefined;
}
