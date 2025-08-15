import { z } from "zod";

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const [yStr, mStr, dStr] = s.split("-");
    const y = Number(yStr);
    const m = Number(mStr);
    const d = Number(dStr);
    if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }, "invalid_date");

export const getQuerySchema = z
  .union([
    z.object({ date: dateSchema }),
    z.object({ start: dateSchema, end: dateSchema }).refine((v) => v.start <= v.end, { message: "start_gt_end" }),
  ])
  .refine(
    (v) => {
      if ("date" in v) return true;
      const start = new Date(v.start + "T00:00:00.000Z");
      const end = new Date(v.end + "T00:00:00.000Z");
      const days = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
      return days <= 366;
    },
    { message: "range_too_large" }
  );

export const patchBodySchema = z.object({
  goal_override: z.number().int().min(0).nullable(),
});

export type GetQueryValidated = z.infer<typeof getQuerySchema>;
export type PatchBodyValidated = z.infer<typeof patchBodySchema>;
