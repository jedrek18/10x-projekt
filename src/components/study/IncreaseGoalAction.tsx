import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Target } from "lucide-react";
import { useToast } from "../../lib/hooks/useToast";
import { t, tWithParams } from "../../lib/i18n";
import { usePreferredLanguage } from "../../lib/usePreferredLanguage";

interface IncreaseGoalActionProps {
  dateUtc: string;
  currentGoal: number;
  onUpdated: (newGoal: number) => void;
}

export function IncreaseGoalAction({ dateUtc, currentGoal, onUpdated }: IncreaseGoalActionProps) {
  const [open, setOpen] = useState(false);
  const [newGoal, setNewGoal] = useState(currentGoal + 5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { language } = usePreferredLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newGoal < 1 || newGoal > 200) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/progress/${dateUtc}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          goal_override: newGoal,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update goal: ${response.status}`);
      }

      onUpdated(newGoal);
      setOpen(false);
      toast({
        title: t("goalUpdated", language),
        description: tWithParams("goalUpdateDescription", { goal: newGoal.toString() }, language),
        variant: "success",
      });
    } catch (error) {
      console.error("Failed to update goal:", error);
      toast({
        title: t("goalUpdateFailed", language),
        description: error instanceof Error ? error.message : t("goalUpdateErrorDescription", language),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setOpen(open);
    if (open) {
      setNewGoal(currentGoal + 5);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          {t("increaseGoal", language)}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {t("increaseDailyGoal", language)}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newGoal">{t("newDailyGoal", language)}</Label>
            <Input
              id="newGoal"
              type="number"
              min="1"
              max="200"
              value={newGoal}
              onChange={(e) => setNewGoal(parseInt(e.target.value) || 1)}
              placeholder="Enter new goal (1-200)"
            />
            <p className="text-xs text-muted-foreground">
              {tWithParams("currentGoal", { goal: currentGoal.toString() }, language)}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              {t("cancel", language)}
            </Button>
            <Button type="submit" disabled={isSubmitting || newGoal < 1 || newGoal > 200}>
              {isSubmitting ? t("updating", language) : t("updateGoal", language)}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
