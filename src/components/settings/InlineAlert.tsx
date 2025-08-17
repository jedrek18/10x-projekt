import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "../ui/button";

export type AlertKind = "info" | "success" | "warning" | "error";

export interface InlineAlertProps {
  kind: AlertKind;
  message: string;
  onClose?: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
}

export const InlineAlert = React.memo(function InlineAlert({
  kind,
  message,
  onClose,
  autoHide = false,
  autoHideDelay = 5000,
}: InlineAlertProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoHide && onClose) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay, onClose]);

  if (!isVisible) {
    return null;
  }

  const getAlertStyles = () => {
    switch (kind) {
      case "success":
        return "bg-green-50 border-green-200 text-green-800";
      case "error":
        return "bg-red-50 border-red-200 text-red-800";
      case "warning":
        return "bg-yellow-50 border-yellow-200 text-yellow-800";
      case "info":
      default:
        return "bg-blue-50 border-blue-200 text-blue-800";
    }
  };

  const getIconColor = () => {
    switch (kind) {
      case "success":
        return "text-green-600";
      case "error":
        return "text-red-600";
      case "warning":
        return "text-yellow-600";
      case "info":
      default:
        return "text-blue-600";
    }
  };

  return (
    <div
      className={`flex items-start justify-between p-4 rounded-lg border ${getAlertStyles()}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex-1 pr-4">
        <p className="text-sm font-medium">{message}</p>
      </div>

      {onClose && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsVisible(false);
            onClose();
          }}
          className={`h-6 w-6 p-0 ${getIconColor()} hover:bg-opacity-20`}
          aria-label="Close alert"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
});
