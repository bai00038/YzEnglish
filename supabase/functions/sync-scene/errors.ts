// Typed error carrying the HTTP status it should produce, kept separate from
// the message so 500s can log full detail server-side while returning a
// generic message to the caller (never service_role/SYNC_SECRET or raw
// driver internals).
export class SyncError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "SyncError";
    this.status = status;
  }
}

export function errorResponse(err: unknown, corsHeaders: Record<string, string>): Response {
  const status = err instanceof SyncError ? err.status : 500;
  const message = err instanceof SyncError ? err.message : "Internal server error.";

  return new Response(
    JSON.stringify({ success: false, message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
