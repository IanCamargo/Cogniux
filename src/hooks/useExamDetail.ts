import { useMemo } from "react";
import { collection, doc, query, where, orderBy, limit, type DocumentData, type QuerySnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { queryKeys } from "@/lib/queryKeys";
import { useFirestoreDocQuery } from "@/hooks/firestore/useFirestoreDocQuery";
import { useFirestoreCollectionQuery } from "@/hooks/firestore/useFirestoreCollectionQuery";
import type { Exam, Student, Submission, PedagogicalPlan, AccessToken } from "@/types";

export function useExamDetail(examId: string | undefined) {
  const examRef = useMemo(() => (examId ? doc(db, "exams", examId) : null), [examId]);

  const examQuery = useFirestoreDocQuery(
    queryKeys.exam(examId ?? "none"),
    examRef,
    (snap) => (snap.exists() ? ({ id: snap.id, ...snap.data() } as Exam) : null),
    null as Exam | null
  );

  const submissionsQuery = useMemo(
    () =>
      examId
        ? query(collection(db, "exams", examId, "submissions"), orderBy("gradedAt", "desc"))
        : null,
    [examId]
  );

  const studentsQuery = useMemo(
    () =>
      examId ? query(collection(db, "exams", examId, "students"), orderBy("name", "asc")) : null,
    [examId]
  );

  const tokensQuery = useMemo(
    () => (examId ? query(collection(db, "access_tokens"), where("examId", "==", examId)) : null),
    [examId]
  );

  const planQuery = useMemo(
    () =>
      examId
        ? query(collection(db, "exams", examId, "plans"), orderBy("createdAt", "desc"), limit(1))
        : null,
    [examId]
  );

  const submissionsQ = useFirestoreCollectionQuery(
    queryKeys.examSubmissions(examId ?? "none"),
    submissionsQuery,
    (snap: QuerySnapshot<DocumentData>) =>
      snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Submission),
    [] as Submission[]
  );

  const studentsQ = useFirestoreCollectionQuery(
    queryKeys.examStudents(examId ?? "none"),
    studentsQuery,
    (snap: QuerySnapshot<DocumentData>) =>
      snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Student),
    [] as Student[]
  );

  const tokensQ = useFirestoreCollectionQuery(
    queryKeys.examTokens(examId ?? "none"),
    tokensQuery,
    (snap: QuerySnapshot<DocumentData>) =>
      snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AccessToken),
    [] as AccessToken[]
  );

  const planQ = useFirestoreCollectionQuery(
    queryKeys.examPlan(examId ?? "none"),
    planQuery,
    (snap: QuerySnapshot<DocumentData>) =>
      snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as PedagogicalPlan),
    null as PedagogicalPlan | null
  );

  const tokens = useMemo(() => {
    const map: Record<string, AccessToken> = {};
    (tokensQ.data ?? []).forEach((t) => {
      if (t.studentId) map[t.studentId] = t;
    });
    return map;
  }, [tokensQ.data]);

  const loading =
    examQuery.isPending ||
    submissionsQ.isPending ||
    studentsQ.isPending ||
    tokensQ.isPending ||
    planQ.isPending;

  return {
    exam: examQuery.data ?? null,
    submissions: submissionsQ.data ?? [],
    students: studentsQ.data ?? [],
    tokens,
    pedagogicalPlan: planQ.data ?? null,
    loading,
  };
}
