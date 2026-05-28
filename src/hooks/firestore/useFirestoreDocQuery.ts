import { useEffect, useRef } from "react";
import { useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import {
  getDoc,
  onSnapshot,
  type DocumentData,
  type DocumentReference,
  type DocumentSnapshot,
} from "firebase/firestore";

export function useFirestoreDocQuery<T>(
  queryKey: QueryKey,
  docRef: DocumentReference<DocumentData> | null | undefined,
  select: (snap: DocumentSnapshot<DocumentData>) => T,
  initialData?: T
) {
  const queryClient = useQueryClient();
  const selectRef = useRef(select);
  selectRef.current = select;

  const queryKeyRef = useRef(queryKey);
  queryKeyRef.current = queryKey;

  useEffect(() => {
    if (!docRef) return;
    return onSnapshot(docRef, (snap) => {
      queryClient.setQueryData(queryKeyRef.current, selectRef.current(snap));
    });
  }, [queryClient, docRef]);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!docRef) return initialData as T;
      const snap = await getDoc(docRef);
      return selectRef.current(snap);
    },
    enabled: !!docRef,
    initialData,
    staleTime: Infinity,
    refetchOnMount: false,
  });

  return { ...query, data: query.data ?? initialData };
}
