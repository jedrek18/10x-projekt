import { useState } from "react";
import { supabaseClient } from "../../db/supabase.client";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";
import { t } from "../../lib/i18n";
import { usePreferredLanguage } from "../../lib/usePreferredLanguage";

interface SignOutButtonProps {
  scope?: "local" | "global";
  onSignedOut?: () => void;
}

export function SignOutButton({ scope = "local", onSignedOut }: SignOutButtonProps) {
  const [selectedScope, setSelectedScope] = useState<"local" | "global">(scope);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { language } = usePreferredLanguage();

  const handleSignOut = async () => {
    setIsSigningOut(true);

    try {
      const { error } = await supabaseClient.auth.signOut({
        scope: selectedScope,
      });

      if (error) {
        console.error("Sign out error:", error);
        throw new Error("Failed to sign out: " + error.message);
      }

      onSignedOut?.();
    } catch (error) {
      console.error("Sign out failed:", error);
      // Even if there's an error, we should still redirect to login
      onSignedOut?.();
    } finally {
      setIsSigningOut(false);
    }
  };

  const getScopeDescription = () => {
    return selectedScope === "local" ? t("thisDeviceDescription", language) : t("allDevicesDescription", language);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("signOut", language)}</CardTitle>
        <CardDescription>{t("signOutDescription", language)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="signout-scope">{t("signOutScope", language)}</Label>
          <Select value={selectedScope} onValueChange={(value: "local" | "global") => setSelectedScope(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select sign out scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="local">{t("thisDeviceOnly", language)}</SelectItem>
              <SelectItem value="global">{t("allDevices", language)}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-600">{getScopeDescription()}</p>
        </div>

        <Button onClick={handleSignOut} disabled={isSigningOut} variant="outline" className="w-full">
          {isSigningOut ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
              {t("signingOut", language)}...
            </>
          ) : (
            `${t("signOut", language)} ${selectedScope === "global" ? `(${t("allDevices", language)})` : ""}`
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
