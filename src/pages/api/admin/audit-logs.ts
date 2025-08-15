export const prerender = false;

import type { APIRoute } from "astro";
import { auditLogsQuerySchema } from "../../../lib/validation/admin";
import { assertIsAdmin, ForbiddenError, listAuditLogs, UnauthorizedError } from "../../../lib/services/admin.service";
import { json, errorJson } from "../../../lib/http";

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const supabase = locals.supabase;
    await assertIsAdmin(supabase);

    const queryParams = Object.fromEntries(url.searchParams.entries());
    const parsed = auditLogsQuerySchema.safeParse(queryParams);
    if (!parsed.success) {
      return errorJson("Invalid query", "validation_failed", 400, parsed.error.flatten());
    }

    const items = await listAuditLogs(supabase, parsed.data);
    return json({ items }, 200);
  } catch (error) {
    // Log internal error details for developers; keep response generic
    // eslint-disable-next-line no-console
    console.error("[api/admin/audit-logs] GET failed", error);
    if (error instanceof UnauthorizedError) {
      return errorJson("Unauthorized", "unauthorized", 401);
    }
    if (error instanceof ForbiddenError) {
      return errorJson("Forbidden", "forbidden", 403);
    }
    return errorJson("Internal Server Error", "server_error", 500);
  }
};


