import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { User } from "firebase/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { collection, addDoc, updateDoc, doc, enableNetwork, serverTimestamp } from "firebase/firestore";
import { ArrowLeft, Sparkles, Wand2, Loader2, Paperclip, X, FileUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { auth, db } from "@/lib/firebase";
import { getFirebaseConfig } from "@/lib/env";
import { getFirestoreErrorMessage, stripUndefined } from "@/lib/firestorePayload";
import { queryClient } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { useFirestoreDocQuery } from "@/hooks/firestore/useFirestoreDocQuery";
import { generateExamQuestions } from "@/services/geminiService";
import type { Exam, GeneratedQuestion } from "@/types";
import { toast } from "sonner";

const step1Schema = z.object({
  subject: z.string().trim().min(1, "Matéria é obrigatória."),
  semester: z.string().trim().min(1, "Semestre é obrigatório."),
  course: z.string().trim().min(1, "Curso é obrigatório."),
  className: z.string().trim().min(1, "Turma é obrigatória."),
  unit: z.string().trim().min(1, "Unidade é obrigatória."),
  numQuestions: z
    .number({
      invalid_type_error: "Informe a quantidade de questões.",
      required_error: "Informe a quantidade de questões.",
    })
    .int("Use um número inteiro.")
    .min(1, "Mínimo de 1 questão.")
    .max(100, "Máximo de 100 questões."),
  alternativesPerQuestion: z.number().min(2).max(5),
  isOnline: z.boolean(),
});

const step1SchemaWithTopic = step1Schema.extend({
  topic: z.string(),
});

const aiGenerationSchema = step1SchemaWithTopic.extend({
  topic: z.string().trim().min(1, "Tópico é obrigatório para gerar com IA."),
});

type Step1FormValues = z.infer<typeof step1SchemaWithTopic>;

function applyZodErrors(
  error: z.ZodError,
  setFieldError: (name: keyof Step1FormValues, message: string) => void
) {
  error.issues.forEach((issue) => {
    const field = issue.path[0];
    if (typeof field === "string") {
      setFieldError(field as keyof Step1FormValues, issue.message);
    }
  });
}

const defaultSemester = `${new Date().getFullYear()}.${new Date().getMonth() < 6 ? "1" : "2"}`;

function RequiredMark() {
  return (
    <span className="text-destructive" aria-hidden="true">
      *
    </span>
  );
}

function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <Label htmlFor={htmlFor}>
      {children}
      {required && <RequiredMark />}
    </Label>
  );
}

function LabelWithTooltip({
  htmlFor,
  label,
  tooltip,
  required,
}: {
  htmlFor?: string;
  label: string;
  tooltip: string;
  required?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Label htmlFor={htmlFor} className="w-fit cursor-help">
            {label}
            {required && <RequiredMark />}
          </Label>
        }
      />
      <TooltipContent side="top" className="max-w-xs text-left">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

const defaultFormValues: Step1FormValues = {
  subject: "",
  semester: defaultSemester,
  course: "",
  className: "",
  unit: "",
  numQuestions: 10,
  alternativesPerQuestion: 5,
  isOnline: true,
  topic: "",
};

interface ExamCreatorProps {
  user: User;
}

export function ExamCreator({ user }: ExamCreatorProps) {
  const { id: editId } = useParams();
  const examRef = useMemo(() => (editId ? doc(db, "exams", editId) : null), [editId]);
  const { data: existingExam, isPending } = useFirestoreDocQuery(
    queryKeys.exam(editId ?? "new"),
    examRef,
    (snap) => (snap.exists() ? ({ id: snap.id, ...snap.data() } as Exam) : null),
    null
  );

  if (editId && isPending) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (editId) {
    return <ExamEditForm user={user} editId={editId} existingExam={existingExam ?? null} />;
  }

  return <ExamCreatorForm key="new" user={user} editId={undefined} existingExam={null} />;
}

function ExamEditForm({
  user,
  editId,
  existingExam,
}: {
  user: User;
  editId: string;
  existingExam: Exam | null;
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const form = useForm<Step1FormValues>({
    resolver: zodResolver(step1SchemaWithTopic),
    defaultValues: existingExam
      ? {
          subject: existingExam.subject,
          semester: existingExam.semester,
          course: existingExam.course ?? "",
          className: existingExam.className ?? "",
          unit: existingExam.unit ?? "",
          numQuestions: existingExam.numQuestions,
          alternativesPerQuestion: existingExam.alternativesPerQuestion,
          isOnline: existingExam.isOnline,
          topic: "",
        }
      : defaultFormValues,
  });

  const handleSave = form.handleSubmit(async (data) => {
    setLoading(true);
    const { topic: _, ...examData } = data;
    try {
      await updateDoc(doc(db, "exams", editId), {
        ...stripUndefined(examData),
        updatedAt: serverTimestamp(),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.exam(editId), refetchType: "none" });
      void queryClient.invalidateQueries({ queryKey: queryKeys.exams(user.uid), refetchType: "none" });
      toast.success("Prova atualizada com sucesso!");
      navigate(`/exam/${editId}/overview`, { replace: true });
    } catch (error) {
      toast.error(getFirestoreErrorMessage(error, getFirebaseConfig().projectId));
    } finally {
      setLoading(false);
    }
  });

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 pb-12">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" onClick={() => navigate(`/exam/${editId}/overview`)}>
          <ArrowLeft className="mr-2" size={18} /> Voltar
        </Button>
        <Button onClick={() => void handleSave()} disabled={loading}>
          {loading && <Loader2 className="animate-spin mr-2" size={18} />}
          Salvar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Editar Atividade</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); void handleSave(); }} className="space-y-4">
            <div className="space-y-2">
              <FieldLabel htmlFor="subject" required>Matéria / UC</FieldLabel>
              <Input id="subject" {...form.register("subject")} placeholder="Ex: Algoritmos II" />
              {form.formState.errors.subject && (
                <p className="text-sm text-destructive">{form.formState.errors.subject.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <FieldLabel htmlFor="semester" required>Semestre</FieldLabel>
                <Input id="semester" placeholder="Ex: 2025.1" {...form.register("semester")} />
                {form.formState.errors.semester && (
                  <p className="text-sm text-destructive">{form.formState.errors.semester.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="course" required>Curso</FieldLabel>
                <Input id="course" placeholder="Ex: Análise e Desenvolvimento" {...form.register("course")} />
                {form.formState.errors.course && (
                  <p className="text-sm text-destructive">{form.formState.errors.course.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <FieldLabel htmlFor="className" required>Turma</FieldLabel>
                <Input id="className" placeholder="Ex: ADS-3A" {...form.register("className")} />
                {form.formState.errors.className && (
                  <p className="text-sm text-destructive">{form.formState.errors.className.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="unit" required>Unidade</FieldLabel>
                <Input id="unit" placeholder="Ex: I" {...form.register("unit")} />
                {form.formState.errors.unit && (
                  <p className="text-sm text-destructive">{form.formState.errors.unit.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <FieldLabel htmlFor="numQuestions" required>Qtd. Questões</FieldLabel>
                <Input
                  id="numQuestions"
                  type="number"
                  {...form.register("numQuestions", { valueAsNumber: true })}
                />
                {form.formState.errors.numQuestions && (
                  <p className="text-sm text-destructive">{form.formState.errors.numQuestions.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="alternatives">Alternativas</Label>
                <Controller
                  name="alternativesPerQuestion"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={(value) => field.onChange(value)}>
                      <SelectTrigger id="alternatives" className="w-full">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {[2, 3, 4, 5].map((n) => (
                          <SelectItem key={n} value={n}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <button type="submit" className="hidden" />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function ExamCreatorForm({
  user,
  editId,
  existingExam,
}: {
  user: User;
  editId: string | undefined;
  existingExam: Exam | null;
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>(existingExam?.questions ?? []);
  const [answerKey, setAnswerKey] = useState<string[]>(existingExam?.answerKey ?? []);
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [hasGeneratedWithAI, setHasGeneratedWithAI] = useState((existingExam?.answerKey?.length ?? 0) > 0);
  const [contextFiles, setContextFiles] = useState<{ name: string; data: string; mimeType: string }[]>([]);

  const form = useForm<Step1FormValues>({
    resolver: zodResolver(step1SchemaWithTopic),
    defaultValues: existingExam
      ? {
          subject: existingExam.subject,
          semester: existingExam.semester,
          course: existingExam.course ?? "",
          className: existingExam.className ?? "",
          unit: existingExam.unit ?? "",
          numQuestions: existingExam.numQuestions,
          alternativesPerQuestion: existingExam.alternativesPerQuestion,
          isOnline: existingExam.isOnline,
          topic: "",
        }
      : defaultFormValues,
  });

  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = (event.target?.result as string).split(",")[1];
        setContextFiles((prev) => [...prev, { name: file.name, data: base64, mimeType: file.type }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleNext = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    form.clearErrors();

    const validation = aiGenerationSchema.safeParse(form.getValues());
    if (!validation.success) {
      applyZodErrors(validation.error, (name, message) => form.setError(name, { message }));
      toast.error("Preencha os campos obrigatórios.");
      return;
    }

    if (!hasGeneratedWithAI) {
      form.setError("topic", { message: "Gere a prova com IA antes de continuar." });
      toast.error("Gere a prova com IA antes de continuar.");
      return;
    }

    const data = validation.data;
    if (answerKey.length !== data.numQuestions) {
      const newKey = [...answerKey];
      while (newKey.length < data.numQuestions) newKey.push("");
      setAnswerKey(newKey.slice(0, data.numQuestions));
    }
    setStep(2);
  };

  const handleGenerateAI = async () => {
    form.clearErrors();

    const validation = aiGenerationSchema.safeParse(form.getValues());
    if (!validation.success) {
      applyZodErrors(validation.error, (name, message) => form.setError(name, { message }));
      toast.error("Corrija os campos antes de gerar.");
      return;
    }

    const { subject, numQuestions, topic: validatedTopic } = validation.data;
    setAiGenerating(true);
    try {
      const filesForAI = contextFiles.map((f) => ({ data: f.data, mimeType: f.mimeType }));
      const generated = await generateExamQuestions(
        subject,
        validatedTopic,
        numQuestions,
        "intermediate",
        filesForAI
      );
      setQuestions(generated);
      setAnswerKey(generated.map((q) => q.correctAnswer));
      setHasGeneratedWithAI(true);
      toast.success("Conteúdo gerado com sucesso!");
    } catch {
      toast.error("Erro ao gerar conteúdo via IA.");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleRemoveQuestion = (idx: number) => {
    if (answerKey.length <= 1) {
      toast.error("A prova precisa ter pelo menos uma questão.");
      return;
    }
    const newCount = answerKey.length - 1;
    setAnswerKey((prev) => prev.filter((_, i) => i !== idx));
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
    form.setValue("numQuestions", newCount);
  };

  const saveExam = async () => {
    const unanswered = answerKey.findIndex((ans) => !ans);
    if (unanswered !== -1) {
      toast.error(`Marque a alternativa correta da questão ${unanswered + 1}.`);
      return;
    }
    setLoading(true);
    const saveTimeoutMs = 30_000;
    try {
      const data = form.getValues();
      const payload = stripUndefined({
        ...data,
        answerKey,
        questions: questions.length > 0 ? questions : null,
        professorId: user.uid,
      });
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      await currentUser.getIdToken(true);
      await enableNetwork(db);

      const writePromise = (async (): Promise<string> => {
        if (editId) {
          await updateDoc(doc(db, "exams", editId), { ...payload, updatedAt: serverTimestamp() });
          return editId;
        }
        const docRef = await addDoc(collection(db, "exams"), { ...payload, createdAt: serverTimestamp() });
        return docRef.id;
      })();

      const targetId = await Promise.race([
        writePromise,
        new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error("Tempo esgotado ao salvar. Verifique a conexão e o Firebase.")),
            saveTimeoutMs
          );
        }),
      ]);

      toast.success("Prova salva com sucesso!");
      navigate(`/exam/${targetId}`, { replace: true });

      void queryClient.invalidateQueries({ queryKey: queryKeys.exams(user.uid), refetchType: "none" });
      void queryClient.invalidateQueries({ queryKey: queryKeys.exam(targetId), refetchType: "none" });
    } catch (error) {
      console.error("saveExam failed:", error);
      toast.error(getFirestoreErrorMessage(error, getFirebaseConfig().projectId));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 pb-12">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" onClick={() => (step === 2 ? setStep(1) : navigate("/dashboard"))}>
          <ArrowLeft className="mr-2" size={18} /> Voltar
        </Button>
        {step === 1 ? (
          <Button type="submit" form="exam-creator-step1">
            Continuar
          </Button>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button type="button" disabled={loading}>
                  {loading && <Loader2 className="animate-spin mr-2" size={18} />}
                  Salvar
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Salvar atividade?</AlertDialogTitle>
                <AlertDialogDescription>
                  A prova será gravada e você será levado à página de detalhes.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
                <AlertDialogAction disabled={loading} onClick={() => void saveExam()}>
                  {loading && <Loader2 className="animate-spin mr-2" size={18} />}
                  Salvar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {step === 1 ? (
        <Card className="overflow-visible">
          <CardHeader>
            <CardTitle>{editId ? "Editar Atividade" : "Criar Nova Atividade"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form id="exam-creator-step1" onSubmit={handleNext} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <FieldLabel htmlFor="subject" required>
                      Matéria / UC
                    </FieldLabel>
                    <Input
                      id="subject"
                      aria-invalid={!!form.formState.errors.subject}
                      {...form.register("subject")}
                      placeholder="Ex: Algoritmos II"
                    />
                    {form.formState.errors.subject && (
                      <p className="text-sm text-destructive">{form.formState.errors.subject.message}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <FieldLabel htmlFor="course" required>Curso</FieldLabel>
                      <Input id="course" placeholder="Ex: Análise e Desenvolvimento" {...form.register("course")} />
                      {form.formState.errors.course && (
                        <p className="text-sm text-destructive">{form.formState.errors.course.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <FieldLabel htmlFor="className" required>Turma</FieldLabel>
                      <Input id="className" placeholder="Ex: ADS-3A" {...form.register("className")} />
                      {form.formState.errors.className && (
                        <p className="text-sm text-destructive">{form.formState.errors.className.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <FieldLabel htmlFor="unit" required>Unidade</FieldLabel>
                      <Input id="unit" placeholder="Ex: I" {...form.register("unit")} />
                      {form.formState.errors.unit && (
                        <p className="text-sm text-destructive">{form.formState.errors.unit.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <FieldLabel htmlFor="semester" required>
                        Semestre
                      </FieldLabel>
                      <Input
                        id="semester"
                        placeholder="Ex: 2025.1"
                        aria-invalid={!!form.formState.errors.semester}
                        {...form.register("semester")}
                      />
                      {form.formState.errors.semester && (
                        <p className="text-sm text-destructive">{form.formState.errors.semester.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <FieldLabel htmlFor="numQuestions" required>
                        Qtd. Questões
                      </FieldLabel>
                      <Input
                        id="numQuestions"
                        type="number"
                        aria-invalid={!!form.formState.errors.numQuestions}
                        {...form.register("numQuestions", { valueAsNumber: true })}
                      />
                      {form.formState.errors.numQuestions && (
                        <p className="text-sm text-destructive">{form.formState.errors.numQuestions.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="alternatives">Alternativas</Label>
                      <Controller
                        name="alternativesPerQuestion"
                        control={form.control}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={(value) => field.onChange(value)}>
                            <SelectTrigger id="alternatives" className="w-full">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {[2, 3, 4, 5].map((n) => (
                                <SelectItem key={n} value={n}>
                                  {n}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      id="online"
                      checked={form.watch("isOnline")}
                      onCheckedChange={(v) => form.setValue("isOnline", v)}
                    />
                    <Label htmlFor="online">Habilitar Aplicação Online</Label>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 font-medium">
                    <Sparkles size={18} /> Geração via IA
                  </div>
                  <div className="space-y-2">
                    <LabelWithTooltip
                      label="Anexos (PDF, imagens)"
                      tooltip="Opcional. A IA usa esses arquivos como referência para criar questões ou gabarito alinhados ao seu material."
                    />
                    <div className="flex flex-wrap gap-2">
                      {contextFiles.map((file, idx) => (
                        <Badge key={idx} variant="secondary" className="gap-1">
                          <Paperclip size={12} /> {file.name}
                          <button type="button" onClick={() => setContextFiles((p) => p.filter((_, i) => i !== idx))}>
                            <X size={12} />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <label className="flex items-center justify-center gap-2 p-4 border border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                      <FileUp size={18} />
                      <span className="text-sm">Subir arquivos</span>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFileChange}
                        accept=".pdf,image/*"
                      />
                    </label>
                  </div>
                  <div className="space-y-2">
                    <LabelWithTooltip
                      htmlFor="topic"
                      label="Tópico ou Conteúdo"
                      required
                      tooltip="Descreva o assunto da prova (ex.: 'Funções recursivas')."
                    />
                    <Textarea
                      id="topic"
                      rows={3}
                      aria-invalid={!!form.formState.errors.topic}
                      {...form.register("topic")}
                    />
                    {form.formState.errors.topic && (
                      <p className="text-sm text-destructive">{form.formState.errors.topic.message}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant={hasGeneratedWithAI ? "secondary" : "outline"}
                    className="w-full"
                    disabled={aiGenerating}
                    onClick={handleGenerateAI}
                  >
                    {aiGenerating ? (
                      <Loader2 className="animate-spin mr-2" size={18} />
                    ) : (
                      <Wand2 className="mr-2" size={18} />
                    )}
                    {hasGeneratedWithAI ? "Gerar novamente" : "Gerar com IA"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="py-0">
            <CardHeader className="gap-1 p-4">
              <CardTitle>Conferir Gabarito</CardTitle>
              <p className="text-sm text-muted-foreground">Marque a alternativa correta de cada questão.</p>
            </CardHeader>
          </Card>

          <Card className="overflow-visible py-0">
            <CardContent className="space-y-6 p-4">
              <div className="space-y-6">
                {answerKey.map((ans, idx) => {
                  const altCount = form.getValues("alternativesPerQuestion");
                  const letters = ALPHABET.slice(0, altCount);
                  return (
                    <div key={idx} className="space-y-3 pb-6 border-b last:border-b-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground font-medium">Questão {idx + 1}</span>
                        <AlertDialog>
                          <Tooltip>
                            <AlertDialogTrigger
                              render={
                                <TooltipTrigger
                                  render={
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="size-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                      aria-label={`Excluir questão ${idx + 1}`}
                                    >
                                      <Trash2 size={16} />
                                    </Button>
                                  }
                                />
                              }
                            />
                            <TooltipContent side="top">Excluir questão</TooltipContent>
                          </Tooltip>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir questão {idx + 1}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta questão será removida da prova. A numeração das demais será ajustada.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction variant="destructive" onClick={() => handleRemoveQuestion(idx)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      {questions[idx] && <p className="text-sm font-medium leading-relaxed">{questions[idx].text}</p>}
                      <RadioGroup
                        value={ans}
                        onValueChange={(letter) => {
                          const newKey = [...answerKey];
                          newKey[idx] = letter;
                          setAnswerKey(newKey);
                        }}
                        className="gap-2"
                      >
                        {letters.map((letter, optIdx) => {
                          const optionId = `exam-q${idx}-opt${optIdx}`;
                          const optionText = questions[idx]?.options?.[optIdx];
                          return (
                            <div key={letter} className="flex items-start gap-3 py-1">
                              <RadioGroupItem value={letter} id={optionId} className="mt-0.5" />
                              <Label htmlFor={optionId} className="flex-1 cursor-pointer font-normal leading-snug">
                                <span className="font-medium">{letter})</span>
                                {optionText ? <span className="text-muted-foreground"> {optionText.replace(/^[a-zA-Z]\s*[-–)\.]\s*/, "")}</span> : null}
                              </Label>
                            </div>
                          );
                        })}
                      </RadioGroup>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
