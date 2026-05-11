import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc, collection, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, Loader2, ArrowRight, ArrowLeft, Send, BrainCircuit, AlertCircle, Sun, Moon, Key } from "lucide-react";
import { cn } from "../lib/utils";

interface OnlineExamProps {
  examId: string;
  accessToken?: string;
  onFinished: () => void;
  isDark: boolean;
  setIsDark: (v: boolean) => void;
}

export function OnlineExam({ examId, accessToken, onFinished, isDark, setIsDark }: OnlineExamProps) {
  const [exam, setExam] = useState<any>(null);
  const [studentName, setStudentName] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [step, setStep] = useState<"name" | "exam" | "finished">("name");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExamAndToken = async () => {
      try {
        // 1. Fetch Token if present
        if (accessToken) {
          const tSnap = await getDoc(doc(db, "access_tokens", accessToken));
          if (tSnap.exists()) {
            const tData = tSnap.data();
            if (tData.studentName) {
              setStudentName(tData.studentName);
              setStep("exam"); // Skip name step if pre-filled
            }
          }
        }

        // 2. Fetch Exam
        const docSnap = await getDoc(doc(db, "exams", examId));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (!data.isOnline) {
            setError("Esta atividade não está habilitada para aplicação online.");
          } else {
            setExam({ id: docSnap.id, ...data });
            setAnswers(new Array(data.numQuestions).fill(""));
          }
        } else {
          setError("Atividade não encontrada.");
        }
      } catch (e) {
        console.error(e);
        setError("Erro ao carregar atividade.");
      } finally {
        setLoading(false);
      }
    };
    fetchExamAndToken();
  }, [examId, accessToken]);

  const handleSubmit = async () => {
    if (answers.includes("")) return alert("Por favor, responda todas as questões!");
    setSubmitting(true);
    try {
      let correct = 0;
      answers.forEach((ans, idx) => {
        if (ans === exam.answerKey[idx]) correct++;
      });
      const score = (correct / exam.numQuestions) * 10;

      // 1. Add Submission
      await addDoc(collection(db, "exams", examId, "submissions"), {
        studentName,
        answers,
        score,
        gradedAt: serverTimestamp(),
        isOnline: true,
        accessToken: accessToken || null
      });

      // 2. Mark Token as used
      if (accessToken) {
        await updateDoc(doc(db, "access_tokens", accessToken), {
          isUsed: true,
          usedAt: serverTimestamp()
        });
      }

      setStep("finished");
    } catch (e) {
      console.error(e);
      alert("Erro ao enviar respostas.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-indigo-600" size={40} />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <AlertCircle className="text-rose-500 mb-4" size={64} />
      <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Ops!</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-8">{error}</p>
      <button onClick={onFinished} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold">Voltar</button>
    </div>
  );

  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 transition-colors relative">
      <button 
        onClick={() => setIsDark(!isDark)}
        className="fixed top-4 right-4 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-400 z-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
      >
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>
      <AnimatePresence mode="wait">
        {step === "name" && (
          <motion.div
            key="name"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-md mx-auto mt-20"
          >
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-8">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center mx-auto text-white shadow-lg shadow-indigo-200">
                  <BrainCircuit size={32} />
                </div>
                <h2 className="text-2xl font-display font-black text-slate-900 dark:text-white">Identificação do Aluno</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Insira seu nome completo para iniciar a atividade.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Seu Nome</label>
                  <input
                    type="text"
                    placeholder="Ex: João da Silva"
                    autoFocus
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none transition-all dark:text-white font-bold"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && studentName.trim() && setStep("exam")}
                  />
                </div>
                <button
                  disabled={!studentName.trim()}
                  onClick={() => setStep("exam")}
                  className="w-full py-4 bg-indigo-600 hover:bg-black text-white rounded-2xl font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  Iniciar Atividade
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === "exam" && (
          <motion.div
            key="exam"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-8 text-white flex justify-between items-center">
                <div className="space-y-1">
                  <h3 className="text-2xl font-display font-black leading-none">{exam.subject}</h3>
                  <p className="text-indigo-200 text-sm font-bold uppercase tracking-widest">{exam.course || exam.unit || "Avaliação Online"}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase opacity-60">Aluno</p>
                  <p className="font-bold">{studentName}</p>
                </div>
              </div>

              <div className="p-8 md:p-12 space-y-10">
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex gap-1 overflow-x-auto pb-2 no-scrollbar px-2">
                    {Array.from({ length: exam.numQuestions }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentQuestion(i)}
                        className={cn(
                          "w-10 h-10 rounded-xl flex-shrink-0 font-black text-sm transition-all",
                          currentQuestion === i 
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none" 
                            : answers[i] 
                              ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" 
                              : "bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700"
                        )}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <div className="pl-4 border-l border-slate-200 dark:border-slate-700 text-right">
                    <span className="block text-[10px] font-black text-slate-400 uppercase">Progresso</span>
                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                      {answers.filter(a => a).length}/{exam.numQuestions}
                    </span>
                  </div>
                </div>

                <div className="space-y-8 py-4">
                  <div className="space-y-4">
                    <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-black uppercase tracking-widest">Questão {currentQuestion + 1}</span>
                    <h4 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 leading-relaxed">
                      {exam.questions?.[currentQuestion]?.text || "Marque a alternativa correta abaixo:"}
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {ALPHABET.slice(0, exam.alternativesPerQuestion).map((letter, idx) => (
                      <button
                        key={letter}
                        onClick={() => {
                          const newAns = [...answers];
                          newAns[currentQuestion] = letter;
                          setAnswers(newAns);
                        }}
                        className={cn(
                          "w-full p-5 rounded-[24px] text-left font-bold transition-all border-2 flex items-center gap-4 group",
                          answers[currentQuestion] === letter
                            ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-600 text-indigo-900 dark:text-indigo-100"
                            : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-200 dark:hover:border-indigo-800"
                        )}
                      >
                        <span className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center font-black group-hover:scale-110 transition-transform flex-shrink-0",
                          answers[currentQuestion] === letter
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                        )}>
                          {letter}
                        </span>
                        <div className="flex-1">
                           {exam.questions?.[currentQuestion]?.options?.[idx] || `Alternativa ${letter}`}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-8">
                  <button
                    disabled={currentQuestion === 0}
                    onClick={() => setCurrentQuestion(prev => prev - 1)}
                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black flex items-center justify-center gap-2 disabled:opacity-30"
                  >
                    <ArrowLeft size={20} />
                    Anterior
                  </button>
                  {currentQuestion < exam.numQuestions - 1 ? (
                    <button
                      onClick={() => setCurrentQuestion(prev => prev + 1)}
                      className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-black transition-all"
                    >
                      Próxima
                      <ArrowRight size={20} />
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || answers.includes("")}
                      className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all disabled:opacity-50"
                    >
                      {submitting ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                      {submitting ? "Enviando..." : "Finalizar Entrega"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === "finished" && (
          <motion.div
            key="finished"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto mt-20 text-center"
          >
            <div className="bg-white dark:bg-slate-900 p-12 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-2xl space-y-8">
              <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={48} />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-display font-black text-slate-900 dark:text-white">Recebido!</h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Sua atividade foi enviada com sucesso para o professor.</p>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                <p className="text-emerald-600 dark:text-emerald-400 font-black">ENTREGA FINALIZADA</p>
              </div>
              <button 
                onClick={onFinished}
                className="w-full py-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl font-black"
              >
                Sair
              </button>
            </div>
            <p className="mt-8 text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Cogniux AI Online</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
