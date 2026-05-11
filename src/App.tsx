import { useState, useEffect } from "react";
import { auth, db } from "./lib/firebase";
import { GoogleAuthProvider, signInWithPopup, OAuthProvider, onAuthStateChanged, User } from "firebase/auth";
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { Dashboard } from "./components/Dashboard";
import { ExamCreator } from "./components/ExamCreator";
import { Scanner } from "./components/Scanner";
import { ExamDetail } from "./components/ExamDetail";
import { OnlineExam } from "./components/OnlineExam";
import { StudentPortal } from "./components/StudentPortal";
import { Header } from "./components/Header";
import { motion, AnimatePresence } from "motion/react";
import { LogIn, Plus } from "lucide-react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<"dashboard" | "create" | "scan" | "detail" | "portal" | "online_exam">("portal");
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [editingExam, setEditingExam] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(() => localStorage.getItem("theme") === "dark");

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) setView("dashboard");
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (providerType: "google" | "microsoft" = "google") => {
    let provider;
    if (providerType === "google") {
      provider = new GoogleAuthProvider();
    } else {
      provider = new OAuthProvider('microsoft.com');
    }
    await signInWithPopup(auth, provider);
  };

  const handleEnterExam = async (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    // 1. Try to fetch as Access Token first
    try {
      if (!code) return;
      console.log("Verificando token:", code);
      const tokenSnap = await getDoc(doc(db, "access_tokens", code));
      if (tokenSnap.exists()) {
        const tokenData = tokenSnap.data();
        console.log("Token encontrado:", tokenData);
        if (tokenData.isUsed) {
          alert("Este código de acesso já foi utilizado.");
          return;
        }
        setSelectedToken(code);
        setSelectedExamId(tokenData.examId);
        setView("online_exam");
        return;
      }
    } catch (e) {
      console.error("Erro detalhado ao verificar token:", e);
      alert("Erro de conexão ao verificar o código. Tente novamente.");
    }

    // 2. Fallback to direct Exam ID (for open exams)
    setSelectedToken(null);
    setSelectedExamId(code);
    setView("online_exam");
  };

  if (loading) return null;

  if (!user && view !== "online_exam" && view !== "portal") {
    return <StudentPortal 
      onEnterExam={handleEnterExam} 
      onProfessorLogin={login} 
      isDark={isDark} 
      setIsDark={setIsDark}
    />;
  }

  if (view === "portal") {
    return <StudentPortal 
      onEnterExam={handleEnterExam} 
      onProfessorLogin={login} 
      isDark={isDark} 
      setIsDark={setIsDark}
    />;
  }

  if (view === "online_exam" && selectedExamId) {
    return <OnlineExam 
      examId={selectedExamId} 
      accessToken={selectedToken || undefined}
      onFinished={() => {
        setSelectedToken(null);
        setView("portal");
      }} 
      isDark={isDark} 
      setIsDark={setIsDark} 
    />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors">
      <Header user={user} setView={setView} isDark={isDark} setIsDark={setIsDark} />
      
      <main className="flex-1 max-w-6xl w-full mx-auto p-6">
        <AnimatePresence mode="wait">
          {view === "dashboard" && (
            <motion.div
              key="dash"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Dashboard 
                user={user} 
                onSelectExam={(id) => {
                  setSelectedExamId(id);
                  setView("detail");
                }}
                onEditExam={(exam) => {
                  setEditingExam(exam);
                  setView("create");
                }}
                onCreate={() => {
                  setEditingExam(null);
                  setView("create");
                }}
                onScan={() => setView("scan")}
              />
            </motion.div>
          )}
          {view === "create" && (
            <motion.div
              key="create"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <ExamCreator 
                user={user} 
                initialData={editingExam}
                onCancel={() => {
                  setEditingExam(null);
                  setView("dashboard");
                }}
                onCreated={(id) => {
                  setEditingExam(null);
                  setSelectedExamId(id);
                  setView("detail");
                }}
              />
            </motion.div>
          )}
          {view === "scan" && (
            <motion.div
              key="scan"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Scanner 
                onBack={() => setView("dashboard")}
                onScanned={(examId) => {
                  setSelectedExamId(examId);
                  setView("detail");
                }}
              />
            </motion.div>
          )}
          {view === "detail" && selectedExamId && (
            <motion.div
              key="detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ExamDetail 
                examId={selectedExamId}
                onEdit={(exam) => {
                  setEditingExam(exam);
                  setView("create");
                }}
                onBack={() => setView("dashboard")}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
