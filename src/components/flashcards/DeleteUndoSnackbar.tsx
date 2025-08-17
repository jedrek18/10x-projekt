import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import type { DeleteUndoSnackbarProps } from "./types";

export function DeleteUndoSnackbar({ entry, onUndo }: DeleteUndoSnackbarProps) {
  const [timeLeft, setTimeLeft] = useState(5);

  useEffect(() => {
    if (!entry) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [entry]);

  if (!entry) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-background border border-border rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium">Fiszka usunięta</p>
          <p className="text-xs text-muted-foreground mt-1">Cofnij w ciągu {timeLeft} sekund</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onUndo} className="ml-2">
          Cofnij
        </Button>
      </div>

      {/* Progress bar */}
      <div className="mt-2 w-full bg-muted rounded-full h-1">
        <div
          className="bg-primary h-1 rounded-full transition-all duration-1000 ease-linear"
          style={{ width: `${(timeLeft / 5) * 100}%` }}
        />
      </div>
    </div>
  );
}
