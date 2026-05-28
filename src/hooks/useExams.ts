import { useMemo } from "react";
import { collection, query, where, orderBy, type DocumentData, type QuerySnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { queryKeys } from "@/lib/queryKeys";
import { useFirestoreCollectionQuery } from "@/hooks/firestore/useFirestoreCollectionQuery";
import type { Exam } from "@/types";

const mapExams = (snap: QuerySnapshot<DocumentData>) =>
  snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Exam);

export function useExams(professorId: string | undefined) {
  const source = useMemo(() => {
    if (!professorId) return null;
    return query(
      collection(db, "exams"),
      where("professorId", "==", professorId),
      orderBy("createdAt", "desc")
    );
  }, [professorId]);

  const { data, isPending, isFetching, isError, error, refetch } = useFirestoreCollectionQuery(
    queryKeys.exams(professorId ?? "none"),
    source,
    mapExams,
    [] as Exam[]
  );

  return {
    exams: data ?? [],
    loading: !!professorId && (isPending || isFetching),
    error: isError ? error : null,
    refetch,
  };
}
