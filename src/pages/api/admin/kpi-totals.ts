export const prerender = false;

import type { APIRoute } from "astro";
import { assertIsAdmin, ForbiddenError, getKpiTotals, UnauthorizedError } from "../../../lib/services/admin.service";

export const GET: APIRoute = async ({ locals }) => {
  try {
    const supabase = locals.supabase;
    await assertIsAdmin(supabase);

    const data = await getKpiTotals(supabase);
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Log internal error details for developers; keep response generic
    // eslint-disable-next-line no-console
    console.error("[api/admin/kpi-totals] GET failed", error);
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


