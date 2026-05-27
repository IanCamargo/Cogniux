import { useEffect, useRef } from "react";
import { useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import {
  getDocs,
  onSnapshot,
  type DocumentData,
  type Query,
  type QuerySnapshot,
} from "firebase/firestore";
import { auth } from "@/lib/firebase";

export function useFirestoreCollectionQuery<T>(
  queryKey: QueryKey,
  firestoreQuery: Query<DocumentData> | null | undefined,
  select: (snap: QuerySnapshot<DocumentData>) => T,
  pendingPlaceholder?: T
) {
  const queryClient = useQueryClient();
  const selectRef = useRef(select);
  selectRef.current = select;

  const queryKeyRef = useRef(queryKey);
  queryKeyRef.current = queryKey;

  useEffect(() => {
    if (!firestoreQuery) return;
    return onSnapshot(
      firestoreQuery,
      (snap) => {
        queryClient.setQueryData(queryKeyRef.current, selectRef.current(snap));
      },
      (error) => {
        console.error("Firestore onSnapshot error:", error);
      }
    );
  }, [queryClient, firestoreQuery]);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!firestoreQuery) return (pendingPlaceholder ?? []) as T;
      await auth.authStateReady();
      if (!auth.currentUser) {
        throw new Error("Sessão não autenticada.");
      }
      const snap = await getDocs(firestoreQuery);
      return selectRef.current(snap);
    },
    enabled: !!firestoreQuery,
    staleTime: Infinity,
    refetchOnMount: false,
    retry: 2,
  });

  const data = query.isError
    ? undefined
    : query.data !== undefined
      ? query.data
      : query.isPending
        ? pendingPlaceholder
        : undefined;

  return {
    data,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
