import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { collection, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { buildSubmissionStatsByExam } from "@/lib/examStats";
import { queryKeys } from "@/lib/queryKeys";
import type { ExamStats, Submission } from "@/types";

export type SubmissionScoresCache = {
  scores: Pick<Submission, "score">[];
  statsByExamId: Record<string, ExamStats>;
  ready: boolean;
};

const emptyCache = (examIds: string[]): SubmissionScoresCache => ({
  scores: [],
  statsByExamId: buildSubmissionStatsByExam(examIds, {}),
  ready: examIds.length === 0,
});

export function useSubmissionScores(examIds: string[]) {
  const queryClient = useQueryClient();
  const perExamRef = useRef<Map<string, Pick<Submission, "score">[]>>(new Map());
  const idsKey = examIds.join(",");

  useEffect(() => {
    const ids = idsKey ? idsKey.split(",") : [];

    if (!ids.length) {
      queryClient.setQueryData(queryKeys.submissionScores(ids), emptyCache(ids));
      return;
    }

    perExamRef.current = new Map();

    const rebuild = () => {
      const byExamId = Object.fromEntries(
        ids.map((id) => [id, perExamRef.current.get(id) ?? []])
      ) as Record<string, Pick<Submission, "score">[]>;
      const scores = ids.flatMap((id) => byExamId[id] ?? []);
      queryClient.setQueryData(queryKeys.submissionScores(ids), {
        scores,
        statsByExamId: buildSubmissionStatsByExam(ids, byExamId),
        ready: true,
      });
    };

    const unsubs = ids.map((id) =>
      onSnapshot(collection(db, "exams", id, "submissions"), (snap) => {
        perExamRef.current.set(
          id,
          snap.docs.map((d) => ({ score: (d.data() as Submission).score }))
        );
        rebuild();
      })
    );

    return () => unsubs.forEach((u) => u());
  }, [queryClient, idsKey]);

  const { data } = useQuery({
    queryKey: queryKeys.submissionScores(examIds),
    queryFn: async () => {
      if (!examIds.length) return emptyCache(examIds);
      const snaps = await Promise.all(
        examIds.map((id) => getDocs(collection(db, "exams", id, "submissions")))
      );
      const byExamId = Object.fromEntries(
        examIds.map((id, i) => [
          id,
          snaps[i].docs.map((d) => ({ score: (d.data() as Submission).score })),
        ])
      ) as Record<string, Pick<Submission, "score">[]>;
      const scores = examIds.flatMap((id) => byExamId[id] ?? []);
      return {
        scores,
        statsByExamId: buildSubmissionStatsByExam(examIds, byExamId),
        ready: true,
      };
    },
    staleTime: Infinity,
    refetchOnMount: false,
  });

  const cache = data ?? emptyCache(examIds);
  return {
    scores: cache.scores,
    statsByExamId: cache.statsByExamId,
    ready: cache.ready,
  };
}
