import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Globe,
  MoreHorizontal,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card"; // Card used in error/empty states
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useAuth } from "@/hooks/useAuth";
import { useExams } from "@/hooks/useExams";
import { useSubmissionScores } from "@/hooks/useSubmissionScores";
import { calculateDashboardStats } from "@/lib/examStats";
import { db } from "@/lib/firebase";
import { queryClient } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { Exam } from "@/types";
// Legend is used via recharts directly

const RECENT_EXAMS_LIMIT = 50;

// ── Score distribution helpers ──────────────────────────────────────────────

const SCORE_BUCKETS = [
  { label: "0–4", min: 0, max: 4, color: "var(--color-bucket0)" },
  { label: "4–6", min: 4, max: 6, color: "var(--color-bucket1)" },
  { label: "6–7,5", min: 6, max: 7.5, color: "var(--color-bucket2)" },
  { label: "7,5–10", min: 7.5, max: 10.01, color: "var(--color-bucket3)" },
];

const distChartConfig = {
  bucket0: { label: "0–4", color: "hsl(0 72% 51%)" },
  bucket1: { label: "4–6", color: "hsl(38 92% 50%)" },
  bucket2: { label: "6–7,5", color: "hsl(48 96% 53%)" },
  bucket3: { label: "7,5–10", color: "hsl(142 71% 45%)" },
} satisfies ChartConfig;

const passFailConfig = {
  aprovados: { label: "Aprovados", color: "hsl(142 71% 45%)" },
  reprovados: { label: "Reprovados", color: "hsl(0 72% 51%)" },
} satisfies ChartConfig;

const participationConfig = {
  entregaram: { label: "Entregaram", color: "var(--chart-1)" },
  pendentes:  { label: "Pendentes",  color: "var(--chart-2)" },
} satisfies ChartConfig;

const courseConfig = {
  media: { label: "Média", color: "var(--chart-3)" },
} satisfies ChartConfig;

const monthlyConfig = {
  media: { label: "Média", color: "var(--chart-4)" },
} satisfies ChartConfig;

function buildDistribution(scores: { score: number }[]) {
  return SCORE_BUCKETS.map((b) => ({
    label: b.label,
    count: scores.filter((s) => s.score >= b.min && s.score < b.max).length,
    color: b.color,
  }));
}

function buildPassFail(scores: { score: number }[]) {
  const aprovados = scores.filter((s) => s.score >= 6).length;
  return [
    { name: "Aprovados", value: aprovados,               fill: "hsl(142 71% 45%)" },
    { name: "Reprovados", value: scores.length - aprovados, fill: "hsl(0 72% 51%)" },
  ];
}

function buildParticipation(exams: Exam[], statsByExamId: Record<string, { count: number }>) {
  const entregaram = exams.filter((e) => (statsByExamId[e.id]?.count ?? 0) > 0).length;
  return [
    { name: "Entregaram", value: entregaram,                fill: "var(--chart-1)" },
    { name: "Pendentes",  value: exams.length - entregaram, fill: "var(--chart-2)" },
  ];
}

function buildByCourse(exams: Exam[], statsByExamId: Record<string, { average: number; count: number }>) {
  const map: Record<string, { sum: number; count: number }> = {};
  for (const e of exams) {
    const stats = statsByExamId[e.id];
    if (!stats || stats.count === 0) continue;
    const course = e.course ?? "Sem curso";
    if (!map[course]) map[course] = { sum: 0, count: 0 };
    map[course].sum   += stats.average * stats.count;
    map[course].count += stats.count;
  }
  return Object.entries(map)
    .map(([course, { sum, count }]) => ({ course: course.length > 20 ? course.slice(0, 18) + "…" : course, media: parseFloat((sum / count).toFixed(2)) }))
    .sort((a, b) => b.media - a.media);
}

const MONTH_LABELS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function buildMonthlyAvg(exams: Exam[], statsByExamId: Record<string, { average: number; count: number }>) {
  const map: Record<string, { sum: number; count: number }> = {};
  for (const e of exams) {
    const stats = statsByExamId[e.id];
    if (!stats || stats.count === 0) continue;
    const date = (e as any).createdAt?.toDate?.() as Date | undefined;
    if (!date) continue;
    const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, "0")}`;
    if (!map[key]) map[key] = { sum: 0, count: 0 };
    map[key].sum   += stats.average * stats.count;
    map[key].count += stats.count;
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, { sum, count }]) => {
      const [, month] = key.split("-");
      return { mes: MONTH_LABELS[parseInt(month)], media: parseFloat((sum / count).toFixed(2)) };
    });
}

// ── Component ────────────────────────────────────────────────────────────────

export function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { exams, loading, error, refetch } = useExams(user?.uid);
  const navigate = useNavigate();
  const examIds = useMemo(() => exams.map((e) => e.id), [exams]);
  const { scores, statsByExamId, ready: statsReady } = useSubmissionScores(examIds);
  const dashboardStats = useMemo(() => calculateDashboardStats(exams, scores), [exams, scores]);
  const recentExams = useMemo(() => exams.slice(0, RECENT_EXAMS_LIMIT), [exams]);
  const [examToDelete, setExamToDelete] = useState<string | null>(null);

  const distribution  = useMemo(() => buildDistribution(scores), [scores]);
  const passFailData  = useMemo(() => buildPassFail(scores), [scores]);
  const participation = useMemo(() => buildParticipation(exams, statsByExamId), [exams, statsByExamId]);
  const byCourse      = useMemo(() => buildByCourse(exams, statsByExamId), [exams, statsByExamId]);
  const monthlyAvg    = useMemo(() => buildMonthlyAvg(exams, statsByExamId), [exams, statsByExamId]);

  if (authLoading || !user) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  const handleDelete = async (examId: string) => {
    try {
      for (const path of ["submissions", "students", "plans"]) {
        try {
          const snap = await getDocs(collection(db, "exams", examId, path));
          await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, "exams", examId, path, d.id))));
        } catch (subErr) {
          console.warn(`Falha ao limpar subcoleção "${path}":`, subErr);
        }
      }
      try {
        const tokenSnap = await getDocs(query(collection(db, "access_tokens"), where("examId", "==", examId)));
        await Promise.all(tokenSnap.docs.map((t) => deleteDoc(doc(db, "access_tokens", t.id))));
      } catch (tokenErr) {
        console.warn("Falha ao limpar tokens de acesso:", tokenErr);
      }
      await deleteDoc(doc(db, "exams", examId));
      void queryClient.invalidateQueries({ queryKey: queryKeys.exams(user.uid) });
      toast.success("Prova excluída com sucesso.");
    } catch {
      toast.error("Erro ao excluir prova.");
    }
  };

  const hasStats = statsReady && scores.length > 0;

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Olá, Prof. {user.displayName?.split(" ")[0]}</h2>
        </div>
        <Button onClick={() => navigate("/exam/create")} className="w-full md:w-auto shrink-0">
          <Plus className="mr-2" size={18} /> Nova Prova
        </Button>
      </div>

      {/* ── Charts ── */}
      {hasStats && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6 select-none">

          {/* 1. Distribuição de notas */}
          <div>
            <p className="text-sm font-medium mb-1">Distribuição de notas</p>
            <p className="text-xs text-muted-foreground mb-3">{scores.length} entregas</p>
            <ChartContainer config={distChartConfig} className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution} barCategoryGap="30%">
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
                  <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Alunos">
                    {distribution.map((entry) => (
                      <Cell key={entry.label} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          {/* 2. Aprovados vs Reprovados */}
          <div>
            <p className="text-sm font-medium mb-1">Aprovados vs Reprovados</p>
            <p className="text-xs text-muted-foreground mb-3">Nota mínima 6,0</p>
            <ChartContainer config={passFailConfig} className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={passFailData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3}>
                    {passFailData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          {/* 3. Participação geral */}
          <div>
            <p className="text-sm font-medium mb-1">Participação geral</p>
            <p className="text-xs text-muted-foreground mb-3">Provas com ao menos 1 entrega</p>
            <ChartContainer config={participationConfig} className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={participation} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3}>
                    {participation.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          {/* 4. Média por curso */}
          <div>
            <p className="text-sm font-medium mb-1">Média por curso</p>
            <p className="text-xs text-muted-foreground mb-3">Média ponderada das entregas</p>
            <ChartContainer config={courseConfig} className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCourse} layout="vertical" barCategoryGap="25%">
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="course" width={80} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => [(v as number).toFixed(1), "Média"]} />} cursor={false} />
                  <Bar dataKey="media" fill="var(--color-media)" radius={[0, 4, 4, 0]} name="Média" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          {/* 5. Evolução mensal — wide */}
          {monthlyAvg.length >= 2 && (
            <div className="sm:col-span-2 xl:col-span-4">
              <p className="text-sm font-medium mb-1">Evolução mensal</p>
              <p className="text-xs text-muted-foreground mb-3">Média geral de notas por mês</p>
              <ChartContainer config={monthlyConfig} className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyAvg}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(v) => [(v as number).toFixed(1), "Média"]} />} />
                    <Line type="monotone" dataKey="media" stroke="var(--color-media)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-media)" }} name="Média" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          )}

        </div>
      )}

      {/* ── Exam table ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="text-base font-semibold">Provas recentes</h3>
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            {loading ? (
              <Skeleton className="h-4 w-48" />
            ) : (
              <>
                <span className="flex items-center gap-1"><BookOpen size={12} /> {dashboardStats.totalExams} provas</span>
                <span className="flex items-center gap-1"><Globe size={12} /> {dashboardStats.onlineExams} online</span>
              </>
            )}
          </div>
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
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)
        ) : exams.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">Nenhuma prova encontrada.</p>
              <Button onClick={() => navigate("/exam/create")}>Criar primeira prova</Button>
            </CardContent>
          </Card>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Matéria</TableHead>
                <TableHead>Semestre</TableHead>
                <TableHead>Turma</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Entregas</TableHead>
                <TableHead className="text-right">Média</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentExams.map((exam) => {
                const examStats = statsByExamId[exam.id];
                const submissionCount = examStats?.count ?? 0;
                const avgLabel = statsReady && submissionCount > 0 ? examStats!.average.toFixed(1) : submissionCount > 0 ? "…" : "—";
                const handleOpen = () => navigate(`/exam/${exam.id}`);
                const handleEdit = (e: React.MouseEvent) => { e.stopPropagation(); navigate(`/exam/${exam.id}/edit`); };
                return (
                  <TableRow key={exam.id} className="cursor-pointer" onClick={handleOpen}>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal size={15} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuGroup>
                            <DropdownMenuItem onClick={handleEdit}>
                              <Edit2 className="size-4" /> Editar
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                          <DropdownMenuGroup>
                            <DropdownMenuItem variant="destructive" onClick={() => setExamToDelete(exam.id)}>
                              <Trash2 className="size-4" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="font-medium">{exam.subject}</TableCell>
                    <TableCell className="text-muted-foreground">{exam.semester}</TableCell>
                    <TableCell className="text-muted-foreground">{exam.className ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{exam.unit ?? "—"}</TableCell>
                    <TableCell>
                      {exam.isOnline ? (
                        <Badge className="gap-1"><Globe size={11} /> Online</Badge>
                      ) : (
                        <Badge variant="outline">Presencial</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {statsReady ? submissionCount : <Skeleton className="h-4 w-8 ml-auto" />}
                    </TableCell>
                    <TableCell className="text-right font-medium">{avgLabel}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        <AlertDialog open={!!examToDelete} onOpenChange={(open) => { if (!open) setExamToDelete(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir prova?</AlertDialogTitle>
              <AlertDialogDescription>
                Todos os dados de alunos, notas e tokens serão removidos permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={async () => { if (examToDelete) { await handleDelete(examToDelete); setExamToDelete(null); } }}>
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

