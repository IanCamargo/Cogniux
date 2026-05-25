import { useCallback, useState } from "react";
import { applyTheme, getStoredTheme } from "@/lib/theme";

export function useTheme() {
  const [isDark, setIsDarkState] = useState(getStoredTheme);

  const setIsDark = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setIsDarkState((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      applyTheme(next);
      return next;
    });
  }, []);

  const toggle = useCallback(() => setIsDark((v) => !v), [setIsDark]);

  return { isDark, setIsDark, toggle };
}
