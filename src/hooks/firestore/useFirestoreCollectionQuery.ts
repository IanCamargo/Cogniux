import { useEffect, useRef } from "react";
import { useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import {
  getDocs,
  onSnapshot,
  type DocumentData,
  type Query,
  type QuerySnapshot,
} from "firebase/firestore";

export function useFirestoreCollectionQuery<T>(
  queryKey: QueryKey,
  firestoreQuery: Query<DocumentData> | null | undefined,
  select: (snap: QuerySnapshot<DocumentData>) => T,
  initialData?: T
) {
  const queryClient = useQueryClient();
  const selectRef = useRef(select);
  selectRef.current = select;

  useEffect(() => {
    if (!firestoreQuery) return;
    return onSnapshot(firestoreQuery, (snap) => {
      queryClient.setQueryData(queryKey, selectRef.current(snap));
    });
  }, [queryClient, firestoreQuery, queryKey]);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!firestoreQuery) return initialData as T;
      const snap = await getDocs(firestoreQuery);
      return selectRef.current(snap);
    },
    enabled: !!firestoreQuery,
    initialData,
    staleTime: Infinity,
    refetchOnMount: false,
  });

  return { ...query, data: query.data ?? initialData };
}
