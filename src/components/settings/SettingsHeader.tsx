import { useEffect, useState } from "react";
import { usePreferredLanguage } from "../../lib/usePreferredLanguage";
import { t } from "../../lib/i18n";

export function SettingsHeader() {
  const { language } = usePreferredLanguage();
  const [isHydrated, setIsHydrated] = useState(false);

  // Mark as hydrated after first render
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Update page title dynamically
  useEffect(() => {
    if (isHydrated && typeof window !== "undefined" && typeof document !== "undefined") {
      document.title = `${t("settings", language)} - 10x Flashcards`;
    }
  }, [language, isHydrated]);

  // Show loading state during SSR to prevent hydration mismatch
  if (!isHydrated) {
    return (
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account settings and security</p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("settings", language)}</h1>
      <p className="text-gray-600">{t("accountManagementDescription", language)}</p>
    </div>
  );
}
