import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface OneActiveSessionGuardProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modal potwierdzenia rozpoczęcia nowej generacji, która wyczyści lokalny cache
 * propozycji z poprzedniej sesji (TTL 24 h).
 */
export function OneActiveSessionGuard({ open, onConfirm, onCancel }: OneActiveSessionGuardProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            Aktywna sesja propozycji
          </DialogTitle>
          <DialogDescription className="text-left">
            Znaleziono aktywną sesję propozycji z poprzedniej generacji.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-medium text-orange-800 mb-2">Co się stanie?</h4>
            <ul className="text-sm text-orange-700 space-y-1">
              <li>• Rozpoczęcie nowej generacji wyczyści poprzednie propozycje</li>
              <li>• Niezapisane fiszki zostaną utracone</li>
              <li>• Sesja propozycji zostanie zresetowana</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">Zalecenie</h4>
            <p className="text-sm text-blue-700">
              Przejdź do widoku propozycji, aby przejrzeć i zapisać wygenerowane fiszki, zanim rozpoczniesz nową
              generację.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1 sm:flex-none">
            Anuluj
          </Button>
          <Button onClick={onConfirm} className="flex-1 sm:flex-none">
            Kontynuuj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
