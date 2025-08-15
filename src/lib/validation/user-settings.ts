import { z } from "zod";

export const userSettingsPatchSchema = z.object({
  daily_goal: z.number().int().min(1).max(200).optional(),
  new_limit: z.number().int().min(0).max(50).optional(),
}).refine((v) => v.daily_goal !== undefined || v.new_limit !== undefined, {
  message: "At least one of daily_goal or new_limit must be provided",
});


