import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Clock, Upload } from "lucide-react";
import { t, tWithParams } from "../../lib/i18n";
import { usePreferredLanguage } from "../../lib/usePreferredLanguage";
import type { OutboxStats } from "./types";

interface OfflineOutboxIndicatorProps {
  stats: OutboxStats;
}

export function OfflineOutboxIndicator({ stats }: OfflineOutboxIndicatorProps) {
  const { language } = usePreferredLanguage();
  const [open, setOpen] = useState(false);

  if (stats.count === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Clock className="h-4 w-4" />
          <Badge variant="secondary">{stats.count}</Badge>
          <span>{t("pendingReviews", language)}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("pendingReviews", language)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {tWithParams("pendingReviewsDescription", { count: stats.count.toString() }, language)}
          </p>
          <div className="space-y-2">
            {stats.items.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-2 border rounded">
                <div className="text-sm">
                  <span className="font-medium">
                    {t("card", language)} {item.card_id.slice(0, 8)}...
                  </span>
                  <span className="ml-2 text-muted-foreground">
                    {t("rating", language)}:{" "}
                    {item.rating === 0
                      ? t("again", language)
                      : item.rating === 1
                        ? t("hard", language)
                        : item.rating === 2
                          ? t("good", language)
                          : t("easy", language)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">{new Date(item.queued_at).toLocaleTimeString()}</div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
