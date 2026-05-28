/**
 * Temporary seed page — visit /seed while logged in to populate sample data.
 * Remove this file and its route after seeding.
 */

import { useState } from "react";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, Trash2 } from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

const ALPHABET = ["A", "B", "C", "D", "E"];

function randomAlt(n = 5) {
  return ALPHABET[Math.floor(Math.random() * n)];
}

function generateAnswerKey(numQuestions: number, alts: number): string[] {
  return Array.from({ length: numQuestions }, () => randomAlt(alts));
}

function calculateScore(answers: string[], answerKey: string[]): number {
  const correct = answers.filter((a, i) => a === answerKey[i]).length;
  return parseFloat(((correct / answerKey.length) * 10).toFixed(1));
}

function generateAnswers(answerKey: string[], targetAvg: number, alts: number): string[] {
  const hitRate = Math.min(Math.max(targetAvg / 10, 0), 1);
  return answerKey.map((correct) =>
    Math.random() < hitRate ? correct : randomAlt(alts)
  );
}

function daysAgo(n: number): Timestamp {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return Timestamp.fromDate(d);
}

// ── Data ─────────────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  "Ana", "Bruno", "Carla", "Daniel", "Eduarda", "Felipe", "Gabriela", "Henrique",
  "Isabela", "João", "Karen", "Lucas", "Mariana", "Nicolas", "Olivia", "Pedro",
  "Quezia", "Rafael", "Sabrina", "Thiago", "Ursula", "Vinícius", "Wesley", "Xandra",
  "Yasmin", "Zara", "André", "Beatriz", "Caio", "Diana", "Elias", "Fernanda",
  "Gustavo", "Helena", "Igor", "Juliana", "Leonardo", "Milena", "Nathan", "Patricia",
  "Rodrigo", "Simone", "Tiago", "Vanessa", "William", "Ximena", "Yuri", "Zélia",
  "Alexandre", "Bruna", "César", "Débora", "Emanuel", "Flávia", "Gabriel", "Hanna",
  "Ivan", "Joana", "Klaus", "Larissa", "Marcos", "Nathalia", "Otávio", "Paula",
];

const LAST_NAMES = [
  "Souza", "Lima", "Mendes", "Rocha", "Ferreira", "Costa", "Nunes", "Alves",
  "Martins", "Oliveira", "Silva", "Pereira", "Santos", "Ribeiro", "Cardoso",
  "Barbosa", "Moreira", "Dias", "Teixeira", "Gomes", "Freitas", "Melo", "Correia",
  "Vieira", "Castro", "Monteiro", "Batista", "Fonseca", "Rezende", "Pinto",
  "Cunha", "Leal", "Borges", "Assis", "Macedo", "Campos", "Braga", "Ramos",
  "Coelho", "Moura", "Carvalho", "Araújo", "Fernandes", "Rodrigues", "Nascimento",
  "Azevedo", "Cavalcanti", "Peixoto", "Duarte", "Andrade",
];

function randomName(used: Set<string>): string {
  let name: string;
  let attempts = 0;
  do {
    const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    name = `${first} ${last}`;
    attempts++;
  } while (used.has(name) && attempts < 200);
  used.add(name);
  return name;
}

function generateStudents(n: number): string[] {
  const used = new Set<string>();
  return Array.from({ length: n }, () => randomName(used));
}

const EXAMS = [
  // ── ADS 2025.1 ──────────────────────────────────────────────────────────────
  { subject: "Algoritmos e Estrutura de Dados", course: "Análise e Desenvolvimento de Sistemas", className: "ADS-3A", unit: "I",   semester: "2025.1", numQuestions: 10, alternativesPerQuestion: 5, isOnline: true,  numStudents: 38, avgScore: 7.2, createdDaysAgo: 80  },
  { subject: "Algoritmos e Estrutura de Dados", course: "Análise e Desenvolvimento de Sistemas", className: "ADS-3A", unit: "II",  semester: "2025.1", numQuestions: 10, alternativesPerQuestion: 5, isOnline: true,  numStudents: 36, avgScore: 6.8, createdDaysAgo: 45  },
  { subject: "Algoritmos e Estrutura de Dados", course: "Análise e Desenvolvimento de Sistemas", className: "ADS-3B", unit: "I",   semester: "2025.1", numQuestions: 10, alternativesPerQuestion: 5, isOnline: true,  numStudents: 34, avgScore: 6.5, createdDaysAgo: 78  },
  { subject: "Banco de Dados",                  course: "Análise e Desenvolvimento de Sistemas", className: "ADS-2A", unit: "I",   semester: "2025.1", numQuestions: 10, alternativesPerQuestion: 4, isOnline: true,  numStudents: 30, avgScore: 6.9, createdDaysAgo: 65  },
  { subject: "Banco de Dados",                  course: "Análise e Desenvolvimento de Sistemas", className: "ADS-2A", unit: "II",  semester: "2025.1", numQuestions: 10, alternativesPerQuestion: 4, isOnline: true,  numStudents: 28, avgScore: 7.3, createdDaysAgo: 22  },
  { subject: "Banco de Dados",                  course: "Análise e Desenvolvimento de Sistemas", className: "ADS-2B", unit: "I",   semester: "2025.1", numQuestions: 10, alternativesPerQuestion: 4, isOnline: false, numStudents: 32, avgScore: 6.1, createdDaysAgo: 62  },
  { subject: "Engenharia de Software",          course: "Análise e Desenvolvimento de Sistemas", className: "ADS-4A", unit: "I",   semester: "2025.1", numQuestions: 10, alternativesPerQuestion: 4, isOnline: false, numStudents: 25, avgScore: 7.5, createdDaysAgo: 55  },
  { subject: "Engenharia de Software",          course: "Análise e Desenvolvimento de Sistemas", className: "ADS-4A", unit: "II",  semester: "2025.1", numQuestions: 10, alternativesPerQuestion: 4, isOnline: false, numStudents: 24, avgScore: 8.0, createdDaysAgo: 12  },
  { subject: "Programação Web",                 course: "Análise e Desenvolvimento de Sistemas", className: "ADS-3A", unit: "I",   semester: "2025.1", numQuestions: 10, alternativesPerQuestion: 5, isOnline: true,  numStudents: 38, avgScore: 8.3, createdDaysAgo: 35  },
  { subject: "Programação Web",                 course: "Análise e Desenvolvimento de Sistemas", className: "ADS-3A", unit: "II",  semester: "2025.1", numQuestions: 10, alternativesPerQuestion: 5, isOnline: true,  numStudents: 37, avgScore: 7.8, createdDaysAgo: 10  },
  { subject: "Programação Mobile",              course: "Análise e Desenvolvimento de Sistemas", className: "ADS-4B", unit: "I",   semester: "2025.1", numQuestions: 10, alternativesPerQuestion: 4, isOnline: true,  numStudents: 22, avgScore: 7.1, createdDaysAgo: 50  },
  { subject: "Programação Mobile",              course: "Análise e Desenvolvimento de Sistemas", className: "ADS-4B", unit: "II",  semester: "2025.1", numQuestions: 10, alternativesPerQuestion: 4, isOnline: true,  numStudents: 21, avgScore: 7.6, createdDaysAgo: 14  },
  { subject: "Segurança da Informação",         course: "Análise e Desenvolvimento de Sistemas", className: "ADS-5A", unit: "I",   semester: "2025.1", numQuestions: 10, alternativesPerQuestion: 5, isOnline: true,  numStudents: 19, avgScore: 6.7, createdDaysAgo: 42  },
  // ── CC 2025.1 ───────────────────────────────────────────────────────────────
  { subject: "Redes de Computadores",           course: "Ciência da Computação",                  className: "CC-4A",  unit: "II",  semester: "2025.1", numQuestions: 10, alternativesPerQuestion: 5, isOnline: false, numStudents: 20, avgScore: 5.8, createdDaysAgo: 38  },
  { subject: "Redes de Computadores",           course: "Ciência da Computação",                  className: "CC-4A",  unit: "III", semester: "2025.1", numQuestions: 10, alternativesPerQuestion: 5, isOnline: false, numStudents: 19, avgScore: 6.2, createdDaysAgo: 18  },
  { subject: "Sistemas Operacionais",           course: "Ciência da Computação",                  className: "CC-3A",  unit: "I",   semester: "2025.1", numQuestions: 10, alternativesPerQuestion: 5, isOnline: true,  numStudents: 22, avgScore: 7.4, createdDaysAgo: 58  },
  { subject: "Sistemas Operacionais",           course: "Ciência da Computação",                  className: "CC-3B",  unit: "II",  semester: "2025.1", numQuestions: 10, alternativesPerQuestion: 5, isOnline: true,  numStudents: 21, avgScore: 8.1, createdDaysAgo: 18  },
  { subject: "Compiladores",                    course: "Ciência da Computação",                  className: "CC-4B",  unit: "I",   semester: "2025.1", numQuestions: 10, alternativesPerQuestion: 5, isOnline: false, numStudents: 16, avgScore: 6.1, createdDaysAgo: 48  },
  { subject: "Inteligência Artificial",         course: "Ciência da Computação",                  className: "CC-5A",  unit: "I",   semester: "2025.1", numQuestions: 10, alternativesPerQuestion: 4, isOnline: true,  numStudents: 18, avgScore: 7.9, createdDaysAgo: 28  },
  { subject: "Inteligência Artificial",         course: "Ciência da Computação",                  className: "CC-5A",  unit: "II",  semester: "2025.1", numQuestions: 10, alternativesPerQuestion: 4, isOnline: true,  numStudents: 17, avgScore: 8.4, createdDaysAgo: 6   },
  { subject: "Arquitetura de Computadores",     course: "Ciência da Computação",                  className: "CC-2A",  unit: "I",   semester: "2025.1", numQuestions: 10, alternativesPerQuestion: 5, isOnline: false, numStudents: 24, avgScore: 6.4, createdDaysAgo: 70  },
  { subject: "Teoria da Computação",            course: "Ciência da Computação",                  className: "CC-4C",  unit: "I",   semester: "2025.1", numQuestions: 10, alternativesPerQuestion: 5, isOnline: false, numStudents: 15, avgScore: 5.3, createdDaysAgo: 52  },
  // ── EC 2024.2 ───────────────────────────────────────────────────────────────
  { subject: "Cálculo I",                       course: "Engenharia de Computação",               className: "EC-1A",  unit: "III", semester: "2024.2", numQuestions: 10, alternativesPerQuestion: 5, isOnline: false, numStudents: 40, avgScore: 5.1, createdDaysAgo: 200 },
  { subject: "Cálculo I",                       course: "Engenharia de Computação",               className: "EC-1A",  unit: "IV",  semester: "2024.2", numQuestions: 10, alternativesPerQuestion: 5, isOnline: false, numStudents: 38, avgScore: 4.9, createdDaysAgo: 175 },
  { subject: "Cálculo II",                      course: "Engenharia de Computação",               className: "EC-2A",  unit: "II",  semester: "2024.2", numQuestions: 10, alternativesPerQuestion: 5, isOnline: false, numStudents: 35, avgScore: 4.5, createdDaysAgo: 170 },
  { subject: "Cálculo II",                      course: "Engenharia de Computação",               className: "EC-2A",  unit: "III", semester: "2024.2", numQuestions: 10, alternativesPerQuestion: 5, isOnline: false, numStudents: 33, avgScore: 4.2, createdDaysAgo: 150 },
  { subject: "Física para Computação",          course: "Engenharia de Computação",               className: "EC-1B",  unit: "I",   semester: "2024.2", numQuestions: 10, alternativesPerQuestion: 5, isOnline: false, numStudents: 36, avgScore: 5.8, createdDaysAgo: 185 },
  { subject: "Física para Computação",          course: "Engenharia de Computação",               className: "EC-1B",  unit: "II",  semester: "2024.2", numQuestions: 10, alternativesPerQuestion: 5, isOnline: false, numStudents: 34, avgScore: 5.5, createdDaysAgo: 155 },
  { subject: "Eletrônica Digital",              course: "Engenharia de Computação",               className: "EC-2B",  unit: "I",   semester: "2024.2", numQuestions: 10, alternativesPerQuestion: 4, isOnline: false, numStudents: 30, avgScore: 6.3, createdDaysAgo: 165 },
  // ── Sem submissões ───────────────────────────────────────────────────────────
  { subject: "Machine Learning",                course: "Ciência da Computação",                  className: "CC-5B",  unit: "I",   semester: "2025.1", numQuestions: 10, alternativesPerQuestion: 4, isOnline: true,  numStudents: 20, avgScore: 0,   createdDaysAgo: 2   },
  { subject: "DevOps e Cloud",                  course: "Análise e Desenvolvimento de Sistemas", className: "ADS-5B", unit: "I",   semester: "2025.1", numQuestions: 10, alternativesPerQuestion: 4, isOnline: true,  numStudents: 18, avgScore: 0,   createdDaysAgo: 1   },
];

// ── Clean ────────────────────────────────────────────────────────────────────

async function cleanExams(uid: string, push: (m: string) => void) {
  push("🧹 Limpando provas existentes…");
  const snap = await getDocs(query(collection(db, "exams"), where("professorId", "==", uid)));
  let deleted = 0;
  for (const examDoc of snap.docs) {
    for (const sub of ["submissions", "students", "plans"]) {
      const subSnap = await getDocs(collection(db, "exams", examDoc.id, sub));
      await Promise.all(subSnap.docs.map((d) => deleteDoc(doc(db, "exams", examDoc.id, sub, d.id))));
    }
    await deleteDoc(doc(db, "exams", examDoc.id));
    deleted++;
  }
  push(`   Removidas ${deleted} provas anteriores.`);
}

// ── Seed ─────────────────────────────────────────────────────────────────────

async function seedExams(uid: string, push: (m: string) => void) {
  push("🌱 Criando novas provas…");
  for (const def of EXAMS) {
    const answerKey = generateAnswerKey(def.numQuestions, def.alternativesPerQuestion);

    const examRef = await addDoc(collection(db, "exams"), {
      subject: def.subject,
      course: def.course,
      className: def.className,
      unit: def.unit,
      semester: def.semester,
      numQuestions: def.numQuestions,
      alternativesPerQuestion: def.alternativesPerQuestion,
      isOnline: def.isOnline,
      answerKey,
      professorId: uid,
      createdAt: daysAgo(def.createdDaysAgo),
    });

    const students = generateStudents(def.numStudents);

    for (const name of students) {
      await addDoc(collection(db, "exams", examRef.id, "students"), {
        name,
        createdAt: daysAgo(def.createdDaysAgo - 1),
      });
    }

    // Last exam has no submissions on purpose
    if (def.avgScore === 0) {
      push(`📝 ${def.subject} (${def.className}) — ${students.length} alunos, sem submissões`);
      continue;
    }

    const submissionRate = 0.75 + Math.random() * 0.2;
    const submitters = students.slice(0, Math.floor(students.length * submissionRate));

    for (const name of submitters) {
      const noise = Math.random() * 2.5 - 1.25;
      const answers = generateAnswers(answerKey, def.avgScore + noise, def.alternativesPerQuestion);
      const score = calculateScore(answers, answerKey);
      await addDoc(collection(db, "exams", examRef.id, "submissions"), {
        studentName: name,
        answers,
        score,
        gradedAt: daysAgo(Math.floor(Math.random() * Math.max(def.createdDaysAgo - 1, 1))),
        isOnline: def.isOnline,
      });
    }

    push(`✅ ${def.subject} (${def.className} · Un.${def.unit}) — ${students.length} alunos, ${submitters.length} submissões`);
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

type Status = "idle" | "running" | "done" | "error";

export function SeedPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>("idle");
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string>("");

  const push = (msg: string) => setLog((prev) => [...prev, msg]);

  const run = async (cleanFirst: boolean) => {
    if (!user) return;
    setStatus("running");
    setLog([]);
    setError("");
    try {
      if (cleanFirst) await cleanExams(user.uid, push);
      await seedExams(user.uid, push);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  };

  const isRunning = status === "running";
  const isDone = status === "done";

  return (
    <div className="max-w-lg mx-auto space-y-6 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Seed de dados</CardTitle>
          <CardDescription>
            Cria {EXAMS.length} provas com alunos aleatórios e submissões no Firestore.<br />
            <strong className="text-destructive">Remova esta página após usar.</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={() => run(true)} disabled={isRunning || isDone} className="w-full">
            {isRunning ? <Loader2 className="mr-2 animate-spin" size={16} /> : <Trash2 className="mr-2" size={16} />}
            {isRunning ? "Executando…" : "Limpar e fazer Seed"}
          </Button>
          <Button variant="outline" onClick={() => run(false)} disabled={isRunning || isDone} className="w-full">
            Apenas adicionar (sem limpar)
          </Button>

          {log.length > 0 && (
            <div className="rounded-lg bg-muted p-3 space-y-1 max-h-72 overflow-y-auto">
              {log.map((l, i) => (
                <p key={i} className="text-xs font-mono">{l}</p>
              ))}
            </div>
          )}

          {isDone && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
              <CheckCircle2 size={16} /> Concluído! Acesse o <a href="/dashboard" className="underline">dashboard</a>.
            </div>
          )}

          {status === "error" && (
            <div className="flex items-start gap-2 text-destructive text-sm">
              <XCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
