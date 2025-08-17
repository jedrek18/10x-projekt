import { useMemo } from "react";

/**
 * Hook do liczenia graphem w tekście z obsługą Intl.Segmenter i fallbackiem.
 *
 * Grapheme to najmniejsza jednostka tekstu, która może być postrzegana jako pojedynczy znak.
 * Obsługuje emoji, znaki diakrytyczne i inne złożone znaki Unicode.
 *
 * @param text - Tekst do analizy
 * @returns Liczba graphem w tekście
 *
 * @example
 * ```tsx
 * const count = useGraphemeCounter("Hello 👋"); // 7 (5 liter + 1 spacja + 1 emoji)
 * ```
 */
export function useGraphemeCounter(text: string): number {
  return useMemo(() => {
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
  }, [text]);
}
