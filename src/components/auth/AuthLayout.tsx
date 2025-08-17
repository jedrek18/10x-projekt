import { usePreferredLanguage } from "../../lib/usePreferredLanguage";
import { t } from "../../lib/i18n";

export interface AuthLayoutProps {
  isLogin?: boolean;
  messageFromRedirect?: string;
  children: React.ReactNode;
}

export function AuthLayout({ isLogin = false, messageFromRedirect, children }: AuthLayoutProps) {
  const { language } = usePreferredLanguage();

  const title = isLogin ? t("loginTitle", language) : t("signupTitle", language);
  const subtitle = isLogin ? t("loginSubtitle", language) : t("signupSubtitle", language);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
          {subtitle && <p className="text-sm text-gray-600 mb-4">{subtitle}</p>}
          {messageFromRedirect && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
              <p className="text-sm text-blue-800" aria-live="polite">
                {messageFromRedirect}
              </p>
            </div>
          )}
        </div>

        <div className="bg-white py-8 px-6 shadow-md rounded-lg">{children}</div>

        {/* Navigation links */}
        <div className="text-center">
          {isLogin ? (
            <p className="text-sm text-gray-600">
              {t("noAccount", language)}{" "}
              <a
                href="/auth/signup"
                className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
              >
                {t("signup", language)}
              </a>
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              {t("haveAccount", language)}{" "}
              <a
                href="/auth/login"
                className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
              >
                {t("login", language)}
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
