import type { SupabaseClient } from "../../db/supabase.client";
import type { AdminAuditLogDTO, AdminKpiTotalsDTO } from "../../types";
import type { AuditLogsQuery } from "../validation/admin";

export type TypedSupabase = SupabaseClient;

export class ForbiddenError extends Error {}
export class UnauthorizedError extends Error {}

export async function assertIsAdmin(supabase: TypedSupabase): Promise<void> {
  const { data: authUser, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser?.user) {
    throw new UnauthorizedError("Unauthorized");
  }

  const userId = authUser.user.id;
  const { data, error } = await supabase.from("profiles").select("is_admin").eq("user_id", userId).single();

  if (error) {
    throw new Error(`Failed to verify admin: ${error.message}`);
  }

  if (!data?.is_admin) {
    throw new ForbiddenError("Forbidden");
  }
}

export async function listAuditLogs(supabase: TypedSupabase, filters: AuditLogsQuery): Promise<AdminAuditLogDTO[]> {
  let query = supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .range(filters.offset, filters.offset + filters.limit - 1);

  if (filters.action) {
    query = query.eq("action", filters.action);
  }
  if (filters.user_id) {
    query = query.eq("acted_by", filters.user_id);
  }
  if (filters.card_id) {
    query = query.eq("card_id", filters.card_id);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch audit logs: ${error.message}`);
  }
  return data ?? [];
}

export async function getKpiTotals(supabase: TypedSupabase): Promise<AdminKpiTotalsDTO> {
  const { data, error } = await supabase.from("kpi_totals").select("*").single();
  if (error) {
    throw new Error(`Failed to fetch KPI totals: ${error.message}`);
  }
  return data as AdminKpiTotalsDTO;
}
