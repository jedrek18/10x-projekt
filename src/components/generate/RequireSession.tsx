import React, { useEffect, useState } from "react";
import { supabaseClient } from "@/db/supabase.client";

export interface RequireSessionProps {
  children: React.ReactNode;
}

/**
 * Komponent chroniący widok Generate - przekierowuje niezalogowanych użytkowników na `/auth/login`.
 * Renderuje `children` tylko gdy użytkownik jest zalogowany.
 */
export function RequireSession({ children }: RequireSessionProps) {
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabaseClient.auth.getSession();

        if (error) {
          console.warn("Error checking session:", error);
          setIsCheckingSession(false);
          return;
        }

        if (session) {
          // Verify that the user actually exists in the database
          const {
            data: { user },
            error: userError,
          } = await supabaseClient.auth.getUser();

          if (userError || !user) {
            console.warn("User not found in database, clearing session");
            await supabaseClient.auth.signOut({ scope: "global" });
            setHasSession(false);
            setIsCheckingSession(false);

            // Store intended path for redirect after login
            const currentPath = window.location.pathname + window.location.search;
            if (typeof window !== "undefined") {
              window.localStorage.setItem("auth:intendedPath", currentPath);
            }

            // Redirect to login
            if (typeof window !== "undefined") {
              window.location.assign("/auth/login");
            }
            return;
          }

          setHasSession(true);
          setIsCheckingSession(false);
        } else {
          setHasSession(false);
          setIsCheckingSession(false);

          // Store intended path for redirect after login
          const currentPath = window.location.pathname + window.location.search;
          if (typeof window !== "undefined") {
            window.localStorage.setItem("auth:intendedPath", currentPath);
          }

          // Redirect to login
          if (typeof window !== "undefined") {
            window.location.assign("/auth/login");
          }
        }
      } catch (err) {
        console.warn("Error during session check:", err);
        setIsCheckingSession(false);
        setHasSession(false);

        // Redirect to login on error
        if (typeof window !== "undefined") {
          window.location.assign("/auth/login");
        }
      }
    };

    checkSession();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        setHasSession(true);
        setIsCheckingSession(false);
      } else if (event === "SIGNED_OUT") {
        setHasSession(false);
        setIsCheckingSession(false);

        // Store intended path and redirect to login
        const currentPath = window.location.pathname + window.location.search;
        if (typeof window !== "undefined") {
          window.localStorage.setItem("auth:intendedPath", currentPath);
          window.location.assign("/auth/login");
        }
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (isCheckingSession) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Sprawdzanie sesji...</p>
        </div>
      </div>
    );
  }

  if (!hasSession) {
    return null; // Redirect is handled in useEffect
  }

  return <>{children}</>;
}
