import { useQuery } from "@tanstack/react-query";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { queryKeys } from "@/lib/queryKeys";
import type { Exam } from "@/types";

export type OnlineExamStep = "name" | "exam" | "finished";

export interface OnlineExamSession {
  exam: Exam | null;
  studentName: string;
  initialStep: OnlineExamStep;
  answers: string[];
  error: string | null;
}

const EMPTY_SESSION: OnlineExamSession = {
  exam: null,
  studentName: "",
  initialStep: "name",
  answers: [],
  error: null,
};

async function fetchOnlineSession(
  examId: string,
  accessToken?: string
): Promise<OnlineExamSession> {
  let studentName = "";
  let initialStep: OnlineExamStep = "name";

  if (accessToken) {
    const tSnap = await getDoc(doc(db, "access_tokens", accessToken));
    if (tSnap.exists()) {
      const tData = tSnap.data();
      if (tData.examId !== examId) {
        return { ...EMPTY_SESSION, error: "Token inválido para esta atividade." };
      }
      if (tData.isUsed) {
        return { ...EMPTY_SESSION, error: "Este código de acesso já foi utilizado." };
      }
      if (tData.studentName) {
        studentName = tData.studentName as string;
        initialStep = "exam";
      }
    }
  }

  const examSnap = await getDoc(doc(db, "exams", examId));
  if (!examSnap.exists()) {
    return { ...EMPTY_SESSION, error: "Atividade não encontrada." };
  }

  const data = examSnap.data() as Exam;
  if (!data.isOnline) {
    return { ...EMPTY_SESSION, error: "Esta atividade não está habilitada para aplicação online." };
  }

  return {
    exam: { ...data, id: examSnap.id },
    studentName,
    initialStep,
    answers: new Array(data.numQuestions).fill(""),
    error: null,
  };
}

export function useOnlineExamSession(examId: string | undefined, accessToken?: string) {
  const { data, isPending } = useQuery({
    queryKey: queryKeys.onlineSession(examId ?? "none", accessToken),
    queryFn: () => fetchOnlineSession(examId!, accessToken),
    enabled: !!examId,
    staleTime: Infinity,
    refetchOnMount: false,
  });

  return { session: data ?? EMPTY_SESSION, loading: isPending };
}
