export const prerender = false;

import type { APIRoute } from "astro";
import { auditLogsQuerySchema } from "../../../lib/validation/admin";
import { assertIsAdmin, ForbiddenError, listAuditLogs, UnauthorizedError } from "../../../lib/services/admin.service";

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const supabase = locals.supabase;
    await assertIsAdmin(supabase);

    const queryParams = Object.fromEntries(url.searchParams.entries());
    const parsed = auditLogsQuerySchema.safeParse(queryParams);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid query",
          details: parsed.error.flatten(),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const items = await listAuditLogs(supabase, parsed.data);
    return new Response(JSON.stringify({ items }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Log internal error details for developers; keep response generic
    // eslint-disable-next-line no-console
    console.error("[api/admin/audit-logs] GET failed", error);
    if (error instanceof UnauthorizedError) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (error instanceof ForbiddenError) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};


