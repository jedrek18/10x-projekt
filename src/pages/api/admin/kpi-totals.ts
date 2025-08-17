export const prerender = false;

import type { APIRoute } from "astro";
import { assertIsAdmin, ForbiddenError, getKpiTotals, UnauthorizedError } from "../../../lib/services/admin.service";
import { json, errorJson } from "../../../lib/http";

export const GET: APIRoute = async ({ locals }) => {
  try {
    const supabase = locals.supabase;
    await assertIsAdmin(supabase);

    const data = await getKpiTotals(supabase);
    return json(data, 200);
  } catch (error) {
    // Log internal error details for developers; keep response generic
    // eslint-disable-next-line no-console
    console.error("[api/admin/kpi-totals] GET failed", error);
    if (error instanceof UnauthorizedError) {
      return errorJson("Unauthorized", "unauthorized", 401);
    }
    if (error instanceof ForbiddenError) {
      return errorJson("Forbidden", "forbidden", 403);
    }
    return errorJson("Internal Server Error", "server_error", 500);
  }
};
