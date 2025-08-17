import { useMemo } from "react";
import type { ValidationErrors, ProposalVM } from "../types";

const FRONT_MAX_LENGTH = 200;
const BACK_MAX_LENGTH = 500;

/**
 * Hook for validating proposal content with grapheme-safe counting
 */
export function useValidation() {
  /**
   * Count graphemes in a string
   */
  const countGraphemes = useMemo(() => {
    return (text: string): number => {
      if (!text) return 0;

      // Try to use Intl.Segmenter for proper grapheme counting
      if (typeof Intl !== "undefined" && Intl.Segmenter) {
        try {
          const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
          const segments = segmenter.segment(text);
          return Array.from(segments).length;
        } catch (error) {
          console.warn("Intl.Segmenter failed, falling back to string length:", error);
        }
      }

      // Fallback to simple string length
      return text.length;
    };
  }, []);

  /**
   * Validate a single proposal
   */
  const validateProposal = useMemo(() => {
    return (front: string, back: string): ValidationErrors => {
      const errors: ValidationErrors = {};

      const frontCount = countGraphemes(front);
      const backCount = countGraphemes(back);

      if (frontCount > FRONT_MAX_LENGTH) {
        errors.front = `Front text exceeds ${FRONT_MAX_LENGTH} characters (${frontCount}/${FRONT_MAX_LENGTH})`;
      }

      if (backCount > BACK_MAX_LENGTH) {
        errors.back = `Back text exceeds ${BACK_MAX_LENGTH} characters (${backCount}/${BACK_MAX_LENGTH})`;
      }

      return errors;
    };
  }, [countGraphemes]);

  /**
   * Validate multiple proposals and return those with errors
   */
  const validateMany = useMemo(() => {
    return (proposals: ProposalVM[]): ProposalVM[] => {
      return proposals.map((proposal) => {
        const errors = validateProposal(proposal.front, proposal.back);
        return {
          ...proposal,
          errors: Object.keys(errors).length > 0 ? errors : undefined,
          frontCount: countGraphemes(proposal.front),
          backCount: countGraphemes(proposal.back),
        };
      });
    };
  }, [validateProposal, countGraphemes]);

  /**
   * Check if a proposal has any validation errors
   */
  const hasErrors = useMemo(() => {
    return (proposal: ProposalVM): boolean => {
      return !!proposal.errors && Object.keys(proposal.errors).length > 0;
    };
  }, []);

  /**
   * Check if any proposal in the list has errors
   */
  const hasAnyErrors = useMemo(() => {
    return (proposals: ProposalVM[]): boolean => {
      return proposals.some((proposal) => hasErrors(proposal));
    };
  }, [hasErrors]);

  /**
   * Count graphemes for a string (alias for consistency)
   */
  const countGraphemesForString = useMemo(() => {
    return (text: string): number => {
      return countGraphemes(text);
    };
  }, [countGraphemes]);

  return {
    validateProposal,
    validateMany,
    hasErrors,
    hasAnyErrors,
    countGraphemes: countGraphemesForString,
    limits: {
      frontMax: FRONT_MAX_LENGTH,
      backMax: BACK_MAX_LENGTH,
    },
  };
}
