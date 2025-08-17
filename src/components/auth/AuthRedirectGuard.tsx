import React, { useEffect, useState } from "react";
import { supabaseClient } from "@/db/supabase.client";

export interface AuthRedirectGuardProps {
  redirectTo?: string;
  children?: React.ReactNode;
}

/**
 * Komponent efektowy - wykrywa aktywną sesję i przekierowuje z `/auth/*` na `redirectTo || /flashcards`.
 * Renderuje `children` tylko gdy brak sesji (użytkownik nie jest zalogowany).
 */
export function AuthRedirectGuard({ redirectTo, children }: AuthRedirectGuardProps) {
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
          setHasSession(true);

          // Clear any stored intended path since user is already logged in
          if (typeof window !== "undefined") {
            window.localStorage.removeItem("auth:intendedPath");
          }

          // Redirect to intended destination or default
          const redirectUrl = redirectTo || "/flashcards";
          if (typeof window !== "undefined") {
            window.location.assign(redirectUrl);
          }
        } else {
          setHasSession(false);
          setIsCheckingSession(false);
        }
      } catch (err) {
        console.warn("Error during session check:", err);
        setIsCheckingSession(false);
      }
    };

    checkSession();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        setHasSession(true);

        // Clear any stored intended path
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("auth:intendedPath");
        }

        // Redirect to intended destination or default
        const redirectUrl = redirectTo || "/flashcards";
        if (typeof window !== "undefined") {
          window.location.assign(redirectUrl);
        }
      } else if (event === "SIGNED_OUT") {
        setHasSession(false);
        setIsCheckingSession(false);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [redirectTo]);

  // Show loading state while checking session
  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Sprawdzanie sesji...</p>
        </div>
      </div>
    );
  }

  // If user has session, don't render children (redirect is happening)
  if (hasSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Przekierowywanie...</p>
        </div>
      </div>
    );
  }

  // User is not logged in, render the auth form
  return <>{children}</>;
}
