import React, { useEffect, useState } from "react";
import { supabaseClient } from "@/db/supabase.client";

export interface AuthGuardProps {
  children?: React.ReactNode;
}

/**
 * Komponent chroniący strony - przekierowuje niezalogowanych użytkowników na `/auth/login`.
 * Renderuje `children` tylko gdy użytkownik jest zalogowany.
 */
export function AuthGuard({ children }: AuthGuardProps) {
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
          setIsCheckingSession(false);
        } else {
          setHasSession(false);
          setIsCheckingSession(false);

          // Store intended path for redirect after login
          const currentPath = window.location.pathname + window.location.search;
          localStorage.setItem("auth:intendedPath", currentPath);

          // Redirect to login
          window.location.assign("/auth/login");
        }
      } catch (err) {
        console.warn("Error during session check:", err);
        setIsCheckingSession(false);
        setHasSession(false);

        // Redirect to login on error
        window.location.assign("/auth/login");
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
        localStorage.setItem("auth:intendedPath", currentPath);
        window.location.assign("/auth/login");
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

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

  // If user is not logged in, don't render children (redirect is happening)
  if (!hasSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Przekierowywanie do loginu...</p>
        </div>
      </div>
    );
  }

  // User is logged in, render the protected content
  return <>{children}</>;
}
