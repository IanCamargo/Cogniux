import { QueryClient } from "@tanstack/react-query";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { queryKeys } from "@/lib/queryKeys";

export type AuthQueryData = { user: User | null; ready: boolean };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

let authListenerStarted = false;

export function initAuthQuery(): void {
  if (authListenerStarted) return;
  authListenerStarted = true;

  onAuthStateChanged(auth, (user) => {
    queryClient.setQueryData<AuthQueryData>(queryKeys.auth, { user, ready: true });
  });
}
