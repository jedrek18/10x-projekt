import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { PasswordField } from "./PasswordField";
import { supabaseClient } from "@/db/supabase.client";
import { usePreferredLanguage } from "@/lib/usePreferredLanguage";
import { t } from "@/lib/i18n";
import type { AuthSignInCommand } from "@/types";
import type { LoginFormValues, AuthFormState } from "./types";

interface LoginFormProps {
  redirectTo?: string;
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const { language } = usePreferredLanguage();
  const [formState, setFormState] = useState<AuthFormState<LoginFormValues>>({
    values: { email: "", password: "" },
    errors: {},
    isSubmitting: false,
    redirectTo,
  });

  const emailInputRef = useRef<HTMLInputElement>(null);

  // Validate individual fields
  const validateField = (name: keyof LoginFormValues, value: string): string | undefined => {
    switch (name) {
      case "email":
        if (!value.trim()) return t("emailRequired", language);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return t("invalidEmailFormat", language);
        return undefined;
      case "password":
        if (!value) return t("passwordRequired", language);
        if (value.length < 8) return t("passwordTooShort", language);
        return undefined;
      default:
        return undefined;
    }
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const fieldName = name as keyof LoginFormValues;

    setFormState((prev) => ({
      ...prev,
      values: { ...prev.values, [fieldName]: value },
      errors: { ...prev.errors, [fieldName]: undefined, form: undefined },
    }));
  };

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (isFormValid && !formState.isSubmitting) {
        handleSubmit(e as any);
      }
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const newErrors: FieldErrors<LoginFormValues> = {};
    Object.entries(formState.values).forEach(([key, value]) => {
      const error = validateField(key as keyof LoginFormValues, value);
      if (error) newErrors[key as keyof LoginFormValues] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setFormState((prev) => ({ ...prev, errors: newErrors }));
      return;
    }

    setFormState((prev) => ({ ...prev, isSubmitting: true, errors: {} }));

    try {
      const command: AuthSignInCommand = {
        email: formState.values.email,
        password: formState.values.password,
      };

      const { data, error } = await supabaseClient.auth.signInWithPassword(command);

      if (error) {
        setFormState((prev) => ({
          ...prev,
          errors: { form: t("invalidCredentials", language) },
          isSubmitting: false,
        }));
        return;
      }

      if (data.session) {
        // Clear any stored intended path
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("auth:intendedPath");
        }

        // Redirect to intended destination or default
        const redirectUrl = redirectTo || "/flashcards";
        if (typeof window !== "undefined") {
          window.location.assign(redirectUrl);
        }
      }
    } catch (err) {
      setFormState((prev) => ({
        ...prev,
        errors: { form: "Problem z połączeniem. Spróbuj ponownie." },
        isSubmitting: false,
      }));
    }
  };

  // Check for existing session and redirect if already logged in + set focus
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      if (session) {
        const redirectUrl = redirectTo || "/flashcards";
        if (typeof window !== "undefined") {
          window.location.assign(redirectUrl);
        }
      } else {
        // Set focus on email field after component mounts and no session exists
        setTimeout(() => {
          emailInputRef.current?.focus();
        }, 100);
      }
    };
    checkSession();
  }, [redirectTo]);

  const isFormValid =
    !Object.values(formState.errors).some((error) => error) &&
    formState.values.email.trim() &&
    formState.values.password;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formState.errors.form && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3" role="alert" aria-live="polite">
          <p className="text-sm text-red-800">{formState.errors.form}</p>
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          {t("email", language)}
        </label>
        <input
          ref={emailInputRef}
          type="email"
          id="email"
          name="email"
          value={formState.values.email}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            formState.errors.email ? "border-red-500" : ""
          }`}
          aria-describedby={formState.errors.email ? "email-error" : undefined}
          autoComplete="email"
          required
        />
        {formState.errors.email && (
          <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
            {formState.errors.email}
          </p>
        )}
      </div>

      <PasswordField
        id="password"
        name="password"
        value={formState.values.password}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        error={formState.errors.password}
        label={t("password", language)}
        autoComplete="current-password"
        required
      />

      <Button type="submit" className="w-full" disabled={!isFormValid || formState.isSubmitting}>
        {formState.isSubmitting ? (
          <div className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            {t("loading", language)}
          </div>
        ) : (
          t("login", language)
        )}
      </Button>
    </form>
  );
}
