import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppRouter } from "@/routes/AppRouter";
import { validateEnv } from "@/lib/env";
import { applyTheme, getStoredTheme } from "@/lib/theme";
import { queryClient, initAuthQuery } from "@/lib/queryClient";
import "./index.css";

try {
  validateEnv();
} catch (e) {
  console.warn("Env validation:", e instanceof Error ? e.message : e);
}

applyTheme(getStoredTheme());
initAuthQuery();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BrowserRouter>
          <TooltipProvider>
            <AppRouter />
            <Toaster richColors position="top-right" />
          </TooltipProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>
);
