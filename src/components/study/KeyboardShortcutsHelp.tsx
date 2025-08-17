import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Keyboard } from "lucide-react";
import { t } from "../../lib/i18n";
import { usePreferredLanguage } from "../../lib/usePreferredLanguage";

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  { key: "Space / Enter", descriptionKey: "revealAnswer" },
  { key: "1", descriptionKey: "rateAgain" },
  { key: "2", descriptionKey: "rateHard" },
  { key: "3", descriptionKey: "rateGood" },
  { key: "4", descriptionKey: "rateEasy" },
  { key: "? / h", descriptionKey: "showHelp" },
];

export function KeyboardShortcutsHelp({ open, onOpenChange }: KeyboardShortcutsHelpProps) {
  const { language } = usePreferredLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            {t("keyboardShortcuts", language)}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("keyboardShortcutsDescription", language)}</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("key", language)}</TableHead>
                <TableHead>{t("action", language)}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shortcuts.map((shortcut) => (
                <TableRow key={shortcut.key}>
                  <TableCell className="font-mono text-sm">
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">{shortcut.key}</kbd>
                  </TableCell>
                  <TableCell className="text-sm">{t(shortcut.descriptionKey, language)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
