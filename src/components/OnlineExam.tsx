import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { doc, collection, writeBatch, serverTimestamp } from "firebase/firestore";
import { CheckCircle2, Loader2, ArrowRight, ArrowLeft, Send, BrainCircuit, AlertCircle, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { db } from "@/lib/firebase";
import { calculateScore } from "@/lib/grading";
import { useTheme } from "@/hooks/useTheme";
import { useOnlineExamSession, type OnlineExamStep } from "@/hooks/useOnlineExamSession";
import type { Exam } from "@/types";
import { toast } from "sonner";

export function OnlineExam() {
  const { examId } = useParams<{ examId: string }>();
  const [searchParams] = useSearchParams();
  const accessToken = searchParams.get("token") ?? undefined;
  const { session, loading } = useOnlineExamSession(examId, accessToken);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  if (session.error) {
    return <OnlineExamError message={session.error} />;
  }

  if (!session.exam || !examId) return null;

  return (
    <OnlineExamContent
      key={`${examId}-${accessToken ?? "open"}`}
      examId={examId}
      exam={session.exam}
      accessToken={accessToken}
      initialStudentName={session.studentName}
      initialStep={session.initialStep}
      initialAnswers={session.answers}
    />
  );
}

function OnlineExamError({ message }: { message: string }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="container max-w-md">
        <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Ops!</AlertTitle>
        <AlertDescription className="space-y-4">
          <p>{message}</p>
          <Button variant="outline" onClick={() => navigate("/portal")}>Voltar ao Portal</Button>
        </AlertDescription>
      </Alert>
      </div>
    </div>
  );
}

function OnlineExamContent({
  examId,
  exam,
  accessToken,
  initialStudentName,
  initialStep,
  initialAnswers,
}: {
  examId: string;
  exam: Exam;
  accessToken?: string;
  initialStudentName: string;
  initialStep: OnlineExamStep;
  initialAnswers: string[];
}) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [studentName, setStudentName] = useState(initialStudentName);
  const [answers, setAnswers] = useState<string[]>(initialAnswers);
  const [step, setStep] = useState<OnlineExamStep>(initialStep);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  const handleSubmit = async () => {
    if (answers.includes("")) {
      toast.error("Por favor, responda todas as questões.");
      return;
    }
    setSubmitting(true);
    try {
      const score = calculateScore(answers, exam.answerKey);
      const batch = writeBatch(db);

      const subRef = doc(collection(db, "exams", examId, "submissions"));
      batch.set(subRef, {
        studentName,
        answers,
        score,
        gradedAt: serverTimestamp(),
        isOnline: true,
        accessToken: accessToken ?? null,
      });

      if (accessToken) {
        batch.update(doc(db, "access_tokens", accessToken), {
          isUsed: true,
          usedAt: serverTimestamp(),
        });
      }

      await batch.commit();
      setStep("finished");
    } catch {
      toast.error("Erro ao enviar respostas.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (step !== "exam") return;
    if (e.key === "ArrowRight" && currentQuestion < exam.numQuestions - 1) {
      setCurrentQuestion((p) => p + 1);
    }
    if (e.key === "ArrowLeft" && currentQuestion > 0) {
      setCurrentQuestion((p) => p - 1);
    }
  };

  const progress = (answers.filter(Boolean).length / exam.numQuestions) * 100;

  return (
    <div className="min-h-screen bg-background" onKeyDown={handleKeyDown} tabIndex={0}>
      <Button variant="outline" size="icon" className="fixed top-4 right-4 z-50" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Alternar tema">
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </Button>

      <div className="container max-w-3xl py-16 md:py-8">
      {step === "name" && (
        <Card>
          <CardHeader className="text-center">
            <BrainCircuit className="mx-auto mb-2" size={32} />
            <CardTitle>Identificação do Aluno</CardTitle>
            <CardDescription>Insira seu nome completo para iniciar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="student-name">Seu Nome</Label>
              <Input
                id="student-name"
                autoFocus
                placeholder="Ex: João da Silva"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && studentName.trim() && setStep("exam")}
              />
            </div>
            <Button className="w-full" disabled={!studentName.trim()} onClick={() => setStep("exam")}>
              Iniciar Atividade <ArrowRight className="ml-2" size={18} />
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "exam" && (
        <Card>
          <CardHeader className="border-b">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{exam.subject}</CardTitle>
                <CardDescription>{exam.course ?? "Avaliação Online"}</CardDescription>
              </div>
              <div className="text-right text-sm">
                <p className="text-muted-foreground">Aluno</p>
                <p className="font-medium">{studentName}</p>
              </div>
            </div>
            <Progress value={progress} className="mt-4" />
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="flex gap-1 overflow-x-auto pb-2">
              {Array.from({ length: exam.numQuestions }).map((_, i) => (
                <Button
                  key={i}
                  size="sm"
                  variant={currentQuestion === i ? "default" : answers[i] ? "secondary" : "outline"}
                  className="w-9 h-9 p-0 shrink-0"
                  onClick={() => setCurrentQuestion(i)}
                  aria-label={`Questão ${i + 1}`}
                >
                  {i + 1}
                </Button>
              ))}
            </div>

            <div className="space-y-4">
              <BadgeQuestion num={currentQuestion + 1} />
              <p className="text-lg font-medium leading-relaxed">
                {exam.questions?.[currentQuestion]?.text ?? "Marque a alternativa correta:"}
              </p>
              <div className="grid gap-2">
                {ALPHABET.slice(0, exam.alternativesPerQuestion).map((letter, idx) => (
                  <Button
                    key={letter}
                    variant={answers[currentQuestion] === letter ? "default" : "outline"}
                    className="justify-start h-auto py-3 px-4 text-left"
                    onClick={() => {
                      const newAns = [...answers];
                      newAns[currentQuestion] = letter;
                      setAnswers(newAns);
                    }}
                  >
                    <span className="w-8 h-8 rounded-md bg-muted flex items-center justify-center mr-3 font-bold shrink-0">
                      {letter}
                    </span>
                    {exam.questions?.[currentQuestion]?.options?.[idx] ?? `Alternativa ${letter}`}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" disabled={currentQuestion === 0} onClick={() => setCurrentQuestion((p) => p - 1)}>
                <ArrowLeft className="mr-2" size={18} /> Anterior
              </Button>
              {currentQuestion < exam.numQuestions - 1 ? (
                <Button className="flex-1" onClick={() => setCurrentQuestion((p) => p + 1)}>
                  Próxima <ArrowRight className="ml-2" size={18} />
                </Button>
              ) : (
                <Button className="flex-1" disabled={submitting || answers.includes("")} onClick={handleSubmit}>
                  {submitting ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2" size={18} />}
                  Finalizar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {step === "finished" && (
        <Card className="text-center">
          <CardContent className="pt-8 space-y-6">
            <CheckCircle2 className="mx-auto text-emerald-500" size={64} />
            <div>
              <h2 className="text-2xl font-bold">Recebido!</h2>
              <p className="text-muted-foreground">Sua atividade foi enviada com sucesso.</p>
            </div>
            <Button className="w-full" onClick={() => navigate("/portal")}>Sair</Button>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}

function BadgeQuestion({ num }: { num: number }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
      Questão {num}
    </span>
  );
}
