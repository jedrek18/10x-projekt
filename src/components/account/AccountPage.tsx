import { useEffect, useState } from "react";
import { supabaseClient } from "../../db/supabase.client";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { SignOutButton } from "./SignOutButton";
import { DeleteAccountSection } from "./DeleteAccountSection";
import { SessionInfoCard } from "./SessionInfoCard";
import { useToast } from "../../lib/hooks/useToast";
import { t } from "../../lib/i18n";
import { usePreferredLanguage } from "../../lib/usePreferredLanguage";

export interface AccountViewState {
  isBusy: boolean;
}

export function AccountSettingsView() {
  const [state, setState] = useState<AccountViewState>({
    isBusy: false,
  });
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const { toast } = useToast();
  const { language } = usePreferredLanguage();

  // Mark as hydrated after first render
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabaseClient.auth.getSession();

      if (error || !session) {
        // Redirect to login if no session
        window.location.assign("/auth/login");
        return;
      }

      const {
        data: { user },
      } = await supabaseClient.auth.getUser();
      setUser(user);
    } catch (error) {
      console.error("Session check failed:", error);
      window.location.assign("/auth/login");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChanged = () => {
    setState((prev) => ({ ...prev, isBusy: true }));
    toast({
      title: t("passwordChanged", language),
      description: t("passwordChangedDescription", language),
      variant: "default",
    });
    // Redirect to login after password change
    setTimeout(() => {
      window.location.assign("/auth/login");
    }, 2000);
  };

  const handleSignedOut = () => {
    toast({
      title: t("signOut", language),
      description: "You have been successfully signed out.",
      variant: "default",
    });
    window.location.assign("/auth/login");
  };

  const handleAccountDeleted = () => {
    setState((prev) => ({ ...prev, isBusy: true }));
    toast({
      title: t("accountDeleted", language),
      description: t("accountDeletedDescription", language),
      variant: "default",
    });
    // Redirect to landing page
    setTimeout(() => {
      window.location.assign("/");
    }, 2000);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="sr-only">{isHydrated ? t("checkingSession", language) : "Checking session..."}</span>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          {isHydrated ? t("accountManagement", language) : "Account Management"}
        </h2>
        <p className="text-gray-600">
          {isHydrated ? t("accountManagementDescription", language) : "Manage your account settings and security"}
        </p>
      </div>

      <SessionInfoCard user={user} />

      <div className="space-y-6">
        <ChangePasswordForm
          onSuccess={handlePasswordChanged}
          onError={(error) => {
            toast({
              title: isHydrated ? t("error", language) : "Error",
              description: error.message,
              variant: "destructive",
            });
          }}
        />

        <SignOutButton onSignedOut={handleSignedOut} />

        <DeleteAccountSection onDeleted={handleAccountDeleted} />
      </div>
    </div>
  );
}
