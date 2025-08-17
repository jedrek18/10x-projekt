import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { useCharacterCounter } from "../../lib/hooks/flashcards";
import { usePreferredLanguage } from "../../lib/usePreferredLanguage";
import { t, tWithParams } from "../../lib/i18n";
import type { ManualAddModalProps, ManualAddFormVM } from "./types";
import type { FlashcardCreateManualCommand, FlashcardDTO } from "../../types";

export function ManualAddModal({ open, onOpenChange, onSuccess }: ManualAddModalProps) {
  const { language } = usePreferredLanguage();
  const { countGraphemes } = useCharacterCounter();
  const [form, setForm] = useState<ManualAddFormVM>({
    front: "",
    back: "",
    frontCount: 0,
    backCount: 0,
    errors: {},
    isSubmitting: false,
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setForm({
        front: "",
        back: "",
        frontCount: 0,
        backCount: 0,
        errors: {},
        isSubmitting: false,
      });
    }
  }, [open]);

  // Update character counts
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      frontCount: countGraphemes(prev.front),
      backCount: countGraphemes(prev.back),
    }));
  }, [form.front, form.back, countGraphemes]);

  const validateForm = (): boolean => {
    const errors: Partial<Record<"front" | "back", string>> = {};

    if (!form.front.trim()) {
      errors.front = t("frontRequired", language);
    } else if (form.frontCount > 200) {
      errors.front = tWithParams("maxLength", { max: 200 }, language);
    }

    if (!form.back.trim()) {
      errors.back = t("backRequired", language);
    } else if (form.backCount > 500) {
      errors.back = tWithParams("maxLength", { max: 500 }, language);
    }

    // Sprawdź czy front i back nie są identyczne po uproszczeniu
    const frontNormalized = form.front.trim().toLowerCase().replace(/\s+/g, " ");
    const backNormalized = form.back.trim().toLowerCase().replace(/\s+/g, " ");
    if (frontNormalized === backNormalized && frontNormalized !== "") {
      errors.front = t("frontBackDifferent", language);
      errors.back = t("frontBackDifferent", language);
    }

    setForm((prev) => ({ ...prev, errors }));
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setForm((prev) => ({ ...prev, isSubmitting: true }));

    try {
      const command: FlashcardCreateManualCommand = {
        front: form.front.trim(),
        back: form.back.trim(),
      };

      const response = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || t("addFlashcardError", language));
      }

      const created: FlashcardDTO = await response.json();
      onSuccess(created);
      onOpenChange(false);
    } catch (error) {
      setForm((prev) => ({
        ...prev,
        errors: {
          front: error instanceof Error ? error.message : t("unexpectedError", language),
        },
        isSubmitting: false,
      }));
    }
  };

  const handleInputChange = (field: "front" | "back", value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      errors: { ...prev.errors, [field]: undefined },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("addFlashcard", language)}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="front">{t("front", language)} *</Label>
            <Textarea
              id="front"
              value={form.front}
              onChange={(e) => handleInputChange("front", e.target.value)}
              placeholder={t("frontPlaceholder", language)}
              className="min-h-[100px]"
              disabled={form.isSubmitting}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className={form.errors.front ? "text-destructive" : ""}>{form.errors.front || ""}</span>
              <span className={form.frontCount > 200 ? "text-destructive" : ""}>{form.frontCount}/200</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="back">{t("back", language)} *</Label>
            <Textarea
              id="back"
              value={form.back}
              onChange={(e) => handleInputChange("back", e.target.value)}
              placeholder={t("backPlaceholder", language)}
              className="min-h-[100px]"
              disabled={form.isSubmitting}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className={form.errors.back ? "text-destructive" : ""}>{form.errors.back || ""}</span>
              <span className={form.backCount > 500 ? "text-destructive" : ""}>{form.backCount}/500</span>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={form.isSubmitting}>
              {t("cancel", language)}
            </Button>
            <Button type="submit" disabled={form.isSubmitting || !form.front.trim() || !form.back.trim()}>
              {form.isSubmitting ? t("adding", language) : t("addFlashcard", language)}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
