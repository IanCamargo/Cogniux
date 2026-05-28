import { useMemo } from "react";

export function useCssColor(variable: string): string {
  return useMemo(() => {
    if (typeof window === "undefined") return "#000";
    const raw = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    return raw ? `oklch(${raw})` : "#000";
  }, [variable]);
}
