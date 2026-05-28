import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { GoogleAuthProvider, GithubAuthProvider, signInWithPopup, signInWithRedirect, signInAnonymously } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { type AuthQueryData } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";

export function useAuth() {
  const { data, isPending } = useQuery<AuthQueryData>({
    queryKey: queryKeys.auth,
    queryFn: () => ({ user: auth.currentUser, ready: false }),
    staleTime: Infinity,
    refetchOnMount: false,
  });

  const user = data?.ready ? data.user : undefined;
  const loading = isPending || !data?.ready;

  const login = useCallback(async () => {
    await signInWithPopup(auth, new GoogleAuthProvider());
  }, []);

  const loginWithGithub = useCallback(async () => {
    await signInWithRedirect(auth, new GithubAuthProvider());
  }, []);

  const loginAnonymously = useCallback(async () => {
    await signInAnonymously(auth);
  }, []);

  const logout = useCallback(async () => {
    await auth.signOut();
  }, []);

  return { user: user ?? null, loading, login, loginWithGithub, loginAnonymously, logout };
}
