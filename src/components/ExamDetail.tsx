import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  Download,
  Trash2,
  Edit2,
  Sparkles,
  ListChecks,
  Wand2,
  Loader2,
  Key,
  Copy,
  PlusCircle,
  MoreHorizontal,
  Printer,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuGroup } from "@/components/ui/dropdown-menu";
import { db } from "@/lib/firebase";
import { getDocs, collection, query, where, addDoc, setDoc, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import { generatePedagogicalPlan } from "@/services/geminiService";
import { calculateExamStats } from "@/lib/examStats";
import { getScoreColorClass, calculateScore, getAlternatives } from "@/lib/grading";
import { submissionsToCsv, downloadCsv } from "@/lib/export";
import { useExamDetail } from "@/hooks/useExamDetail";

import { ExamPrintView, useSubmissionPrint } from "@/components/ExamPrintView";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ExamDetail() {
  const { id: examId, tab: activeTab = "overview" } = useParams<{ id: string; tab: string }>();
  const navigate = useNavigate();
  const { exam, submissions, students, tokens, pedagogicalPlan, loading } = useExamDetail(examId);
  const [newStudentName, setNewStudentName] = useState("");
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualAnswers, setManualAnswers] = useState<string[]>([]);
  const [savingManual, setSavingManual] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<{ id: string; name: string } | null>(null);
  const [answerKeyVisible, setAnswerKeyVisible] = useState(false);
  const [submissionToPrint, setSubmissionToPrint] = useState<typeof submissions[number] | null>(null);

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast.success("Copiado!");
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete || !examId) return;
    await deleteDoc(doc(db, "exams", examId, "students", studentToDelete.id));
    setStudentToDelete(null);
  };
  const { print: printSubmission, node: printSubmissionNode } = useSubmissionPrint(exam, submissionToPrint);

  useEffect(() => {
    if (submissionToPrint) {
      // Small delay to allow the hidden DOM node to render before printing
      const timer = setTimeout(() => printSubmission(), 100);
      return () => clearTimeout(timer);
    }
  }, [submissionToPrint]);

  if (!examId) return null;
  if (loading && !exam) return <Skeleton className="h-64 w-full" />;
  if (!exam) return <p className="text-center p-8">Prova não encontrada.</p>;

  const stats = calculateExamStats(submissions);

  const generateToken = async (studentId: string, studentName: string) => {
    const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const values = crypto.getRandomValues(new Uint32Array(6));
    const token = Array.from(values, (v) => charset[v % charset.length]).join("");
    try {
      await setDoc(doc(db, "access_tokens", token), {
        token,
        examId,
        studentId,
        studentName,
        isUsed: false,
        createdAt: serverTimestamp(),
      });
      toast.success("Token gerado!");
    } catch {
      toast.error("Erro ao gerar token.");
    }
  };

  const handleGeneratePlan = async () => {
    if (submissions.length === 0) {
      toast.error("É necessário ter submissões.");
      return;
    }
    setGeneratingPlan(true);
    try {
      const plan = await generatePedagogicalPlan(exam.subject, stats, submissions.length);
      await addDoc(collection(db, "exams", examId, "plans"), { ...plan, createdAt: serverTimestamp() });
      toast.success("Plano pedagógico gerado!");
    } catch {
      toast.error("Erro ao gerar plano via IA.");
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleExport = () => {
    const csv = submissionsToCsv(submissions, exam);
    downloadCsv(csv, `${exam.subject.replace(/\s+/g, "_")}_notas.csv`);
    toast.success("Exportação iniciada.");
  };

  const handleManualSubmission = async () => {
    if (!manualName.trim()) {
      toast.error("Preencha o nome do aluno.");
      return;
    }
    if (manualAnswers.length !== exam?.numQuestions || manualAnswers.some((a) => !a)) {
      toast.error("Preencha todas as respostas.");
      return;
    }
    setSavingManual(true);
    try {
      const score = calculateScore(manualAnswers, exam!.answerKey);
      await addDoc(collection(db, "exams", examId, "submissions"), {
        studentName: manualName.trim(),
        answers: manualAnswers,
        score,
        gradedAt: serverTimestamp(),
        isOnline: false,
      });
      setManualName("");
      setManualAnswers([]);
      toast.success("Nota lançada!");
    } catch {
      toast.error("Erro ao lançar nota.");
    } finally {
      setSavingManual(false);
    }
  };


  const handleDeleteExam = async () => {
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
      toast.success("Prova excluída.");
      navigate("/dashboard");
    } catch {
      toast.error("Erro ao excluir prova.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="ghost" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="mr-2" size={18} /> Voltar
        </Button>
        <AlertDialog>
          <AlertDialogTrigger>
            <Button variant="destructive" size="sm">
              <Trash2 size={16} />
              Remover
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir prova permanentemente?</AlertDialogTitle>
              <AlertDialogDescription>Todos os dados serão perdidos.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteExam}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col md:flex-row justify-between gap-2">
            <div>
              <CardTitle className="text-2xl flex items-center gap-1 group/edit">
                <span className="group-hover/edit:underline">{exam.subject}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/exam/${examId}/edit`)} aria-label="Editar">
                  <Edit2 size={15} />
                </Button>
              </CardTitle>
              <CardDescription>{exam.semester}</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Média</p>
                <p className={cn("text-xl font-bold", stats.count > 0 ? getScoreColorClass(stats.average) : "")}>
                  {stats.count > 0 ? stats.average.toFixed(1) : "—"}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Entregues</p>
                <p className="text-xl font-bold">{submissions.length}</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="">
          <Tabs value={activeTab} onValueChange={(val) => navigate(`/exam/${examId}/${val}`)}>
            <div className="overflow-x-auto overflow-y-hidden pb-2">
              <TabsList className="gap-1 w-max" variant={"line"}>
                <TabsTrigger value="overview">Resumo</TabsTrigger>
                <TabsTrigger value="students">Alunos</TabsTrigger>
                <TabsTrigger value="submissions">Notas</TabsTrigger>
                <TabsTrigger value="plan">Plano de Ação</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="mt-4 space-y-4">
              <div className="flex justify-between gap-4">
                <div className="space-y-1">
                  {exam.course && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Curso:</span> {exam.course}
                    </p>
                  )}
                  {exam.className && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Turma:</span> {exam.className}
                    </p>
                  )}
                  {exam.unit && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Unidade:</span> {exam.unit}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <QRCodeSVG
                    value={JSON.stringify({ examId: exam.id, subject: exam.subject })}
                    size={90}
                    fgColor="black"
                    marginSize={2}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => { navigator.clipboard.writeText(exam.id); toast.success("Copiado!"); }}
                  >
                    <Copy size={13} className="mr-1" /> Copiar código
                  </Button>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1 mb-3">
                  <h4 className="font-medium">Gabarito Oficial</h4>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setAnswerKeyVisible((v) => !v)}
                    aria-label={answerKeyVisible ? "Ocultar gabarito" : "Revelar gabarito"}
                  >
                    {answerKeyVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                  </Button>
                </div>
                <div className="grid grid-flow-col gap-x-6 gap-y-1.5 select-none" style={{ gridTemplateRows: `repeat(${Math.ceil(exam.answerKey.length / 3)}, auto)` }}>
                  {exam.answerKey.map((ans, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5 text-center shrink-0">{i + 1}</span>
                      <div className="flex items-center gap-1">
                        {getAlternatives(exam.alternativesPerQuestion).map((alt) => (
                          <span
                            key={alt}
                            className={cn(
                              "w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center border transition-all duration-200",
                              answerKeyVisible && ans === alt
                                ? "bg-primary text-primary-foreground border-primary"
                                : "text-muted-foreground border-border"
                            )}
                          >
                            {alt}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <ExamPrintView exam={exam} students={students} />
            </TabsContent>

            <TabsContent value="students" className="mt-6 space-y-4">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newStudentName.trim()) return;
                  try {
                    await addDoc(collection(db, "exams", examId, "students"), {
                      name: newStudentName.trim(),
                      createdAt: serverTimestamp(),
                    });
                    setNewStudentName("");
                  } catch {
                    toast.error("Erro ao adicionar aluno.");
                  }
                }}
                className="flex gap-2"
              >
                <Input
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="Nome do aluno"
                />
                <Button type="submit">
                  <PlusCircle className="mr-2" size={16} /> Adicionar
                </Button>
              </form>
              {students.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">Nenhum aluno cadastrado.</p>
              ) : (
                <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead>Nome</TableHead>
                      {exam.isOnline && <TableHead>Código de Acesso</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal size={15} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuGroup>
                                {exam.isOnline && !tokens[s.id] && (
                                  <DropdownMenuItem onClick={() => generateToken(s.id, s.name)}>
                                    <Key className="size-4" /> Gerar código
                                  </DropdownMenuItem>
                                )}
                                {exam.isOnline && tokens[s.id] && (
                                  <DropdownMenuItem onClick={() => handleCopyToken(tokens[s.id].token)}>
                                    <Copy className="size-4" /> Copiar código
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuGroup>
                              {!submissions.some((sub) => sub.studentName === s.name) && (
                                <DropdownMenuGroup>
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => setStudentToDelete({ id: s.id, name: s.name })}
                                  >
                                    <Trash2 className="size-4" /> Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuGroup>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        {exam.isOnline && (
                          <TableCell>
                            {tokens[s.id] ? (
                              <code className="font-mono text-sm tracking-widest">{tokens[s.id].token}</code>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <AlertDialog open={!!studentToDelete} onOpenChange={(open) => { if (!open) setStudentToDelete(null); }}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir aluno?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {studentToDelete?.name} será removido da lista. Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteStudent}>
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                </>
              )}
            </TabsContent>

            <TabsContent value="submissions" className="mt-6 space-y-4">
              {!exam.isOnline && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Lançar Respostas</h4>
                    <Button variant="outline" size="sm" onClick={handleExport} disabled={submissions.length === 0}>
                      <Download className="mr-2" size={16} /> Exportar Notas
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    {students.length > 0 ? (
                      <Select value={manualName} onValueChange={(v) => setManualName(v ?? "")}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione o aluno..." />
                        </SelectTrigger>
                        <SelectContent>
                          {students.map((s) => (
                            <SelectItem key={s.id} value={s.name}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder="Nome do aluno"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                      />
                    )}
                    <Button onClick={handleManualSubmission} disabled={savingManual} className="shrink-0">
                      <PlusCircle className="mr-2" size={16} /> Enviar
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {Array.from({ length: exam.numQuestions }).map((_, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground w-6 text-center shrink-0">{i + 1}</span>
                        <Select
                          value={manualAnswers[i] ?? ""}
                          onValueChange={(v) => {
                            const next = [...manualAnswers];
                            next[i] = v ?? "";
                            setManualAnswers(next);
                          }}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAlternatives(exam.alternativesPerQuestion).map((alt) => (
                              <SelectItem key={alt} value={alt}>
                                {alt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {exam.isOnline && (
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={handleExport} disabled={submissions.length === 0}>
                    <Download className="mr-2" size={16} /> Exportar Notas
                  </Button>
                </div>
              )}
              {submissions.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">Nenhuma submissão.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead>Aluno</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Nota</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal size={15} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuGroup>
                                <DropdownMenuItem onClick={() => handleCopyToken(sub.studentName)}>
                                  <Copy className="size-4" /> Copiar nome
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSubmissionToPrint(sub)}>
                                  <Printer className="size-4" /> Gerar gabarito
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell className="font-medium">{sub.studentName}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {sub.gradedAt?.seconds
                            ? new Date(sub.gradedAt.seconds * 1000).toLocaleDateString("pt-BR")
                            : "—"}
                        </TableCell>
                        <TableCell className={cn("text-right font-bold", getScoreColorClass(sub.score))}>
                          {sub.score.toFixed(1)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="plan" className="mt-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-medium flex items-center gap-2">
                  <Sparkles size={18} /> Plano Pedagógico
                </h3>
                <Button onClick={handleGeneratePlan} disabled={generatingPlan || submissions.length === 0}>
                  {generatingPlan ? (
                    <Loader2 className="animate-spin mr-2" size={18} />
                  ) : (
                    <Wand2 className="mr-2" size={18} />
                  )}
                  Gerar Análise
                </Button>
              </div>
              {pedagogicalPlan ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-2">Análise</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{pedagogicalPlan.analysis}</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <ListChecks size={16} /> Recomendações
                    </h4>
                    <ul className="space-y-2">
                      {pedagogicalPlan.recommendations?.map((item, idx) => (
                        <li key={idx} className="text-sm p-3 bg-muted rounded-lg">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  Nenhum plano gerado. Clique em &quot;Gerar Análise&quot; após receber submissões.
                </p>
              )}
            </TabsContent>

          </Tabs>
        </CardContent>
      </Card>
      {printSubmissionNode}
    </div>
  );
}
