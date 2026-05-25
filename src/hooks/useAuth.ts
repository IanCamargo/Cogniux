import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { initAuthQuery, type AuthQueryData } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";

export function useAuth() {
  initAuthQuery();

  const { data, isPending } = useQuery<AuthQueryData>({
    queryKey: queryKeys.auth,
    queryFn: () => ({ user: auth.currentUser, ready: false }),
    staleTime: Infinity,
    refetchOnMount: false,
  });

  const user = data?.ready ? data.user : undefined;
  const loading = isPending || !data?.ready;

  const login = useCallback(async (providerType: "google" | "microsoft" = "google") => {
    const provider =
      providerType === "google" ? new GoogleAuthProvider() : new OAuthProvider("microsoft.com");
    await signInWithPopup(auth, provider);
  }, []);

  const logout = useCallback(async () => {
    await auth.signOut();
  }, []);

  return { user: user ?? null, loading, login, logout };
}
