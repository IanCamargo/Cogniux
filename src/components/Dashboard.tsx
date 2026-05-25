import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "firebase/auth";
import { collection, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";
import { BookOpen, Calendar, ChevronRight, Plus, Trash2, Edit2, BarChart3 } from "lucide-react";
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
import { useExams } from "@/hooks/useExams";
import { useSubmissionScores } from "@/hooks/useSubmissionScores";
import { calculateDashboardStats } from "@/lib/examStats";
import { db } from "@/lib/firebase";
import type { Exam } from "@/types";
import { toast } from "sonner";

interface DashboardProps {
  user: User;
}

export function Dashboard({ user }: DashboardProps) {
  const { exams, loading } = useExams(user.uid);
  const navigate = useNavigate();
  const examIds = useMemo(() => exams.map((e) => e.id), [exams]);
  const { scores, ready: statsReady } = useSubmissionScores(examIds);
  const stats = calculateDashboardStats(exams, scores);

  const handleDelete = async (examId: string) => {
    try {
      for (const path of ["submissions", "students", "plans"]) {
        const snap = await getDocs(collection(db, "exams", examId, path));
        await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, "exams", examId, path, d.id))));
      }
      const tokenSnap = await getDocs(query(collection(db, "access_tokens"), where("examId", "==", examId)));
      await Promise.all(tokenSnap.docs.map((t) => deleteDoc(doc(db, "access_tokens", t.id))));
      await deleteDoc(doc(db, "exams", examId));
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
          <p className="text-muted-foreground">Você tem {exams.length} provas cadastradas.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button onClick={() => navigate("/exam/create")} className="flex-1 md:flex-none">
            <Plus className="mr-2" size={18} /> Nova Prova
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <BookOpen className="text-muted-foreground mb-1" size={24} />
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Provas</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-10 w-16" /> : <p className="text-3xl font-bold">{stats.totalExams}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <Calendar className="text-muted-foreground mb-1" size={24} />
            <CardTitle className="text-sm font-medium text-muted-foreground">Provas este Mês</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-10 w-16" /> : <p className="text-3xl font-bold">{stats.examsThisMonth}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <BarChart3 className="text-muted-foreground mb-1" size={24} />
            <CardTitle className="text-sm font-medium text-muted-foreground">Média Geral</CardTitle>
          </CardHeader>
          <CardContent>
            {!statsReady ? (
              <Skeleton className="h-10 w-16" />
            ) : (
              <p className="text-3xl font-bold">
                {stats.totalSubmissions > 0 ? stats.averageScore.toFixed(1) : "—"}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{stats.totalSubmissions} submissões</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Provas Recentes</h3>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)
        ) : exams.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">Nenhuma prova encontrada.</p>
              <Button onClick={() => navigate("/exam/create")}>Criar primeira prova</Button>
            </CardContent>
          </Card>
        ) : (
          exams.map((exam) => (
            <ExamRow
              key={exam.id}
              exam={exam}
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

function ExamRow({
  exam,
  onOpen,
  onEdit,
  onDelete,
}: {
  exam: Exam;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={onOpen}>
      <CardContent className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
            <BookOpen size={24} />
          </div>
          <div>
            <h4 className="font-semibold text-lg">{exam.subject}</h4>
            <div className="flex flex-wrap gap-2 mt-1">
              <Badge variant="secondary">{exam.semester}</Badge>
              {exam.course && <Badge variant="outline">{exam.course}</Badge>}
              <Badge variant="outline">{exam.numQuestions} questões</Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Editar prova">
            <Edit2 size={18} />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger>
              <Button variant="ghost" size="icon" aria-label="Excluir prova">
                <Trash2 size={18} />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir prova?</AlertDialogTitle>
                <AlertDialogDescription>
                  Todos os dados de alunos, notas e tokens serão removidos permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <ChevronRight className="text-muted-foreground" size={20} />
        </div>
      </CardContent>
    </Card>
  );
}
