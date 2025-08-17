import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { t } from "../../lib/i18n";
import { usePreferredLanguage } from "../../lib/usePreferredLanguage";
import { useState, useEffect } from "react";

interface SessionInfoCardProps {
  user: any;
}

export function SessionInfoCard({ user }: SessionInfoCardProps) {
  const { language } = usePreferredLanguage();
  const [isHydrated, setIsHydrated] = useState(false);

  // Mark as hydrated after first render
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isHydrated ? t("accountInformation", language) : "Account Information"}
          <Badge variant="secondary">{isHydrated ? t("sessionActive", language) : "Active Session"}</Badge>
        </CardTitle>
        <CardDescription>
          {isHydrated
            ? t("accountInformationDescription", language)
            : "Your current account details and session information"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">{isHydrated ? t("email", language) : "Email"}</label>
            <p className="text-sm text-gray-900">{user.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">
              {isHydrated ? t("accountCreated", language) : "Account Created"}
            </label>
            <p className="text-sm text-gray-900">{formatDate(user.created_at)}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">
              {isHydrated ? t("lastSignIn", language) : "Last Sign In"}
            </label>
            <p className="text-sm text-gray-900">{user.last_sign_in_at ? formatDate(user.last_sign_in_at) : "Never"}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">
              {isHydrated ? t("userId", language) : "User ID"}
            </label>
            <p className="text-sm text-gray-900 font-mono text-xs">{user.id}</p>
          </div>
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-gray-500">
            {isHydrated
              ? t("sessionSecureMessage", language)
              : "Your session is active and secure. You can manage your account settings below."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
