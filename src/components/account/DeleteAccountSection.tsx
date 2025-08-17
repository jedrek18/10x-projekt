import { useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { DeleteAccountModal } from "./DeleteAccountModal";
import { t } from "../../lib/i18n";
import { usePreferredLanguage } from "../../lib/usePreferredLanguage";

interface DeleteAccountSectionProps {
  onDeleted?: () => void;
}

export function DeleteAccountSection({ onDeleted }: DeleteAccountSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { language } = usePreferredLanguage();

  return (
    <>
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800">{t("dangerZone", language)}</CardTitle>
          <CardDescription className="text-red-700">{t("dangerZoneDescription", language)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-red-800">{t("deleteAccount", language)}</h4>
            <p className="text-sm text-red-700">{t("deleteAccountDescription", language)}</p>
            <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
              {t("deleteAccountConsequencesList", language)
                .split(",")
                .map((consequence, index) => (
                  <li key={index}>{consequence}</li>
                ))}
            </ul>
          </div>

          <Button onClick={() => setIsModalOpen(true)} variant="destructive" className="w-full">
            {t("deleteAccountButton", language)}
          </Button>
        </CardContent>
      </Card>

      <DeleteAccountModal open={isModalOpen} onOpenChange={setIsModalOpen} onDeleted={onDeleted} />
    </>
  );
}
