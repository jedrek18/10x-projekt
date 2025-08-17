import React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Save, Trash2, Download } from "lucide-react";
import { t, tWithParams } from "@/lib/i18n";
import type { ProposalCounts, BulkActionFlags } from "./types";
import type { LanguageCode } from "@/lib/i18n";

interface BulkActionsBarProps {
  counts: ProposalCounts;
  disabledFlags: BulkActionFlags;
  onSaveAccepted: () => void;
  onSaveAll: () => void;
  onRejectAll: () => void;
  onToggleSelectAll: () => void;
  language?: LanguageCode;
  isHydrated?: boolean;
}

/**
 * Bar with bulk actions and selection controls
 */
export function BulkActionsBar({
  counts,
  disabledFlags,
  onSaveAccepted,
  onSaveAll,
  onRejectAll,
  onToggleSelectAll,
  language = "en",
  isHydrated = true,
}: BulkActionsBarProps) {
  const allSelected = counts.total > 0 && counts.selected === counts.total;
  const hasAccepted = counts.accepted > 0;
  const hasSelected = counts.selected > 0;

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
      {/* Selection controls */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allSelected}
            onCheckedChange={onToggleSelectAll}
            disabled={disabledFlags.selectAll}
            aria-label="Select all proposals"
          />
          <span className="text-sm font-medium text-gray-700">{t("selectAll", isHydrated ? language : "en")}</span>
        </div>

        {/* Counts */}
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span>
            {tWithParams(
              "selectedOf",
              { selected: counts.selected, total: counts.total },
              isHydrated ? language : "en"
            )}
          </span>
          {hasAccepted && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {counts.accepted} {t("accepted", isHydrated ? language : "en")}
            </Badge>
          )}
          {counts.deleted > 0 && (
            <Badge variant="secondary" className="bg-red-100 text-red-800">
              {counts.deleted} {t("deleted", isHydrated ? language : "en")}
            </Badge>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onSaveAccepted}
          disabled={disabledFlags.saveAccepted || !hasAccepted}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {tWithParams("saveAccepted", { count: counts.accepted }, isHydrated ? language : "en")}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onSaveAll}
          disabled={disabledFlags.saveAll}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          {t("saveAll", isHydrated ? language : "en")}
        </Button>

        <Button
          variant="destructive"
          size="sm"
          onClick={onRejectAll}
          disabled={disabledFlags.rejectAll}
          className="flex items-center gap-2"
        >
          <Trash2 className="h-4 w-4" />
          {t("rejectAll", isHydrated ? language : "en")}
        </Button>
      </div>
    </div>
  );
}
