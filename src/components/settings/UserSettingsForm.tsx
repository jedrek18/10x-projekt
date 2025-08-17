import React, { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { NumberField } from "./NumberField";
import { usePreferredLanguage } from "../../lib/usePreferredLanguage";
import { t } from "../../lib/i18n";
import type { UserSettingsDTO, UserSettingsUpdateCommand } from "../../types";

export interface UserSettingsFormState {
  daily_goal: number | "";
  new_limit: number | "";
}

export interface UserSettingsFormErrors {
  daily_goal?: string;
  new_limit?: string;
}

export interface UserSettingsFormProps {
  initial: UserSettingsDTO;
  onSubmit: (payload: UserSettingsUpdateCommand) => Promise<void>;
  busy?: boolean;
}

export function UserSettingsForm({ initial, onSubmit, busy = false }: UserSettingsFormProps) {
  const { language } = usePreferredLanguage();
  const [isHydrated, setIsHydrated] = useState(false);

  // Mark as hydrated after first render
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const [formState, setFormState] = useState<UserSettingsFormState>({
    daily_goal: initial.daily_goal,
    new_limit: initial.new_limit,
  });

  const [errors, setErrors] = useState<UserSettingsFormErrors>({});

  // Sync form state with initial data
  useEffect(() => {
    setFormState({
      daily_goal: initial.daily_goal,
      new_limit: initial.new_limit,
    });
    setErrors({});
  }, [initial]);

  const validateField = (field: keyof UserSettingsFormState, value: number | ""): string | undefined => {
    if (value === "") return undefined;

    const numValue = Number(value);
    if (!Number.isInteger(numValue)) {
      return t("integer", isHydrated ? language : "en");
    }

    if (field === "daily_goal") {
      if (numValue < 1 || numValue > 200) {
        return t("dailyGoalError", isHydrated ? language : "en");
      }
    }

    if (field === "new_limit") {
      if (numValue < 0 || numValue > 50) {
        return t("newLimitError", isHydrated ? language : "en");
      }
    }

    return undefined;
  };

  const handleFieldChange = (field: keyof UserSettingsFormState, value: number | "") => {
    const newFormState = {
      ...formState,
      [field]: value,
    };

    setFormState(newFormState);

    // Validate field in real-time if value is not empty
    if (value !== "") {
      const fieldError = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: fieldError }));
    } else {
      // Clear field error when user clears the field
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: UserSettingsFormErrors = {};

    const dailyGoalError = validateField("daily_goal", formState.daily_goal);
    if (dailyGoalError) newErrors.daily_goal = dailyGoalError;

    const newLimitError = validateField("new_limit", formState.new_limit);
    if (newLimitError) newErrors.new_limit = newLimitError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      // Focus first error field
      if (typeof window !== "undefined" && typeof document !== "undefined") {
        const firstErrorField = document.querySelector('[aria-invalid="true"]') as HTMLElement;
        if (firstErrorField) {
          firstErrorField.focus();
        }
      }
      return;
    }

    if (!hasChanges) {
      return;
    }

    const payload: UserSettingsUpdateCommand = {};

    if (formState.daily_goal !== initial.daily_goal) {
      payload.daily_goal = Number(formState.daily_goal);
    }

    if (formState.new_limit !== initial.new_limit) {
      payload.new_limit = Number(formState.new_limit);
    }

    // Ensure at least one field is being updated
    if (Object.keys(payload).length === 0) {
      return;
    }

    try {
      await onSubmit(payload);
      // Form will be reset by parent component when settings are updated
    } catch (error) {
      // Error handling is done by parent component
      console.error("Form submission error:", error);
    }
  };

  const hasChanges =
    Number(formState.daily_goal) !== initial.daily_goal || Number(formState.new_limit) !== initial.new_limit;
  const hasErrors = Object.values(errors).some((error) => error !== undefined);
  const isFormValid = hasChanges && !hasErrors;

  // Auto-hide success message after 3 seconds
  useEffect(() => {
    if (Object.keys(errors).length === 0 && !busy && hasChanges) {
      const timer = setTimeout(() => {
        // This will be handled by parent component
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [errors, busy, hasChanges]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <NumberField
        label={t("dailyGoal", isHydrated ? language : "en")}
        value={formState.daily_goal}
        onChange={(value) => handleFieldChange("daily_goal", value)}
        min={1}
        max={200}
        step={1}
        description={t("dailyGoalDescription", isHydrated ? language : "en")}
        error={errors.daily_goal}
        inputId="daily-goal"
      />

      <NumberField
        label={t("newLimit", isHydrated ? language : "en")}
        value={formState.new_limit}
        onChange={(value) => handleFieldChange("new_limit", value)}
        min={0}
        max={50}
        step={1}
        description={t("newLimitDescription", isHydrated ? language : "en")}
        error={errors.new_limit}
        inputId="new-limit"
      />

      <div className="flex justify-end">
        <Button type="submit" disabled={!isFormValid || !hasChanges || busy} className="min-w-[100px]">
          {busy ? t("saving", isHydrated ? language : "en") : t("save", isHydrated ? language : "en")}
        </Button>
      </div>
    </form>
  );
}
