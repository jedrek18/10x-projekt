import { useState, useEffect } from "react";
import { supabaseClient } from "../../db/supabase.client";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { t, tWithParams } from "../../lib/i18n";
import { usePreferredLanguage } from "../../lib/usePreferredLanguage";

export interface DeleteAccountFormModel {
  password: string;
  confirm_phrase: string;
}

export interface DeleteAccountUiState {
  isOpen: boolean;
  isSubmitting: boolean;
  cooldownEndsAt: number | null;
  error?: string;
}

interface DeleteAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function DeleteAccountModal({ open, onOpenChange, onDeleted }: DeleteAccountModalProps) {
  const [formData, setFormData] = useState<DeleteAccountFormModel>({
    password: "",
    confirm_phrase: "",
  });
  const [state, setState] = useState<DeleteAccountUiState>({
    isOpen: open,
    isSubmitting: false,
    cooldownEndsAt: null,
  });
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const { language } = usePreferredLanguage();

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setFormData({
        password: "",
        confirm_phrase: "",
      });
      setState((prev) => ({ ...prev, error: undefined }));
    }
  }, [open]);

  useEffect(() => {
    if (!state.cooldownEndsAt) {
      setTimeRemaining(30);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((state.cooldownEndsAt! - Date.now()) / 1000));
      setTimeRemaining(remaining);

      if (remaining === 0) {
        setState((prev) => ({ ...prev, cooldownEndsAt: null }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [state.cooldownEndsAt]);

  const validateForm = (): boolean => {
    if (!formData.password) {
      setState((prev) => ({ ...prev, error: t("deleteAccountPasswordRequired", language) }));
      return false;
    }

    if (formData.confirm_phrase !== "delete") {
      setState((prev) => ({ ...prev, error: t("deleteAccountConfirmPhraseError", language) }));
      return false;
    }

    if (state.cooldownEndsAt && Date.now() < state.cooldownEndsAt) {
      setState((prev) => ({ ...prev, error: t("deleteAccountCooldownDescription", language) }));
      return false;
    }

    setState((prev) => ({ ...prev, error: undefined }));
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setState((prev) => ({ ...prev, isSubmitting: true, error: undefined }));

    try {
      // Get current user to get email
      const {
        data: { user },
        error: userError,
      } = await supabaseClient.auth.getUser();
      if (userError || !user?.email) {
        throw new Error("Failed to get user information");
      }

      // Reauthorize with password
      const { error: reauthError } = await supabaseClient.auth.signInWithPassword({
        email: user.email,
        password: formData.password,
      });

      if (reauthError) {
        if (reauthError.message.includes("Invalid login credentials")) {
          const newFailedAttempts = failedAttempts + 1;
          setFailedAttempts(newFailedAttempts);

          if (newFailedAttempts >= 3) {
            // Start cooldown after 3 failed attempts
            const cooldownEndsAt = Date.now() + 30000; // 30 seconds
            setState((prev) => ({
              ...prev,
              error: t("deleteAccountCooldownDescription", language),
              cooldownEndsAt,
            }));
            setFailedAttempts(0); // Reset for next time
          } else {
            setState((prev) => ({ ...prev, error: t("incorrectCurrentPassword", language) }));
          }
        } else {
          throw new Error("Reauthorization failed: " + reauthError.message);
        }
        return;
      }

      // Get session for API call
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      if (!session) {
        throw new Error("No active session found");
      }

      // Call delete account API
      const response = await fetch("/api/auth/account", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication failed");
        } else if (response.status === 403) {
          throw new Error("You don't have permission to delete this account");
        } else if (response.status === 409) {
          throw new Error("Account deletion is not allowed at this time");
        } else {
          throw new Error(`Failed to delete account: ${response.statusText}`);
        }
      }

      // Sign out from all sessions
      await supabaseClient.auth.signOut({ scope: "global" });

      // Reset form
      setFormData({
        password: "",
        confirm_phrase: "",
      });

      onOpenChange(false);
      onDeleted?.();
    } catch (error) {
      console.error("Account deletion error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      setState((prev) => ({ ...prev, error: errorMessage }));
    } finally {
      setState((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleInputChange = (field: keyof DeleteAccountFormModel) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    // Clear error when user starts typing
    if (state.error) {
      setState((prev) => ({ ...prev, error: undefined }));
    }
  };

  const isCooldownActive = state.cooldownEndsAt && Date.now() < state.cooldownEndsAt;
  const isSubmitDisabled = isCooldownActive || state.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-800">{t("deleteAccountModalTitle", language)}</DialogTitle>
          <DialogDescription className="text-red-700">{t("deleteAccountModalDescription", language)}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {state.error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">{state.error}</div>
          )}

          {isCooldownActive && (
            <div className="p-3 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-md">
              {tWithParams("deleteAccountCooldown", { time: timeRemaining.toString() }, language)}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="delete-password">{t("deleteAccountPassword", language)}</Label>
            <Input
              id="delete-password"
              type="password"
              value={formData.password}
              onChange={handleInputChange("password")}
              disabled={state.isSubmitting}
              placeholder={t("deleteAccountPasswordPlaceholder", language)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-phrase">{t("deleteAccountConfirmPhrase", language)}</Label>
            <Input
              id="confirm-phrase"
              type="text"
              value={formData.confirm_phrase}
              onChange={handleInputChange("confirm_phrase")}
              disabled={state.isSubmitting}
              placeholder={t("deleteAccountConfirmPhrasePlaceholder", language)}
              className="font-mono"
            />
            <p className="text-xs text-gray-500">{t("deleteAccountConfirmPhraseDescription", language)}</p>
          </div>

          <DialogFooter className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={state.isSubmitting}>
              {t("cancel", language)}
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitDisabled}>
              {state.isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t("deletingAccount", language)}
                </>
              ) : (
                t("deleteAccount", language)
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
