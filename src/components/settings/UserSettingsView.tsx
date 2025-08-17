import React, { useState, useEffect } from "react";
import { AuthGuard } from "../auth/AuthGuard";
import { UserSettingsForm } from "./UserSettingsForm";
import { I18nSelector } from "./I18nSelector";
import { InlineAlert } from "./InlineAlert";
import { useUserSettings } from "../../lib/hooks/useUserSettings";
import { usePreferredLanguage } from "../../lib/usePreferredLanguage";
import { t } from "../../lib/i18n";
import type { UserSettingsDTO, UserSettingsUpdateCommand } from "../../types";
import type { LanguageCode } from "../../lib/i18n";

export type UiLanguage = LanguageCode;

export interface SettingsViewModel {
  settings: UserSettingsDTO | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  lastSavedAt?: number;
  ui: {
    language: UiLanguage;
  };
}

export function UserSettingsView() {
  const { language } = usePreferredLanguage();
  const [isHydrated, setIsHydrated] = useState(false);

  const [viewModel, setViewModel] = useState<SettingsViewModel>({
    settings: null,
    loading: true,
    saving: false,
    error: null,
    ui: {
      language: "en", // Default value to prevent hydration mismatch
    },
  });

  // Mark as hydrated after first render
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const { load, update } = useUserSettings();

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setViewModel((prev) => ({ ...prev, loading: true, error: null }));
        const settings = await load();
        setViewModel((prev) => ({
          ...prev,
          settings,
          loading: false,
        }));
      } catch (error) {
        console.error("Failed to load settings:", error);
        setViewModel((prev) => ({
          ...prev,
          loading: false,
          error: t("settingsLoadError", isHydrated ? language : "en"),
        }));
      }
    };

    loadSettings();
  }, [load]);

  // Sync UI preferences after hydration
  useEffect(() => {
    if (isHydrated) {
      setViewModel((prev) => ({
        ...prev,
        ui: { language },
      }));
    }
  }, [language, isHydrated]);

  const handleSubmit = async (payload: UserSettingsUpdateCommand) => {
    try {
      setViewModel((prev) => ({ ...prev, saving: true, error: null }));
      const updatedSettings = await update(payload);
      setViewModel((prev) => ({
        ...prev,
        settings: updatedSettings,
        saving: false,
        lastSavedAt: Date.now(), // This is client-side only, so no hydration issue
      }));
    } catch (error) {
      console.error("Failed to update settings:", error);
      setViewModel((prev) => ({
        ...prev,
        saving: false,
        error: t("settingsSaveError", isHydrated ? language : "en"),
      }));
    }
  };

  const handleLanguageChange = (newLanguage: UiLanguage) => {
    // Language change is handled by I18nSelector component
    // which uses usePreferredLanguage internally
  };

  const clearError = () => {
    setViewModel((prev) => ({ ...prev, error: null }));
  };

  if (viewModel.loading) {
    return (
      <div className="flex items-center justify-center py-12" suppressHydrationWarning>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">
            {isHydrated ? t("loadingSettings", language) : t("loadingSettings", "en")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="space-y-8" suppressHydrationWarning>
        {viewModel.error && <InlineAlert kind="error" message={viewModel.error} onClose={clearError} />}

        {viewModel.lastSavedAt && (
          <InlineAlert
            kind="success"
            message={t("settingsSaved", isHydrated ? language : "en")}
            onClose={() => setViewModel((prev) => ({ ...prev, lastSavedAt: undefined }))}
            autoHide={true}
            autoHideDelay={3000}
          />
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {t("studySettings", isHydrated ? language : "en")}
          </h2>

          {viewModel.settings && (
            <UserSettingsForm initial={viewModel.settings} onSubmit={handleSubmit} busy={viewModel.saving} />
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {t("interfacePreferences", isHydrated ? language : "en")}
          </h2>

          <div className="space-y-6">
            <I18nSelector value={viewModel.ui.language} onChange={handleLanguageChange} />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
