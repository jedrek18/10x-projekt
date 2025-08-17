import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Trash2, Save, X, AlertCircle } from "lucide-react";
import { t } from "@/lib/i18n";
import type { ProposalVM, ValidationErrors } from "./types";
import type { LanguageCode } from "@/lib/i18n";

interface ProposalCardProps {
  item: ProposalVM;
  disabled: boolean;
  onChange: (updated: ProposalVM) => void;
  onDelete: () => void;
  language?: LanguageCode;
  isHydrated?: boolean;
}

/**
 * Single proposal card with content, validation, and actions
 */
export function ProposalCard({
  item,
  disabled,
  onChange,
  onDelete,
  language = "en",
  isHydrated = true,
}: ProposalCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editFront, setEditFront] = useState(item.front);
  const [editBack, setEditBack] = useState(item.back);

  const isAccepted = item.status === "accepted" || item.status === "edited";
  const isDeleted = item.status === "deleted";
  const hasErrors = item.errors && Object.keys(item.errors).length > 0;

  const handleEditStart = () => {
    setEditFront(item.front);
    setEditBack(item.back);
    setIsEditing(true);
  };

  const handleEditSave = () => {
    onChange({
      ...item,
      front: editFront,
      back: editBack,
      status: "edited",
      sourceCandidate: "ai_edited",
    });
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditFront(item.front);
    setEditBack(item.back);
    setIsEditing(false);
  };

  const handleToggleSelect = () => {
    const isCurrentlyAccepted = item.status === "accepted" || item.status === "edited";
    const newStatus = isCurrentlyAccepted ? "pending" : "accepted";

    onChange({
      ...item,
      selected: newStatus === "accepted",
      status: newStatus,
    });
  };

  const getStatusBadge = () => {
    switch (item.status) {
      case "accepted":
        return (
          <Badge className="bg-green-100 text-green-800">{t("acceptedStatus", isHydrated ? language : "en")}</Badge>
        );
      case "edited":
        return <Badge className="bg-blue-100 text-blue-800">{t("editedStatus", isHydrated ? language : "en")}</Badge>;
      case "deleted":
        return <Badge variant="destructive">{t("deletedStatus", isHydrated ? language : "en")}</Badge>;
      default:
        return <Badge variant="secondary">{t("pendingStatus", isHydrated ? language : "en")}</Badge>;
    }
  };

  const getCharacterCountClass = (current: number, max: number) => {
    if (current > max) return "text-red-600";
    if (current > max * 0.9) return "text-orange-600";
    return "text-gray-500";
  };

  if (isDeleted) {
    return (
      <Card className="opacity-50 border-gray-300">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 line-through">{item.front}</span>
            <Badge variant="destructive">{t("deletedStatus", isHydrated ? language : "en")}</Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border ${hasErrors ? "border-red-200 bg-red-50" : ""}`}>
      <CardContent className="p-4">
        {/* Header with status and actions */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={item.status === "accepted" || item.status === "edited"}
              onCheckedChange={handleToggleSelect}
              disabled={disabled}
              aria-label={`Select proposal ${item.id}`}
            />
            {getStatusBadge()}
            {item.sourceCandidate === "ai_edited" && (
              <Badge variant="outline" className="text-xs">
                {t("aiEdited", isHydrated ? language : "en")}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            {!isEditing ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEditStart}
                  disabled={disabled}
                  className="h-8 w-8 p-0"
                  aria-label={t("editProposal", isHydrated ? language : "en")}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDelete}
                  disabled={disabled}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                  aria-label={t("deleteProposal", isHydrated ? language : "en")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEditSave}
                  disabled={disabled}
                  className="h-8 w-8 p-0"
                  aria-label={t("saveEdits", isHydrated ? language : "en")}
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEditCancel}
                  disabled={disabled}
                  className="h-8 w-8 p-0"
                  aria-label={t("cancelEdits", isHydrated ? language : "en")}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3">
          {/* Front */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("front", isHydrated ? language : "en")}
            </label>
            {isEditing ? (
              <div>
                <Textarea
                  value={editFront}
                  onChange={(e) => setEditFront(e.target.value)}
                  placeholder={t("frontPlaceholder", isHydrated ? language : "en")}
                  className="min-h-[60px]"
                  disabled={disabled}
                />
                <div className="flex items-center justify-between mt-1">
                  <span className={`text-xs ${getCharacterCountClass(item.frontCount, 200)}`}>
                    {item.frontCount}/200 {t("characters", isHydrated ? language : "en")}
                  </span>
                  {item.errors?.front && (
                    <div className="flex items-center gap-1 text-red-600 text-xs">
                      <AlertCircle className="h-3 w-3" />
                      {item.errors.front}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 rounded border min-h-[60px]">
                <p className="text-gray-900">{item.front}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-500">
                    {item.frontCount}/200 {t("characters", isHydrated ? language : "en")}
                  </span>
                  {item.errors?.front && (
                    <div className="flex items-center gap-1 text-red-600 text-xs">
                      <AlertCircle className="h-3 w-3" />
                      {item.errors.front}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Back */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("back", isHydrated ? language : "en")}
            </label>
            {isEditing ? (
              <div>
                <Textarea
                  value={editBack}
                  onChange={(e) => setEditBack(e.target.value)}
                  placeholder={t("backPlaceholder", isHydrated ? language : "en")}
                  className="min-h-[80px]"
                  disabled={disabled}
                />
                <div className="flex items-center justify-between mt-1">
                  <span className={`text-xs ${getCharacterCountClass(item.backCount, 500)}`}>
                    {item.backCount}/500 {t("characters", isHydrated ? language : "en")}
                  </span>
                  {item.errors?.back && (
                    <div className="flex items-center gap-1 text-red-600 text-xs">
                      <AlertCircle className="h-3 w-3" />
                      {item.errors.back}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 rounded border min-h-[80px]">
                <p className="text-gray-900">{item.back}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-500">{item.backCount}/500 characters</span>
                  {item.errors?.back && (
                    <div className="flex items-center gap-1 text-red-600 text-xs">
                      <AlertCircle className="h-3 w-3" />
                      {item.errors.back}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
