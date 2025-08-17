import { useEffect, useCallback, useRef } from "react";

export interface KeyboardShortcutHandlers {
  onAccept?: (id?: string) => void;
  onEdit?: (id?: string) => void;
  onDelete?: (id?: string) => void;
  onToggleSelect?: (id?: string) => void;
  onSelectAll?: () => void;
  onSaveAccepted?: () => void;
  onSaveAll?: () => void;
  onRejectAll?: () => void;
}

export interface KeyboardShortcutsOptions {
  enabled: boolean;
  focusedItemId?: string;
  selectedItemIds?: string[];
}

/**
 * Hook for handling keyboard shortcuts in proposals view
 */
export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers, options: KeyboardShortcutsOptions) {
  const { enabled, focusedItemId, selectedItemIds = [] } = options;
  const handlersRef = useRef(handlers);
  const optionsRef = useRef(options);

  // Update refs when props change
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const { focusedItemId, selectedItemIds = [] } = optionsRef.current;
      const { onAccept, onEdit, onDelete, onToggleSelect, onSelectAll, onSaveAccepted, onSaveAll, onRejectAll } =
        handlersRef.current;

      // Prevent default for all shortcuts
      const preventDefault = () => {
        event.preventDefault();
        event.stopPropagation();
      };

      // Single item actions (when focused)
      if (focusedItemId) {
        switch (event.key) {
          case "Enter":
          case " ":
            if (!event.ctrlKey && !event.shiftKey && !event.altKey) {
              onToggleSelect?.(focusedItemId);
              preventDefault();
            }
            break;
          case "e":
          case "E":
            if (!event.ctrlKey && !event.shiftKey && !event.altKey) {
              onEdit?.(focusedItemId);
              preventDefault();
            }
            break;
          case "Delete":
          case "Backspace":
            if (!event.ctrlKey && !event.shiftKey && !event.altKey) {
              onDelete?.(focusedItemId);
              preventDefault();
            }
            break;
        }
      }

      // Bulk actions with modifiers
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case "a":
            if (!event.shiftKey && !event.altKey) {
              onSelectAll?.();
              preventDefault();
            }
            break;
          case "s":
            if (!event.shiftKey && !event.altKey) {
              onSaveAccepted?.();
              preventDefault();
            }
            break;
        }
      }

      // Shift + Enter for bulk toggle selection
      if (event.shiftKey && event.key === "Enter" && !event.ctrlKey && !event.altKey) {
        if (selectedItemIds.length > 0) {
          selectedItemIds.forEach((id) => onToggleSelect?.(id));
          preventDefault();
        }
      }

      // Function keys
      switch (event.key) {
        case "F2":
          if (!event.ctrlKey && !event.shiftKey && !event.altKey) {
            onSaveAll?.();
            preventDefault();
          }
          break;
        case "F3":
          if (!event.ctrlKey && !event.shiftKey && !event.altKey) {
            onRejectAll?.();
            preventDefault();
          }
          break;
      }
    },
    [enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [enabled, handleKeyDown]);

  // Return shortcut info for tooltips/help
  const getShortcutsInfo = useCallback(
    () => ({
      singleItem: {
        enter: "Toggle selection (accept/reject)",
        e: "Edit proposal",
        delete: "Delete proposal",
        space: "Toggle selection (accept/reject)",
      },
      bulk: {
        "Ctrl+A": "Select all",
        "Ctrl+S": "Save accepted",
        "Shift+Enter": "Toggle selection for selected",
        F2: "Save all",
        F3: "Reject all",
      },
    }),
    []
  );

  return {
    getShortcutsInfo,
  };
}
