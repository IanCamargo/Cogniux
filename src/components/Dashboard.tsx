import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { collection, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";
import {
  BookOpen,
  Calendar,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  BarChart3,
  Globe,
  Users,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useExams } from "@/hooks/useExams";
import { useSubmissionScores } from "@/hooks/useSubmissionScores";
import { calculateDashboardStats, formatExamCreatedAt } from "@/lib/examStats";
import { db } from "@/lib/firebase";
import { queryClient } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import type { Exam, ExamStats } from "@/types";
import { toast } from "sonner";

const RECENT_EXAMS_LIMIT = 8;

export function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { exams, loading, error, refetch } = useExams(user?.uid);
  const navigate = useNavigate();
  const examIdsKey = useMemo(() => exams.map((e) => e.id).join(","), [exams]);
  const examIds = useMemo(
    () => (examIdsKey ? examIdsKey.split(",") : []),
    [examIdsKey]
  );
  const { scores, statsByExamId, ready: statsReady } = useSubmissionScores(examIds);
  const dashboardStats = useMemo(() => calculateDashboardStats(exams, scores), [exams, scores]);

  const recentExams = useMemo(() => exams.slice(0, RECENT_EXAMS_LIMIT), [exams]);

  if (authLoading || !user) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-28 w-full rounded-lg" />
      </div>
    );
  }

  const handleDelete = async (examId: string) => {
    try {
      for (const path of ["submissions", "students", "plans"]) {
        const snap = await getDocs(collection(db, "exams", examId, path));
        await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, "exams", examId, path, d.id))));
      }
      const tokenSnap = await getDocs(query(collection(db, "access_tokens"), where("examId", "==", examId)));
      await Promise.all(tokenSnap.docs.map((t) => deleteDoc(doc(db, "access_tokens", t.id))));
      await deleteDoc(doc(db, "exams", examId));
      void queryClient.invalidateQueries({ queryKey: queryKeys.exams(user.uid) });
      toast.success("Prova excluída com sucesso.");
    } catch {
      toast.error("Erro ao excluir prova.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Olá, Prof. {user.displayName?.split(" ")[0]}</h2>
          <p className="text-muted-foreground">
            {loading
              ? "Carregando suas provas…"
              : dashboardStats.totalExams === 0
                ? "Comece criando sua primeira prova."
                : `${dashboardStats.totalExams} prova${dashboardStats.totalExams !== 1 ? "s" : ""} cadastrada${dashboardStats.totalExams !== 1 ? "s" : ""}.`}
          </p>
        </div>
        <Button onClick={() => navigate("/exam/create")} className="w-full md:w-auto shrink-0">
          <Plus className="mr-2" size={18} /> Nova Prova
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<BookOpen size={22} />}
          label="Total de provas"
          loading={loading}
          value={String(dashboardStats.totalExams)}
        />
        <StatCard
          icon={<Calendar size={22} />}
          label="Criadas este mês"
          loading={loading}
          value={String(dashboardStats.examsThisMonth)}
        />
        <StatCard
          icon={<Globe size={22} />}
          label="Provas online"
          loading={loading}
          value={String(dashboardStats.onlineExams)}
        />
        <StatCard
          icon={<BarChart3 size={22} />}
          label="Média geral"
          loading={loading || !statsReady}
          value={dashboardStats.totalSubmissions > 0 ? dashboardStats.averageScore.toFixed(1) : "—"}
          hint={`${dashboardStats.totalSubmissions} entrega${dashboardStats.totalSubmissions !== 1 ? "s" : ""}`}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold">Provas recentes</h3>
            <p className="text-sm text-muted-foreground">
              {loading
                ? "Buscando no Firestore…"
                : error
                  ? "Não foi possível carregar a lista."
                  : exams.length === 0
                    ? "Suas atividades aparecerão aqui."
                    : exams.length > RECENT_EXAMS_LIMIT
                      ? `Últimas ${RECENT_EXAMS_LIMIT} de ${exams.length}, ordenadas por data.`
                      : "Ordenadas da mais recente para a mais antiga."}
            </p>
          </div>
          {!loading && !error && exams.length > RECENT_EXAMS_LIMIT && (
            <p className="text-sm text-muted-foreground shrink-0">
              +{exams.length - RECENT_EXAMS_LIMIT} mais antigas
            </p>
          )}
        </div>

        {error ? (
          <Card className="border-destructive/40">
            <CardContent className="py-8 text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "Erro ao carregar provas."}
              </p>
              <p className="text-xs text-muted-foreground">
                Se a mensagem citar índice, rode{" "}
                <code className="rounded bg-muted px-1">npm run deploy:firestore</code> ou crie o índice no Console Firebase.
              </p>
              <Button variant="outline" onClick={() => void refetch()}>
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        ) : loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)
        ) : exams.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">Nenhuma prova encontrada.</p>
              <Button onClick={() => navigate("/exam/create")}>Criar primeira prova</Button>
            </CardContent>
          </Card>
        ) : (
          recentExams.map((exam) => (
            <ExamRow
              key={exam.id}
              exam={exam}
              examStats={statsByExamId[exam.id]}
              statsReady={statsReady}
              onOpen={() => navigate(`/exam/${exam.id}`)}
              onEdit={() => navigate(`/exam/${exam.id}/edit`)}
              onDelete={() => handleDelete(exam.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  loading,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  loading: boolean;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="text-muted-foreground mb-1">{icon}</div>
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-9 w-14" /> : <p className="text-2xl font-bold tabular-nums">{value}</p>}
        {hint && !loading && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function ExamRow({
  exam,
  examStats,
  statsReady,
  onOpen,
  onEdit,
  onDelete,
}: {
  exam: Exam;
  examStats?: ExamStats;
  statsReady: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const createdLabel = formatExamCreatedAt(exam.createdAt);
  const submissionCount = examStats?.count ?? 0;
  const avgLabel =
    statsReady && submissionCount > 0 ? examStats!.average.toFixed(1) : submissionCount > 0 ? "…" : "—";

  return (
    <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={onOpen}>
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
            <BookOpen size={22} className="text-muted-foreground" />
          </div>
          <div className="min-w-0 space-y-2">
            <div>
              <h4 className="font-semibold text-lg truncate">{exam.subject}</h4>
              {createdLabel && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock size={12} />
                  Criada {createdLabel}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary">{exam.semester}</Badge>
              {exam.isOnline ? (
                <Badge className="gap-1">
                  <Globe size={12} /> Online
                </Badge>
              ) : (
                <Badge variant="outline">Presencial</Badge>
              )}
              {exam.course && <Badge variant="outline">{exam.course}</Badge>}
              {exam.className && <Badge variant="outline">Turma {exam.className}</Badge>}
              {exam.unit && <Badge variant="outline">Un. {exam.unit}</Badge>}
              <Badge variant="outline">{exam.numQuestions} questões</Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 sm:justify-end sm:shrink-0">
          <div className="text-right text-sm">
            <p className="text-muted-foreground flex items-center justify-end gap-1">
              <Users size={14} />
              {statsReady ? (
                <>
                  <span className="font-medium text-foreground">{submissionCount}</span> entregas
                </>
              ) : (
                <Skeleton className="h-4 w-16 inline-block" />
              )}
            </p>
            <p className="text-muted-foreground mt-0.5">
              Média: <span className="font-medium text-foreground">{avgLabel}</span>
            </p>
          </div>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Editar prova">
              <Edit2 size={18} />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button variant="ghost" size="icon" aria-label="Excluir prova">
                    <Trash2 size={18} />
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir prova?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Todos os dados de alunos, notas e tokens serão removidos permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={onDelete}>
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <ChevronRight className="text-muted-foreground shrink-0" size={20} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
