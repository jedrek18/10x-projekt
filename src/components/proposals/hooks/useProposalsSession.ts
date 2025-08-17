import { useState, useCallback, useMemo, useEffect } from "react";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import { useValidation } from "./useValidation";
import type { ProposalsSessionVM, ProposalVM, ProposalStatus, ProposalCounts, TTLInfo, UUID } from "../types";
import type { AiGenerationProposalDTO } from "@/types";

const LOCAL_STORAGE_KEY = "proposals.session.v1";
const TTL_HOURS = 24;
const TTL_MS = TTL_HOURS * 60 * 60 * 1000;

/**
 * Hook for managing proposals session state with LocalStorage TTL
 */
export function useProposalsSession() {
  const [session, setSession] = useLocalStorage<ProposalsSessionVM | null>(LOCAL_STORAGE_KEY, null);
  const { validateMany, hasErrors } = useValidation();

  // Check if session is expired
  const isExpired = useMemo(() => {
    if (!session) return true;
    return new Date().getTime() > new Date(session.ttlExpiresAt).getTime();
  }, [session]);

  // Clear expired session
  useEffect(() => {
    if (isExpired && session) {
      setSession(null);
    }
  }, [isExpired, session, setSession]);

  // Calculate TTL info
  const ttlInfo = useMemo((): TTLInfo | null => {
    if (!session || isExpired) return null;

    const now = new Date().getTime();
    const expiresAt = new Date(session.ttlExpiresAt).getTime();
    const remainingMs = Math.max(0, expiresAt - now);

    return {
      expiresAt: session.ttlExpiresAt,
      remainingMs,
    };
  }, [session, isExpired]);

  // Calculate counts
  const counts = useMemo((): ProposalCounts => {
    if (!session) {
      return { total: 0, accepted: 0, selected: 0, deleted: 0 };
    }

    return {
      total: session.items.length,
      accepted: session.items.filter((item) => item.status === "accepted" || item.status === "edited").length,
      selected: session.items.filter((item) => item.selected).length,
      deleted: session.items.filter((item) => item.status === "deleted").length,
    };
  }, [session]);

  // Replace session from generation
  const replaceFromGenerate = useCallback(
    (batch: AiGenerationProposalDTO[], requestId: UUID, requestedMax: number) => {
      const now = new Date();
      const ttlExpiresAt = new Date(now.getTime() + TTL_MS).toISOString();

      const items: ProposalVM[] = batch.map((proposal, index) => ({
        id: `${requestId}-${index}`,
        front: proposal.front,
        back: proposal.back,
        status: "pending" as ProposalStatus,
        selected: false,
        sourceCandidate: "ai" as const,
        frontCount: 0, // Will be calculated by validation
        backCount: 0,
      }));

      const validatedItems = validateMany(items);

      const newSession: ProposalsSessionVM = {
        requestId,
        requestedMax,
        receivedCount: batch.length,
        done: true,
        items: validatedItems,
        createdAt: now.toISOString(),
        ttlExpiresAt,
      };

      setSession(newSession);
      // Also save directly to localStorage as backup
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newSession));
      } catch (error) {
        console.warn("Failed to save session to localStorage directly:", error);
      }
    },
    [setSession, validateMany]
  );

  // Mark proposal as accepted
  const markAccepted = useCallback(
    (id: string) => {
      if (!session) return;

      setSession({
        ...session,
        items: session.items.map((item) =>
          item.id === id ? { ...item, status: "accepted" as ProposalStatus, selected: true } : item
        ),
      });
    },
    [session, setSession]
  );

  // Mark proposal as edited
  const markEdited = useCallback(
    (id: string, front: string, back: string) => {
      if (!session) return;

      const updatedItems = session.items.map((item) => {
        if (item.id === id) {
          const errors = validateMany([{ ...item, front, back }])[0].errors;
          return {
            ...item,
            front,
            back,
            status: "edited" as ProposalStatus,
            sourceCandidate: "ai_edited" as const,
            selected: true,
            errors,
            frontCount: 0, // Will be recalculated
            backCount: 0,
          };
        }
        return item;
      });

      const validatedItems = validateMany(updatedItems);

      setSession({
        ...session,
        items: validatedItems,
      });
    },
    [session, setSession, validateMany]
  );

  // Delete proposal
  const deleteItem = useCallback(
    (id: string) => {
      if (!session) return;

      setSession({
        ...session,
        items: session.items.map((item) => (item.id === id ? { ...item, status: "deleted" as ProposalStatus } : item)),
      });
    },
    [session, setSession]
  );

  // Toggle selection with automatic acceptance
  const toggleSelect = useCallback(
    (id: string) => {
      if (!session) return;

      setSession({
        ...session,
        items: session.items.map((item) => {
          if (item.id === id) {
            const isCurrentlyAccepted = item.status === "accepted" || item.status === "edited";
            const newStatus = isCurrentlyAccepted ? "pending" : "accepted";

            return {
              ...item,
              selected: newStatus === "accepted",
              status: newStatus,
            };
          }
          return item;
        }),
      });
    },
    [session, setSession]
  );

  // Toggle select all with automatic acceptance
  const toggleSelectAll = useCallback(() => {
    if (!session) return;

    const allAccepted = session.items.every((item) => item.status === "accepted" || item.status === "edited");

    setSession({
      ...session,
      items: session.items.map((item) => {
        const newStatus = allAccepted ? "pending" : "accepted";
        return {
          ...item,
          selected: newStatus === "accepted",
          status: newStatus,
        };
      }),
    });
  }, [session, setSession]);

  // Reject all (clear session)
  const rejectAll = useCallback(() => {
    setSession(null);
  }, [setSession]);

  // Get accepted items for batch save
  const getAcceptedItems = useCallback(() => {
    if (!session) return [];

    return session.items
      .filter((item) => item.status === "accepted" || item.status === "edited")
      .map((item) => ({
        front: item.front,
        back: item.back,
        source: item.sourceCandidate,
      }));
  }, [session]);

  // Check if can save (no validation errors in accepted items)
  const canSave = useCallback(() => {
    if (!session) return false;

    const acceptedItems = session.items.filter((item) => item.status === "accepted" || item.status === "edited");

    return !hasErrors(acceptedItems);
  }, [session, hasErrors]);

  // Persist session (update TTL)
  const persist = useCallback(() => {
    if (!session) return;

    const now = new Date();
    const ttlExpiresAt = new Date(now.getTime() + TTL_MS).toISOString();

    setSession({
      ...session,
      ttlExpiresAt,
    });
  }, [session, setSession]);

  // Clear session
  const clear = useCallback(() => {
    setSession(null);
  }, [setSession]);

  return {
    session: isExpired ? null : session,
    ttlInfo,
    counts,
    done: session?.done ?? false,
    replaceFromGenerate,
    markAccepted,
    markEdited,
    deleteItem,
    toggleSelect,
    toggleSelectAll,
    rejectAll,
    getAcceptedItems,
    canSave,
    persist,
    clear,
  };
}
