export const prerender = false;

import type { APIRoute } from "astro";
import { errorJson, json } from "../../../lib/http";

export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    const supabase = locals.supabase;

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return errorJson("Unauthorized", "unauthorized", 401);
    }

    // Get session for authorization header
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return errorJson("No active session", "no_session", 401);
    }

    // Call the Edge Function to delete the account
    const supabaseUrl = import.meta.env.SUPABASE_URL;
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/delete-account`;

    const response = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[api/auth/account] Edge function failed:", response.status, errorData);

      if (response.status === 401) {
        return errorJson("Unauthorized", "unauthorized", 401);
      } else if (response.status === 500) {
        return errorJson("Failed to delete account", "deletion_failed", 500);
      } else {
        return errorJson("Account deletion failed", "deletion_failed", response.status);
      }
    }

    // Sign out the user from all sessions
    await supabase.auth.signOut({ scope: "global" });

    return json(
      {
        message: "Account deleted successfully",
        user_id: user.id,
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("[api/auth/account] DELETE failed:", error);
    return errorJson("Internal Server Error", "server_error", 500);
  }
};
