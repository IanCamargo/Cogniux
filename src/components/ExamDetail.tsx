import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft, Download, FileText, Printer, QrCode, Users, Trash2, Edit2,
  Sparkles, ListChecks, Wand2, Loader2, Key, Copy, PlusCircle, School,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { db } from "@/lib/firebase";
import {
  getDocs, collection, query, where,
  addDoc, setDoc, serverTimestamp, deleteDoc, doc,
} from "firebase/firestore";
import { generatePedagogicalPlan } from "@/services/geminiService";
import { calculateExamStats } from "@/lib/examStats";
import { getScoreColorClass } from "@/lib/grading";
import { submissionsToCsv, downloadCsv } from "@/lib/export";
import { useExamDetail } from "@/hooks/useExamDetail";
import type { Exam, Student } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ALPHABET = ["A", "B", "C", "D", "E"];

export function ExamDetail() {
  const { id: examId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { exam, submissions, students, tokens, pedagogicalPlan, loading } = useExamDetail(examId);
  const [newStudentName, setNewStudentName] = useState("");
  const [generatingPlan, setGeneratingPlan] = useState(false);

  if (!examId) return null;
  if (loading && !exam) return <Skeleton className="h-64 w-full" />;
  if (!exam) return <p className="text-center p-8">Prova não encontrada.</p>;

  const stats = calculateExamStats(submissions);

  const generateToken = async (studentId: string, studentName: string) => {
    const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let token = "";
    for (let i = 0; i < 6; i++) token += charset.charAt(Math.floor(Math.random() * charset.length));
    try {
      await setDoc(doc(db, "access_tokens", token), {
        token, examId, studentId, studentName, isUsed: false, createdAt: serverTimestamp(),
      });
      toast.success("Token gerado!");
    } catch {
      toast.error("Erro ao gerar token.");
    }
  };

  const handleGeneratePlan = async () => {
    if (submissions.length === 0) { toast.error("É necessário ter submissões."); return; }
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

  const handleDeleteSubmission = async (id: string) => {
    try {
      await deleteDoc(doc(db, "exams", examId, "submissions", id));
      toast.success("Submissão excluída.");
    } catch {
      toast.error("Erro ao excluir submissão.");
    }
  };

  const handleDeleteExam = async () => {
    try {
      for (const path of ["submissions", "students", "plans"]) {
        const snap = await getDocs(collection(db, "exams", examId, path));
        await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, "exams", examId, path, d.id))));
      }
      const tokenSnap = await getDocs(query(collection(db, "access_tokens"), where("examId", "==", examId)));
      await Promise.all(tokenSnap.docs.map((t) => deleteDoc(doc(db, "access_tokens", t.id))));
      await deleteDoc(doc(db, "exams", examId));
      toast.success("Prova excluída.");
      navigate("/dashboard");
    } catch {
      toast.error("Erro ao excluir prova.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4 no-print">
        <Button variant="ghost" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="mr-2" size={18} /> Voltar
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/exam/${examId}/edit`)} aria-label="Editar">
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
      </div>

      <div className="print-only bg-white text-black">
        {(students.length > 0 ? students : [{ id: "generic", name: "" }]).map((student, idx) => (
          <div key={student.id} className={cn("p-12 min-h-screen", idx > 0 && "page-break")}>
            <PrintSheet exam={exam} student={student} />
          </div>
        ))}
      </div>

      <Card className="no-print">
        <CardHeader className="border-b">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">{exam.subject}</CardTitle>
              <CardDescription>{exam.semester}</CardDescription>
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Média</p>
                <p className="text-xl font-bold">{stats.count > 0 ? stats.average.toFixed(1) : "—"}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Entregues</p>
                <p className="text-xl font-bold">{submissions.length}</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs defaultValue="overview">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="overview">Resumo</TabsTrigger>
              <TabsTrigger value="students">Alunos</TabsTrigger>
              <TabsTrigger value="submissions">Notas</TabsTrigger>
              <TabsTrigger value="plan">Plano de Ação</TabsTrigger>
              <TabsTrigger value="tokens">Acesso Online</TabsTrigger>
              <TabsTrigger value="print">Imprimir</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Questões</p><p className="text-2xl font-bold">{exam.numQuestions}</p></CardContent></Card>
                  <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Alternativas</p><p className="text-2xl font-bold">{exam.alternativesPerQuestion}</p></CardContent></Card>
                </div>
                {(exam.course || exam.className) && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><School size={16} /> Institucional</CardTitle></CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      {exam.course && <p><span className="text-muted-foreground">Curso:</span> {exam.course}</p>}
                      {exam.className && <p><span className="text-muted-foreground">Turma:</span> {exam.className}</p>}
                      {exam.unit && <p><span className="text-muted-foreground">Unidade:</span> {exam.unit}</p>}
                    </CardContent>
                  </Card>
                )}
              </div>
              <div>
                <h4 className="font-medium mb-3">Gabarito Oficial</h4>
                <div className="flex flex-wrap gap-2">
                  {exam.answerKey.map((ans, i) => (
                    <Badge key={i} variant="secondary" className="text-sm px-3 py-1">{i + 1}: {ans}</Badge>
                  ))}
                </div>
              </div>
              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><QrCode size={16} /> Código de Acesso</CardTitle></CardHeader>
                <CardContent className="flex items-center gap-4">
                  <QRCodeSVG value={JSON.stringify({ examId: exam.id, subject: exam.subject })} size={100} />
                  <code className="text-sm font-mono">{exam.id}</code>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="students" className="mt-6 space-y-4">
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!newStudentName.trim()) return;
                await addDoc(collection(db, "exams", examId, "students"), { name: newStudentName.trim(), createdAt: serverTimestamp() });
                setNewStudentName("");
              }} className="flex gap-2">
                <Input value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} placeholder="Nome do aluno" />
                <Button type="submit"><PlusCircle className="mr-2" size={16} /> Adicionar</Button>
              </form>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {students.map((s) => (
                  <Card key={s.id}>
                    <CardContent className="flex justify-between items-center p-4">
                      <span className="font-medium truncate">{s.name}</span>
                      <Button variant="ghost" size="icon" aria-label="Remover aluno" onClick={async () => {
                        await deleteDoc(doc(db, "exams", examId, "students", s.id));
                      }}><Trash2 size={16} /></Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="submissions" className="mt-6 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Participação dos Alunos</h4>
                <Button variant="outline" size="sm" onClick={handleExport} disabled={submissions.length === 0}>
                  <Download className="mr-2" size={16} /> Exportar Notas
                </Button>
              </div>
              {submissions.length === 0 ? (
                <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground">Nenhuma submissão.</CardContent></Card>
              ) : (
                submissions.map((sub) => (
                  <Card key={sub.id}>
                    <CardContent className="flex justify-between items-center p-4">
                      <div>
                        <p className="font-medium">{sub.studentName}</p>
                        <p className="text-xs text-muted-foreground">
                          {sub.gradedAt?.seconds ? new Date(sub.gradedAt.seconds * 1000).toLocaleDateString("pt-BR") : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={cn("text-xl font-bold", getScoreColorClass(sub.score))}>{sub.score.toFixed(1)}</span>
                        <Button variant="ghost" size="icon" aria-label="Excluir submissão" onClick={() => handleDeleteSubmission(sub.id)}>
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="plan" className="mt-6 space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Sparkles size={18} /> Plano Pedagógico</CardTitle>
                    <CardDescription>Análise automática via IA</CardDescription>
                  </div>
                  <Button onClick={handleGeneratePlan} disabled={generatingPlan || submissions.length === 0}>
                    {generatingPlan ? <Loader2 className="animate-spin mr-2" size={18} /> : <Wand2 className="mr-2" size={18} />}
                    Gerar Análise
                  </Button>
                </CardHeader>
                {pedagogicalPlan ? (
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="font-medium mb-2">Análise</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">{pedagogicalPlan.analysis}</p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2"><ListChecks size={16} /> Recomendações</h4>
                      <ul className="space-y-2">
                        {pedagogicalPlan.recommendations?.map((item, idx) => (
                          <li key={idx} className="text-sm p-3 bg-muted rounded-lg">{item}</li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                ) : (
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Nenhum plano gerado. Clique em &quot;Gerar Análise&quot; após receber submissões.
                  </CardContent>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="tokens" className="mt-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {students.map((s) => (
                  <Card key={s.id}>
                    <CardContent className="p-4 space-y-3">
                      <p className="font-medium">{s.name}</p>
                      {tokens[s.id] ? (
                        <div className="flex items-center justify-between bg-muted p-3 rounded-lg">
                          <code className="font-mono font-bold tracking-widest">{tokens[s.id].token}</code>
                          <Button variant="ghost" size="icon" aria-label="Copiar token" onClick={() => {
                            navigator.clipboard.writeText(tokens[s.id].token);
                            toast.success("Copiado!");
                          }}><Copy size={16} /></Button>
                        </div>
                      ) : (
                        <Button className="w-full" size="sm" onClick={() => generateToken(s.id, s.name)}>
                          <Key className="mr-2" size={14} /> Gerar Código
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="print" className="mt-6">
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText size={18} /> Genérico</CardTitle></CardHeader>
                  <CardContent>
                    <Button className="w-full" onClick={() => window.print()}><Printer className="mr-2" size={18} /> Imprimir</Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users size={18} /> Por Aluno ({students.length})</CardTitle></CardHeader>
                  <CardContent>
                    <Button className="w-full" disabled={students.length === 0} onClick={() => window.print()}>
                      <Printer className="mr-2" size={18} /> Imprimir Gabaritos
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function PrintSheet({ exam, student }: { exam: Exam; student: Pick<Student, "id" | "name"> }) {
  const half = Math.ceil(exam.numQuestions / 2);
  return (
    <div>
      <div className="flex justify-between border-b-2 border-black pb-6 mb-6">
        <div>
          <h1 className="text-3xl font-black uppercase">Gabarito</h1>
          <p className="mt-4"><strong>ALUNO:</strong> {student.name}</p>
          <p><strong>MATÉRIA:</strong> {exam.subject}</p>
        </div>
        <QRCodeSVG value={JSON.stringify({ examId: exam.id, studentName: student.name, num: exam.numQuestions })} size={100} />
      </div>
      <div className="grid grid-cols-2 gap-8">
        {[0, 1].map((col) => (
          <div key={col} className="space-y-2">
            {Array.from({ length: col === 0 ? half : exam.numQuestions - half }).map((_, i) => {
              const qNum = col === 0 ? i + 1 : half + i + 1;
              return (
                <div key={qNum} className="flex items-center gap-3">
                  <span className="w-6 text-right font-bold">{qNum}</span>
                  <div className="flex-1 flex justify-between border-2 border-black rounded-full px-4 py-2">
                    {ALPHABET.slice(0, exam.alternativesPerQuestion).map((l) => (
                      <div key={l} className="w-6 h-6 rounded-full border border-gray-400" />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
