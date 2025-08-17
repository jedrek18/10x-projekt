import { useState, useCallback, memo, useEffect } from "react";
import { supabaseClient } from "../../db/supabase.client";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { t } from "../../lib/i18n";
import { usePreferredLanguage } from "../../lib/usePreferredLanguage";

export interface ChangePasswordFormModel {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface ChangePasswordFormErrors {
  current_password?: string;
  new_password?: string;
  confirm_password?: string;
  form?: string;
}

interface ChangePasswordFormProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const ChangePasswordForm = memo(function ChangePasswordForm({ onSuccess, onError }: ChangePasswordFormProps) {
  const [formData, setFormData] = useState<ChangePasswordFormModel>({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [errors, setErrors] = useState<ChangePasswordFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const { language } = usePreferredLanguage();

  // Mark as hydrated after first render
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const validateForm = (): boolean => {
    const newErrors: ChangePasswordFormErrors = {};

    if (!formData.current_password) {
      newErrors.current_password = t("currentPasswordRequired", language);
    }

    if (!formData.new_password) {
      newErrors.new_password = t("newPasswordRequired", language);
    } else if (formData.new_password.length < 8) {
      newErrors.new_password = t("newPasswordMinLength", language);
    } else if (formData.new_password === formData.current_password) {
      newErrors.new_password = t("newPasswordDifferent", language);
    }

    if (!formData.confirm_password) {
      newErrors.confirm_password = t("confirmPasswordRequired", language);
    } else if (formData.confirm_password !== formData.new_password) {
      newErrors.confirm_password = t("passwordsMustMatch", language);
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Get current user to get email
      const {
        data: { user },
        error: userError,
      } = await supabaseClient.auth.getUser();
      if (userError || !user?.email) {
        throw new Error("Failed to get user information");
      }

      // Reauthorize with current password
      const { error: reauthError } = await supabaseClient.auth.signInWithPassword({
        email: user.email,
        password: formData.current_password,
      });

      if (reauthError) {
        if (reauthError.message.includes("Invalid login credentials")) {
          setErrors({ current_password: t("incorrectCurrentPassword", language) });
        } else {
          throw new Error("Reauthorization failed: " + reauthError.message);
        }
        return;
      }

      // Update password
      const { error: updateError } = await supabaseClient.auth.updateUser({
        password: formData.new_password,
      });

      if (updateError) {
        throw new Error("Failed to update password: " + updateError.message);
      }

      // Sign out from all sessions
      await supabaseClient.auth.signOut({ scope: "global" });

      // Reset form
      setFormData({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });

      onSuccess?.();
    } catch (error) {
      console.error("Password change error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      setErrors({ form: errorMessage });
      onError?.(error instanceof Error ? error : new Error(errorMessage));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = useCallback(
    (field: keyof ChangePasswordFormModel) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
      // Clear field error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [errors]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isHydrated ? t("changePassword", language) : "Change Password"}</CardTitle>
        <CardDescription>
          {isHydrated
            ? t("changePasswordDescription", language)
            : "Update your password to keep your account secure. You will be signed out from all devices after changing your password."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.form && (
            <div
              className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md"
              role="alert"
              aria-live="polite"
            >
              {errors.form}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="current_password">{t("currentPassword", language)}</Label>
            <Input
              id="current_password"
              type="password"
              value={formData.current_password}
              onChange={handleInputChange("current_password")}
              disabled={isSubmitting}
              className={errors.current_password ? "border-red-500" : ""}
              aria-describedby={errors.current_password ? "current-password-error" : undefined}
              aria-invalid={!!errors.current_password}
            />
            {errors.current_password && (
              <p id="current-password-error" className="text-sm text-red-600" role="alert">
                {errors.current_password}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="new_password">{t("newPassword", language)}</Label>
            <Input
              id="new_password"
              type="password"
              value={formData.new_password}
              onChange={handleInputChange("new_password")}
              disabled={isSubmitting}
              className={errors.new_password ? "border-red-500" : ""}
              aria-describedby={errors.new_password ? "new-password-error" : undefined}
              aria-invalid={!!errors.new_password}
            />
            {errors.new_password && (
              <p id="new-password-error" className="text-sm text-red-600" role="alert">
                {errors.new_password}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password">{t("confirmNewPassword", language)}</Label>
            <Input
              id="confirm_password"
              type="password"
              value={formData.confirm_password}
              onChange={handleInputChange("confirm_password")}
              disabled={isSubmitting}
              className={errors.confirm_password ? "border-red-500" : ""}
              aria-describedby={errors.confirm_password ? "confirm-password-error" : undefined}
              aria-invalid={!!errors.confirm_password}
            />
            {errors.confirm_password && (
              <p id="confirm-password-error" className="text-sm text-red-600" role="alert">
                {errors.confirm_password}
              </p>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Changing Password...
              </>
            ) : (
              t("changePassword", language)
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
});
