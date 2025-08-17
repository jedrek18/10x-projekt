import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_KEY;

export const supabaseClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);

export type SupabaseClient = import("@supabase/supabase-js").SupabaseClient<Database>;
