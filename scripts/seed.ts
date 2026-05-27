/**
 * Seed script — populates Firestore with sample exam data.
 * Run: npx tsx scripts/seed.ts
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

// ── Config ───────────────────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey: "AIzaSyBaKk0q0lOK_ezXARzQFK9UpCeU2OjA00A",
  authDomain: "projeto-c1883.firebaseapp.com",
  projectId: "projeto-c1883",
  storageBucket: "projeto-c1883.firebasestorage.app",
  messagingSenderId: "729485791002",
  appId: "1:729485791002:web:53e08ca593cdf2809a26a3",
};

const PROFESSOR_UID = "CIryJKeWQKdZbSh4zyprSlHn7zf2";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

/** Generates answers biased toward a target score range */
function generateAnswers(answerKey: string[], targetAvg: number, alts: number): string[] {
  const hitRate = targetAvg / 10;
  return answerKey.map((correct) =>
    Math.random() < hitRate ? correct : randomAlt(alts)
  );
}

function daysAgo(n: number): Timestamp {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return Timestamp.fromDate(d);
}

// ── Data definitions ─────────────────────────────────────────────────────────

const STUDENT_NAMES = [
  "Ana Souza", "Bruno Lima", "Carla Mendes", "Daniel Rocha", "Eduarda Ferreira",
  "Felipe Costa", "Gabriela Nunes", "Henrique Alves", "Isabela Martins", "João Oliveira",
  "Karen Silva", "Lucas Pereira", "Mariana Santos", "Nicolas Ribeiro", "Olivia Cardoso",
  "Pedro Barbosa", "Quezia Moreira", "Rafael Dias", "Sabrina Teixeira", "Thiago Gomes",
  "Ursula Freitas", "Vinícius Melo", "Wesley Correia", "Xandra Vieira", "Yasmin Castro",
  "Zara Monteiro",
];

interface ExamDef {
  subject: string;
  course: string;
  className: string;
  unit: string;
  semester: string;
  numQuestions: number;
  alternativesPerQuestion: number;
  isOnline: boolean;
  numStudents: number;
  avgScore: number; // target average for score generation
  createdDaysAgo: number;
}

const EXAMS: ExamDef[] = [
  {
    subject: "Algoritmos e Estrutura de Dados",
    course: "Análise e Desenvolvimento de Sistemas",
    className: "ADS-3A",
    unit: "II",
    semester: "2025.1",
    numQuestions: 10,
    alternativesPerQuestion: 5,
    isOnline: true,
    numStudents: 22,
    avgScore: 7.2,
    createdDaysAgo: 45,
  },
  {
    subject: "Banco de Dados",
    course: "Análise e Desenvolvimento de Sistemas",
    className: "ADS-2B",
    unit: "I",
    semester: "2025.1",
    numQuestions: 10,
    alternativesPerQuestion: 4,
    isOnline: true,
    numStudents: 18,
    avgScore: 6.4,
    createdDaysAgo: 30,
  },
  {
    subject: "Redes de Computadores",
    course: "Ciência da Computação",
    className: "CC-4A",
    unit: "III",
    semester: "2025.1",
    numQuestions: 10,
    alternativesPerQuestion: 5,
    isOnline: false,
    numStudents: 15,
    avgScore: 5.8,
    createdDaysAgo: 20,
  },
  {
    subject: "Sistemas Operacionais",
    course: "Ciência da Computação",
    className: "CC-3B",
    unit: "II",
    semester: "2025.1",
    numQuestions: 10,
    alternativesPerQuestion: 5,
    isOnline: true,
    numStudents: 20,
    avgScore: 8.1,
    createdDaysAgo: 15,
  },
  {
    subject: "Engenharia de Software",
    course: "Análise e Desenvolvimento de Sistemas",
    className: "ADS-4A",
    unit: "I",
    semester: "2025.1",
    numQuestions: 10,
    alternativesPerQuestion: 4,
    isOnline: false,
    numStudents: 12,
    avgScore: 7.5,
    createdDaysAgo: 8,
  },
  {
    subject: "Cálculo I",
    course: "Engenharia de Computação",
    className: "EC-1A",
    unit: "IV",
    semester: "2024.2",
    numQuestions: 10,
    alternativesPerQuestion: 5,
    isOnline: false,
    numStudents: 25,
    avgScore: 4.9,
    createdDaysAgo: 90,
  },
];

// ── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Starting seed...\n");

  for (const def of EXAMS) {
    const answerKey = generateAnswerKey(def.numQuestions, def.alternativesPerQuestion);

    // Create exam
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
      professorId: PROFESSOR_UID,
      createdAt: daysAgo(def.createdDaysAgo),
    });

    console.log(`📝 Created exam: ${def.subject} (${examRef.id})`);

    // Pick students
    const shuffled = [...STUDENT_NAMES].sort(() => Math.random() - 0.5);
    const students = shuffled.slice(0, def.numStudents);

    // Add students sub-collection
    for (const name of students) {
      await addDoc(collection(db, "exams", examRef.id, "students"), {
        name,
        createdAt: daysAgo(def.createdDaysAgo - 1),
      });
    }

    // Add submissions — 70–90% of students submitted
    const submitters = students.slice(0, Math.floor(students.length * (0.7 + Math.random() * 0.2)));

    for (const name of submitters) {
      const answers = generateAnswers(answerKey, def.avgScore + (Math.random() * 3 - 1.5), def.alternativesPerQuestion);
      const score = calculateScore(answers, answerKey);
      await addDoc(collection(db, "exams", examRef.id, "submissions"), {
        studentName: name,
        answers,
        score,
        gradedAt: daysAgo(Math.floor(Math.random() * (def.createdDaysAgo - 1))),
        isOnline: def.isOnline,
      });
    }

    console.log(`   👥 ${students.length} students, ${submitters.length} submissions`);
  }

  console.log("\n✅ Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
