import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the Auth context of the function
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: {
        headers: { Authorization: req.headers.get("Authorization")! },
      },
    });

    // Get the user from the JWT token
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create admin client for database operations
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const userId = user.id;

    // Delete all user data from database tables in correct order
    // 1. Delete audit log entries (acted_by references)
    const { error: auditError } = await adminClient.from("audit_log").delete().eq("acted_by", userId);

    if (auditError) {
      console.error("Failed to delete audit log entries:", auditError);
    }

    // 2. Delete event log entries
    const { error: eventError } = await adminClient.from("event_log").delete().eq("user_id", userId);

    if (eventError) {
      console.error("Failed to delete event log entries:", eventError);
    }

    // 3. Delete user daily progress
    const { error: progressError } = await adminClient.from("user_daily_progress").delete().eq("user_id", userId);

    if (progressError) {
      console.error("Failed to delete user daily progress:", progressError);
    }

    // 4. Delete user settings
    const { error: settingsError } = await adminClient.from("user_settings").delete().eq("user_id", userId);

    if (settingsError) {
      console.error("Failed to delete user settings:", settingsError);
    }

    // 5. Delete all flashcards (including soft-deleted)
    const { error: flashcardsError } = await adminClient.from("flashcards").delete().eq("user_id", userId);

    if (flashcardsError) {
      console.error("Failed to delete flashcards:", flashcardsError);
    }

    // 6. Delete profile
    const { error: profileError } = await adminClient.from("profiles").delete().eq("user_id", userId);

    if (profileError) {
      console.error("Failed to delete profile:", profileError);
    }

    // 7. Delete the user from Supabase Auth
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error("Failed to delete user from Auth:", deleteUserError);
      return new Response(JSON.stringify({ error: "Failed to delete user account" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        message: "Account deleted successfully",
        user_id: userId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in delete-account function:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
