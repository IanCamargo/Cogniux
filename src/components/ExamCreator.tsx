import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { User } from "firebase/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { collection, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { ArrowLeft, Save, Sparkles, Wand2, Loader2, Paperclip, X, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase";
import { queryKeys } from "@/lib/queryKeys";
import { useFirestoreDocQuery } from "@/hooks/firestore/useFirestoreDocQuery";
import { generateExamQuestions, generateAnswerKey } from "@/services/geminiService";
import type { Exam, GeneratedQuestion } from "@/types";
import { toast } from "sonner";

const step1Schema = z.object({
  subject: z.string().min(1, "Matéria é obrigatória"),
  semester: z.string().min(1),
  course: z.string().optional(),
  className: z.string().optional(),
  unit: z.string().optional(),
  numQuestions: z.number().min(1).max(100),
  alternativesPerQuestion: z.number().min(2).max(5),
  isOnline: z.boolean(),
});

type Step1Data = z.infer<typeof step1Schema>;

const defaultSemester = `${new Date().getFullYear()}.${new Date().getMonth() < 6 ? "1" : "2"}`;

const defaultFormValues: Step1Data = {
  subject: "",
  semester: defaultSemester,
  course: "",
  className: "",
  unit: "",
  numQuestions: 10,
  alternativesPerQuestion: 5,
  isOnline: false,
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

  return (
    <ExamCreatorForm
      key={editId ?? "new"}
      user={user}
      editId={editId}
      existingExam={existingExam ?? null}
    />
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
  const [generationMode, setGenerationMode] = useState<"full" | "key">("full");
  const [questions, setQuestions] = useState<GeneratedQuestion[]>(existingExam?.questions ?? []);
  const [answerKey, setAnswerKey] = useState<string[]>(existingExam?.answerKey ?? []);
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [topic, setTopic] = useState("");
  const [contextFiles, setContextFiles] = useState<{ name: string; data: string; mimeType: string }[]>([]);

  const form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
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

  const handleNext = form.handleSubmit((data) => {
    if (answerKey.length !== data.numQuestions) {
      const newKey = [...answerKey];
      while (newKey.length < data.numQuestions) newKey.push("");
      setAnswerKey(newKey.slice(0, data.numQuestions));
    }
    setStep(2);
  });

  const handleGenerateAI = async () => {
    const subject = form.getValues("subject");
    if (!subject || !topic) {
      toast.error("Preencha a matéria e o tópico.");
      return;
    }
    setAiGenerating(true);
    try {
      const filesForAI = contextFiles.map((f) => ({ data: f.data, mimeType: f.mimeType }));
      const numQ = form.getValues("numQuestions");
      if (generationMode === "full") {
        const generated = await generateExamQuestions(subject, topic, numQ, "intermediate", filesForAI);
        setQuestions(generated);
        setAnswerKey(generated.map((q) => q.correctAnswer));
      } else {
        const key = await generateAnswerKey(subject, topic, numQ, filesForAI);
        setAnswerKey(key);
        setQuestions([]);
      }
      toast.success("Conteúdo gerado com sucesso!");
    } catch {
      toast.error("Erro ao gerar conteúdo via IA.");
    } finally {
      setAiGenerating(false);
    }
  };

  const saveExam = async () => {
    if (answerKey.includes("")) {
      toast.error("Preencha todas as respostas do gabarito.");
      return;
    }
    setLoading(true);
    try {
      const data = form.getValues();
      const payload = {
        ...data,
        answerKey,
        questions: questions.length > 0 ? questions : null,
        professorId: user.uid,
      };

      if (editId) {
        await updateDoc(doc(db, "exams", editId), { ...payload, updatedAt: serverTimestamp() });
        navigate(`/exam/${editId}`);
      } else {
        const docRef = await addDoc(collection(db, "exams"), { ...payload, createdAt: serverTimestamp() });
        navigate(`/exam/${docRef.id}`);
      }
      toast.success("Prova salva com sucesso!");
    } catch {
      toast.error("Erro ao salvar prova.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <Button variant="ghost" onClick={() => navigate("/dashboard")}>
        <ArrowLeft className="mr-2" size={18} /> Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{editId ? "Editar Atividade" : "Criar Nova Atividade"}</CardTitle>
          <CardDescription>Passo {step} de 2</CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <form onSubmit={handleNext} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Matéria / UC</Label>
                    <Input id="subject" {...form.register("subject")} placeholder="Ex: Algoritmos II" />
                    {form.formState.errors.subject && (
                      <p className="text-sm text-destructive">{form.formState.errors.subject.message}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="course">Curso</Label>
                      <Input id="course" {...form.register("course")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="className">Turma</Label>
                      <Input id="className" {...form.register("className")} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="unit">Unidade</Label>
                      <Input id="unit" {...form.register("unit")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="semester">Semestre</Label>
                      <Input id="semester" {...form.register("semester")} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="numQuestions">Qtd. Questões</Label>
                      <Input
                        id="numQuestions"
                        type="number"
                        {...form.register("numQuestions", { valueAsNumber: true })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="alternatives">Alternativas</Label>
                      <select
                        id="alternatives"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                        {...form.register("alternativesPerQuestion", { valueAsNumber: true })}
                      >
                        {[2, 3, 4, 5].map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
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

                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 font-medium">
                    <Sparkles size={18} /> Geração via IA
                  </div>
                  <Tabs value={generationMode} onValueChange={(v) => setGenerationMode(v as "full" | "key")}>
                    <TabsList className="w-full">
                      <TabsTrigger value="full" className="flex-1">Prova Completa</TabsTrigger>
                      <TabsTrigger value="key" className="flex-1">Apenas Gabarito</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <div className="space-y-2">
                    <Label>Anexos (PDF, imagens)</Label>
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
                      <input type="file" multiple className="hidden" onChange={handleFileChange} accept=".pdf,image/*" />
                    </label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="topic">Tópico ou Conteúdo</Label>
                    <Textarea id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} rows={3} />
                  </div>
                  <Button type="button" variant="outline" className="w-full" disabled={aiGenerating} onClick={handleGenerateAI}>
                    {aiGenerating ? <Loader2 className="animate-spin mr-2" size={18} /> : <Wand2 className="mr-2" size={18} />}
                    Gerar com IA
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full">Próximo Passo</Button>
            </form>
          ) : (
            <div className="space-y-6">
              <h3 className="font-semibold">Conferir Gabarito</h3>
              <div className="grid md:grid-cols-2 gap-4 max-h-[480px] overflow-y-auto">
                {answerKey.map((ans, idx) => (
                  <div key={idx} className="p-4 border rounded-lg space-y-2">
                    <span className="text-xs text-muted-foreground font-medium">Questão {idx + 1}</span>
                    {questions[idx] && <p className="text-sm line-clamp-2">{questions[idx].text}</p>}
                    <div className="flex gap-1">
                      {ALPHABET.slice(0, form.getValues("alternativesPerQuestion")).map((letter) => (
                        <Button
                          key={letter}
                          type="button"
                          size="sm"
                          variant={ans === letter ? "default" : "outline"}
                          className="flex-1"
                          onClick={() => {
                            const newKey = [...answerKey];
                            newKey[idx] = letter;
                            setAnswerKey(newKey);
                          }}
                        >
                          {letter}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-4">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Voltar</Button>
                <Button className="flex-[2]" disabled={loading} onClick={saveExam}>
                  {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" size={18} />}
                  Salvar Atividade
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
