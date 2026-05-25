import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { collection, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { queryKeys } from "@/lib/queryKeys";
import type { Submission } from "@/types";

export function useSubmissionScores(examIds: string[]) {
  const queryClient = useQueryClient();
  const perExamRef = useRef<Map<string, Pick<Submission, "score">[]>>(new Map());
  const idsKey = examIds.join(",");

  useEffect(() => {
    if (!examIds.length) {
      queryClient.setQueryData(queryKeys.submissionScores(examIds), {
        scores: [] as Pick<Submission, "score">[],
        ready: true,
      });
      return;
    }

    perExamRef.current = new Map();

    const rebuild = () => {
      const scores = examIds.flatMap((id) => perExamRef.current.get(id) ?? []);
      queryClient.setQueryData(queryKeys.submissionScores(examIds), { scores, ready: true });
    };

    const unsubs = examIds.map((id) =>
      onSnapshot(collection(db, "exams", id, "submissions"), (snap) => {
        perExamRef.current.set(
          id,
          snap.docs.map((d) => ({ score: (d.data() as Submission).score }))
        );
        rebuild();
      })
    );

    return () => unsubs.forEach((u) => u());
  }, [queryClient, idsKey, examIds]);

  const { data } = useQuery({
    queryKey: queryKeys.submissionScores(examIds),
    queryFn: async () => {
      if (!examIds.length) return { scores: [] as Pick<Submission, "score">[], ready: true };
      const snaps = await Promise.all(
        examIds.map((id) => getDocs(collection(db, "exams", id, "submissions")))
      );
      const scores = snaps.flatMap((snap) =>
        snap.docs.map((d) => ({ score: (d.data() as Submission).score }))
      );
      return { scores, ready: true };
    },
    staleTime: Infinity,
    refetchOnMount: false,
  });

  return { scores: data?.scores ?? [], ready: data?.ready ?? examIds.length === 0 };
}
