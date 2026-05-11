import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc, getDocs, collection, query, where, orderBy, onSnapshot, addDoc, setDoc, serverTimestamp, deleteDoc, limit } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, CheckCircle, Download, FileText, Printer, QrCode, Users, Trash2, Edit2, LineChart, PlusCircle, Sparkles, AlertCircle, ListChecks, Wand2, Loader2, School, BrainCircuit, Key, Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "../lib/utils";
import { generatePedagogicalPlan } from "../services/geminiService";

interface ExamDetailProps {
  examId: string;
  onBack: () => void;
  onEdit: (exam: any) => void;
}

export function ExamDetail({ examId, onBack, onEdit }: ExamDetailProps) {
  const [exam, setExam] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [tokens, setTokens] = useState<Record<string, any>>({});
  const [newStudentName, setNewStudentName] = useState("");
  const [tab, setTab] = useState<"overview" | "students" | "submissions" | "plan" | "print" | "tokens">("overview");
  const [pedagogicalPlan, setPedagogicalPlan] = useState<any>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExam = async () => {
      const docSnap = await getDoc(doc(db, "exams", examId));
      if (docSnap.exists()) setExam({ id: docSnap.id, ...docSnap.data() });
    };

    fetchExam();

    const qSub = query(
      collection(db, "exams", examId, "submissions"),
      orderBy("gradedAt", "desc")
    );
    const unsubSub = onSnapshot(qSub, (snapshot) => {
      setSubmissions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qStud = query(collection(db, "exams", examId, "students"), orderBy("name", "asc"));
    const unsubStud = onSnapshot(qStud, (snapshot) => {
      setStudents(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    const qTokens = query(collection(db, "access_tokens"), where("examId", "==", examId));
    const unsubTokens = onSnapshot(qTokens, (snapshot) => {
      const tks: Record<string, any> = {};
      snapshot.docs.forEach(d => {
        const data = d.data();
        if (data.studentId) tks[data.studentId] = { id: d.id, ...data };
      });
      setTokens(tks);
    });

    const qPlan = query(collection(db, "exams", examId, "plans"), orderBy("createdAt", "desc"), limit(1));
    const unsubPlan = onSnapshot(qPlan, (snapshot) => {
      if (!snapshot.empty) {
        setPedagogicalPlan({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      }
    });

    return () => {
      unsubSub();
      unsubStud();
      unsubTokens();
      unsubPlan();
    };
  }, [examId]);

  const generateToken = async (studentId: string, studentName: string) => {
    const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed similar looking chars
    let token = "";
    for (let i = 0; i < 6; i++) {
      token += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    try {
      // Use setDoc with the token as ID to ensure uniqueness or at least predictable location
      await setDoc(doc(db, "access_tokens", token), {
        token,
        examId,
        studentId,
        studentName,
        isUsed: false,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
       console.error("Erro ao gerar token:", e);
       alert("Erro ao gerar token único.");
    }
  };

  const handleGeneratePlan = async () => {
    if (submissions.length === 0) return alert("É necessário ter submissões para gerar um plano de ação.");
    setGeneratingPlan(true);
    try {
      const stats = {
        average: parseFloat(average as string),
        maxScore: Math.max(...submissions.map(s => s.score)),
        minScore: Math.min(...submissions.map(s => s.score)),
      };
      const plan = await generatePedagogicalPlan(exam.subject, stats, submissions);
      await addDoc(collection(db, "exams", examId, "plans"), {
        ...plan,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error(e);
      alert("Erro ao gerar plano de ação via IA.");
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleAddStudent = async (e: any) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    try {
      await addDoc(collection(db, "exams", examId, "students"), {
        name: newStudentName.trim(),
        createdAt: serverTimestamp(),
      });
      setNewStudentName("");
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveStudent = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este aluno?")) return;
    try {
      await deleteDoc(doc(db, "exams", examId, "students", id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSubmission = async (id: string, e: any) => {
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja excluir esta submissão?")) return;
    try {
      await deleteDoc(doc(db, "exams", examId, "submissions", id));
    } catch (error) {
      console.error(error);
      alert("Erro ao excluir submissão.");
    }
  };

  const handleDeleteExam = async () => {
    if (!confirm("Tem certeza que deseja excluir esta prova permanentemente? Todos os dados de alunos e notas serão perdidos.")) return;
    try {
      // 1. Delete Sub-documents (Clean up)
      const subPaths = ["submissions", "students", "plans"];
      for (const path of subPaths) {
        try {
          const snap = await getDocs(collection(db, "exams", examId, path));
          for (const d of snap.docs) {
            await deleteDoc(doc(db, "exams", examId, path, d.id));
          }
        } catch (subErr) {
          console.warn(`Falha ao limpar ${path}:`, subErr);
        }
      }

      // 1.5 Delete related tokens
      try {
        const tokenSnap = await getDocs(query(collection(db, "access_tokens"), where("examId", "==", examId)));
        for (const t of tokenSnap.docs) {
          await deleteDoc(doc(db, "access_tokens", t.id));
        }
      } catch (tokenErr) {
        console.warn("Falha ao limpar tokens:", tokenErr);
      }

      // 2. Delete Main Document
      await deleteDoc(doc(db, "exams", examId));
      onBack();
    } catch (e) {
      console.error("Erro ao excluir prova:", e);
      alert("Erro ao excluir prova. Verifique se você é o proprietário desta avaliação.");
    }
  };

  if (!exam) return <div className="p-20 text-center">Carregando...</div>;

  const average = submissions.length > 0 
    ? (submissions.reduce((acc, curr) => acc + curr.score, 0) / submissions.length).toFixed(1)
    : 0;

  const handlePrint = () => {
    window.print();
  };

  const ALPHABET = ["A", "B", "C", "D", "E"];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-800">
          <ArrowLeft size={20} />
          Voltar
        </button>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 mr-2">
            <button 
              onClick={() => onEdit(exam)}
              className="p-2 text-slate-300 hover:text-indigo-500 transition-colors"
              title="Editar Prova"
            >
              <Edit2 size={22} />
            </button>
            <button 
              onClick={handleDeleteExam}
              className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
              title="Excluir Prova"
            >
              <Trash2 size={22} />
            </button>
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 transition-colors">
            {(["overview", "students", "submissions", "plan", "print", "tokens"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap",
                  tab === t ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 dark:text-slate-400"
                )}
              >
                {t === "overview" ? "Resumo" : t === "students" ? "Alunos" : t === "submissions" ? "Notas" : t === "plan" ? "Plano de Ação" : t === "tokens" ? "Acesso Online" : "Imprimir"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Printable Component (Hidden in UI normally, visible during print) */}
      <div className="print-only bg-white text-black font-sans">
        {(students.length > 0 ? students : [{ name: "", id: "generic" }]).map((student, idx) => (
          <div key={student.id} className={cn("p-12 mb-0 min-h-screen", idx > 0 && "page-break")}>
            <div className="flex justify-between items-start border-b-2 border-black pb-8 mb-8">
               <div className="space-y-4 flex-1">
                  <h1 className="text-4xl font-black tracking-widest uppercase">Gabarito</h1>
                  <div className="space-y-4 mt-8">
                     <div className="flex items-end gap-2">
                        <span className="text-sm font-bold w-16">ALUNO:</span>
                        <div className="flex-1 border-b-2 border-black h-8 font-black text-xl px-2">
                           {student.name}
                        </div>
                     </div>
                     <div className="flex gap-10">
                        <div className="flex items-end gap-2 flex-1">
                           <span className="text-sm font-bold">MATÉRIA:</span>
                           <span className="border-b-2 border-black flex-1 font-bold h-6 uppercase">{exam.subject}</span>
                        </div>
                        <div className="flex items-end gap-2 w-32">
                           <span className="text-sm font-bold">UNID:</span>
                           <span className="border-b-2 border-black flex-1 font-bold h-6 uppercase">{exam.unit || "---"}</span>
                        </div>
                     </div>
                     <div className="flex gap-10">
                        <div className="flex items-end gap-2 flex-1">
                           <span className="text-sm font-bold">CURSO:</span>
                           <span className="border-b-2 border-black flex-1 font-bold h-6 uppercase">{exam.course || "---"}</span>
                        </div>
                        <div className="flex items-end gap-2 w-32">
                           <span className="text-sm font-bold">TURMA:</span>
                           <span className="border-b-2 border-black flex-1 font-bold h-6 uppercase">{exam.className || "---"}</span>
                        </div>
                     </div>
                  </div>
               </div>
               <div className="border-2 border-black p-2 bg-white flex flex-col items-center ml-8">
                  <QRCodeSVG 
                    value={JSON.stringify({ 
                      examId: exam.id, 
                      num: exam.numQuestions,
                      sub: exam.subject,
                      studentName: student.name 
                    })} 
                    size={130} 
                  />
                  <span className="text-[10px] font-black mt-1 font-mono uppercase tracking-tighter">
                     {exam.id.slice(0,6)}-{student.id.slice(0,4)}
                  </span>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-x-20 gap-y-4 mt-12">
               {/* Fixed column rendering to ensure all questions appear */}
               <div className="space-y-2">
                 <div className="grid grid-cols-[40px_1fr] gap-4 mb-2 opacity-50">
                    <span />
                    <div className="flex justify-between px-2">
                       {ALPHABET.slice(0, exam.alternativesPerQuestion).map(l => (
                          <span key={l} className="w-8 text-center font-black text-xs">{l}</span>
                       ))}
                    </div>
                 </div>
                 {exam.answerKey.slice(0, Math.ceil(exam.numQuestions / 2)).map((_: any, i: number) => (
                    <div key={i} className="grid grid-cols-[40px_1fr] gap-4 items-center">
                       <span className="text-base font-black text-right">{i + 1}</span>
                       <div className="flex justify-between p-1 px-4 border-2 border-black rounded-full h-12 items-center">
                          {ALPHABET.slice(0, exam.alternativesPerQuestion).map(l => (
                             <div key={l} className="w-8 h-8 rounded-full border-2 border-slate-300" />
                          ))}
                       </div>
                    </div>
                 ))}
               </div>

               <div className="space-y-2">
                 <div className="grid grid-cols-[40px_1fr] gap-4 mb-2 opacity-50">
                    <span />
                    <div className="flex justify-between px-2">
                       {ALPHABET.slice(0, exam.alternativesPerQuestion).map(l => (
                          <span key={l} className="w-8 text-center font-black text-xs">{l}</span>
                       ))}
                    </div>
                 </div>
                 {exam.answerKey.length > 1 && exam.answerKey.slice(Math.ceil(exam.numQuestions / 2)).map((_: any, i: number) => {
                    const qNum = Math.ceil(exam.numQuestions / 2) + i + 1;
                    return (
                      <div key={i} className="grid grid-cols-[40px_1fr] gap-4 items-center">
                         <span className="text-base font-black text-right">{qNum}</span>
                         <div className="flex justify-between p-1 px-4 border-2 border-black rounded-full h-12 items-center">
                            {ALPHABET.slice(0, exam.alternativesPerQuestion).map(l => (
                               <div key={l} className="w-8 h-8 rounded-full border-2 border-slate-300" />
                            ))}
                         </div>
                      </div>
                    );
                 })}
               </div>
            </div>

            <div className="mt-auto pt-20 text-center opacity-30">
               <p className="text-[10px] font-black uppercase tracking-[0.4em]">Cogniux AI - Inteligência Pedagógica Avançada</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-none no-print transition-colors">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-10 text-white relative">
           <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                 <h1 className="text-4xl font-display font-black mb-1">{exam.subject}</h1>
                 <p className="opacity-80 font-bold uppercase tracking-widest text-sm">{exam.semester}</p>
              </div>
              <div className="flex gap-4">
                 <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 text-center">
                    <span className="block text-[10px] font-black uppercase opacity-60">Média Geral</span>
                    <span className="text-2xl font-display font-black">{average}</span>
                 </div>
                 <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 text-center">
                    <span className="block text-[10px] font-black uppercase opacity-60">Entregues</span>
                    <span className="text-2xl font-display font-black">{submissions.length}</span>
                 </div>
              </div>
           </div>
           <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
              <FileText size={160} />
           </div>
        </div>

        <div className="p-8">
           {tab === "students" && (
              <div className="space-y-6">
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="font-display font-black text-xl text-slate-800 dark:text-white">Alunos Cadastrados</h3>
                    <form onSubmit={handleAddStudent} className="flex gap-2 w-full sm:w-auto">
                       <input 
                         type="text" 
                         value={newStudentName}
                         onChange={(e) => setNewStudentName(e.target.value)}
                         placeholder="Nome do aluno..."
                         className="flex-1 sm:w-64 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                       />
                       <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2">
                          <PlusCircle size={18} />
                          Adicionar
                       </button>
                    </form>
                 </div>
                 
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {students.map((student) => (
                       <div key={student.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center font-black text-xs">
                                {student.name.charAt(0)}
                             </div>
                             <span className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate max-w-[120px]">{student.name}</span>
                          </div>
                          <button 
                             onClick={() => handleRemoveStudent(student.id)}
                             className="text-slate-300 hover:text-rose-500 transition-colors"
                          >
                             <Trash2 size={16} />
                          </button>
                       </div>
                    ))}
                    {students.length === 0 && (
                       <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                          <p className="text-slate-400 font-medium">Nenhum aluno cadastrado para esta prova.</p>
                       </div>
                    )}
                 </div>
              </div>
           )}

           {tab === "tokens" && (
              <div className="space-y-8">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-8 bg-slate-900 dark:bg-black rounded-[32px] text-white">
                    <div className="space-y-2">
                       <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full w-fit text-[10px] font-black uppercase tracking-widest">
                          <Key size={12} />
                          Acesso Individualizado
                       </div>
                       <h3 className="text-3xl font-display font-black">Códigos de Acesso Online</h3>
                       <p className="opacity-80 font-medium">Cada aluno utiliza seu próprio código exclusivo para realizar a prova.</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {students.map((student) => (
                       <div key={student.id} className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-4 hover:border-indigo-200 transition-colors group">
                          <div className="flex items-center justify-between">
                             <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center font-black text-slate-600 dark:text-slate-400">
                                {student.name.charAt(0)}
                             </div>
                             {tokens[student.id]?.isUsed ? (
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-black rounded-lg uppercase">Utilizado</span>
                             ) : tokens[student.id] ? (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-lg uppercase">Disponível</span>
                             ) : (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-[10px] font-black rounded-lg uppercase">Pendente</span>
                             )}
                          </div>
                          <div>
                             <p className="font-display font-black text-slate-900 dark:text-white truncate">{student.name}</p>
                             <p className="text-slate-500 text-xs font-bold mt-1">Status: {tokens[student.id]?.isUsed ? "Prova Entregue" : "Aguardando Acesso"}</p>
                          </div>
                          
                          {tokens[student.id] ? (
                             <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-between border border-slate-100 dark:border-slate-800">
                                <code className="text-xl font-display font-black text-indigo-600 tracking-widest">{tokens[student.id].token}</code>
                                <button 
                                   onClick={() => {
                                      navigator.clipboard.writeText(tokens[student.id].token);
                                      alert("Copiado!");
                                   }}
                                   className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                                >
                                   <Copy size={20} />
                                </button>
                             </div>
                          ) : (
                             <button 
                               onClick={() => generateToken(student.id, student.name)}
                               className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 dark:shadow-none"
                             >
                                <Key size={16} />
                                Gerar Código
                             </button>
                          )}
                       </div>
                    ))}
                    {students.length === 0 && (
                       <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[48px]">
                          <p className="text-slate-400 font-medium">Cadastre primeiro os alunos na aba "Alunos" para gerar os códigos.</p>
                       </div>
                    )}
                 </div>
              </div>
           )}

           {tab === "overview" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-6">
                    <h3 className="font-display font-black text-xl text-slate-800 dark:text-white">Detalhes Técnicos</h3>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                          <span className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase mb-2">Questões</span>
                          <span className="text-2xl font-display font-black text-slate-800 dark:text-white">{exam.numQuestions}</span>
                       </div>
                       <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                          <span className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase mb-2">Alternativas</span>
                          <span className="text-2xl font-display font-black text-slate-800 dark:text-white">{exam.alternativesPerQuestion}</span>
                       </div>
                    </div>
                    {(exam.course || exam.className || exam.unit) && (
                      <div className="p-6 bg-indigo-50 dark:bg-indigo-900/10 rounded-3xl border border-indigo-100 dark:border-indigo-900/30 space-y-4">
                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 uppercase text-[10px] font-black tracking-widest leading-none">
                           <School size={14} />
                           Informações Institucionais
                        </div>
                        <div className="space-y-3">
                           {exam.course && (
                             <div className="flex justify-between items-center text-sm">
                               <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">Curso</span>
                               <span className="text-slate-800 dark:text-slate-200 font-black">{exam.course}</span>
                             </div>
                           )}
                           {exam.className && (
                             <div className="flex justify-between items-center text-sm">
                               <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">Turma</span>
                               <span className="text-slate-800 dark:text-slate-200 font-black">{exam.className}</span>
                             </div>
                           )}
                           {exam.unit && (
                             <div className="flex justify-between items-center text-sm">
                               <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">Unidade</span>
                               <span className="text-slate-800 dark:text-slate-200 font-black">{exam.unit}</span>
                             </div>
                           )}
                        </div>
                      </div>
                    )}
                    <div className="p-6 bg-slate-900 dark:bg-black rounded-3xl text-white space-y-4 shadow-lg shadow-indigo-500/10">
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-indigo-400 uppercase text-[10px] font-black tracking-widest">
                             <QrCode size={14} />
                             Código de Acesso Online
                          </div>
                          <span className="px-2 py-0.5 bg-indigo-500 text-[10px] font-black rounded-lg uppercase tracking-tighter">Ativo</span>
                       </div>
                       <div className="flex items-center justify-center p-4 bg-white rounded-2xl relative group">
                          <QRCodeSVG value={JSON.stringify({ examId: exam.id, subject: exam.subject, num: exam.numQuestions })} size={140} />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-center p-4 rounded-2xl backdrop-blur-[2px]">
                             <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Código para Alunos</p>
                             <p className="text-xl font-display font-black text-white selection:bg-indigo-500">{exam.id}</p>
                          </div>
                       </div>
                       <div className="text-center">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">ID Único</p>
                          <code className="text-slate-300 font-mono text-xs">{exam.id}</code>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <h3 className="font-display font-black text-xl text-slate-800 dark:text-white">Gabarito Oficial</h3>
                    <div className="grid grid-cols-5 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                       {exam.answerKey.map((ans: string, i: number) => (
                          <div key={i} className="flex flex-col items-center p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl">
                             <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 mb-1">{i+1}</span>
                             <span className="w-8 h-8 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-md">
                                {ans}
                             </span>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
           )}

           {tab === "submissions" && (
              <div className="space-y-6">
                 <div className="flex justify-between items-center">
                    <h3 className="font-display font-black text-xl text-slate-800 dark:text-white">Participação dos Alunos</h3>
                    <button className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-xl border border-indigo-100 dark:border-indigo-800">
                       <Download size={16} />
                       Exportar Notas
                    </button>
                 </div>
                 {submissions.length === 0 ? (
                    <div className="py-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl bg-slate-50 dark:bg-slate-800/50">
                       <Users size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                       <p className="text-slate-500 dark:text-slate-400 font-bold">Nenhuma submissão encontrada.</p>
                       <p className="text-slate-400 dark:text-slate-500 text-sm">Use o scanner para corrigir as provas.</p>
                    </div>
                 ) : (
                    <div className="space-y-4">
                       {submissions.map((sub: any) => (
                          <div key={sub.id} className="flex items-center justify-between p-5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl hover:border-indigo-200 dark:hover:border-indigo-500 transition-all group">
                             <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 flex items-center justify-center rounded-2xl group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 transition-colors">
                                   <Users size={24} className="text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                                </div>
                                <div>
                                   <p className="font-black text-slate-800 dark:text-slate-100">{sub.studentName}</p>
                                   <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                                      {new Date(sub.gradedAt?.seconds * 1000).toLocaleDateString()}
                                   </p>
                                </div>
                             </div>
                             <div className="flex items-center gap-6">
                                <div className="text-right">
                                   <span className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Nota</span>
                                   <span className={cn(
                                      "text-2xl font-display font-black",
                                      sub.score >= 7 ? "text-emerald-500" : sub.score >= 5 ? "text-amber-500" : "text-rose-500"
                                   )}>
                                      {sub.score.toFixed(1)}
                                   </span>
                                </div>
                                <button className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-rose-600 transition-colors group-hover:bg-white dark:group-hover:bg-slate-700">
                                   <Trash2 size={20} />
                                </button>
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
              </div>
           )}

           {tab === "plan" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-8 bg-indigo-600 rounded-[32px] text-white">
                    <div className="space-y-2">
                       <div className="flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full w-fit text-[10px] font-black uppercase tracking-widest">
                          <Sparkles size={12} />
                          Inteligência Artificial
                       </div>
                       <h3 className="text-3xl font-display font-black">Plano de Ação Pedagógico</h3>
                       <p className="opacity-80 font-medium">Análise automática de desempenho e roteiro de recuperação.</p>
                    </div>
                    <button 
                       onClick={handleGeneratePlan}
                       disabled={generatingPlan || submissions.length === 0}
                       className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-black flex items-center gap-3 hover:bg-black hover:text-white transition-all shadow-xl disabled:opacity-50"
                    >
                       {generatingPlan ? <Loader2 className="animate-spin" /> : <Wand2 size={20} />}
                       {generatingPlan ? "Analisando Turma..." : "Gerar Nova Análise"}
                    </button>
                 </div>

                 {pedagogicalPlan ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                       <div className="lg:col-span-2 space-y-8">
                          <div className="p-8 bg-white dark:bg-slate-800 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
                             <div className="flex items-center gap-3 text-amber-500">
                                <AlertCircle size={24} />
                                <h4 className="text-xl font-display font-black">Pontos de Atenção</h4>
                             </div>
                             <ul className="space-y-4">
                                {pedagogicalPlan.bottlenecks?.map((item: string, idx: number) => (
                                   <li key={idx} className="flex gap-4 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                                      <span className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">{idx + 1}</span>
                                      <p className="text-slate-700 dark:text-slate-300 text-sm font-bold">{item}</p>
                                   </li>
                                ))}
                             </ul>
                          </div>

                          <div className="p-8 bg-white dark:bg-slate-800 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
                             <div className="flex items-center gap-3 text-emerald-500">
                                <ListChecks size={24} />
                                <h4 className="text-xl font-display font-black">Ações Recomendadas</h4>
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {pedagogicalPlan.recommendations?.map((item: string, idx: number) => (
                                   <div key={idx} className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 flex items-start gap-3">
                                      <CheckCircle size={18} className="text-emerald-500 mt-1 flex-shrink-0" />
                                      <p className="text-slate-700 dark:text-slate-300 text-sm font-bold">{item}</p>
                                   </div>
                                ))}
                             </div>
                          </div>
                       </div>

                       <div className="space-y-8">
                          <div className="p-8 bg-indigo-50 dark:bg-indigo-900/10 rounded-[32px] border border-indigo-100 dark:border-indigo-900/30 space-y-6">
                             <h4 className="font-display font-black text-indigo-900 dark:text-indigo-100 uppercase text-xs tracking-widest">Resumo Pedagógico</h4>
                             <p className="text-indigo-800 dark:text-indigo-300 text-sm font-medium leading-relaxed italic">
                                "{pedagogicalPlan.summary}"
                             </p>
                          </div>
                          <div className="p-8 bg-white dark:bg-slate-800 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm">
                             <div className="space-y-4">
                                <h4 className="font-display font-black text-slate-800 dark:text-white">Tópicos para Revisão</h4>
                                <div className="flex flex-wrap gap-2">
                                   {pedagogicalPlan.topicsToReview?.map((topic: string, idx: number) => (
                                      <span key={idx} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-xs font-black text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 uppercase tracking-tighter">
                                         {topic}
                                      </span>
                                   ))}
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 ) : (
                    <div className="py-24 text-center space-y-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[48px] bg-slate-50 dark:bg-slate-900/20">
                       <LineChart size={64} className="mx-auto text-slate-300 dark:text-slate-700" />
                       <div className="space-y-2">
                          <h4 className="text-xl font-display font-black text-slate-800 dark:text-white">Nenhum plano gerado ainda</h4>
                          <p className="max-w-xs mx-auto text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">
                             Clique no botão acima para permitir que nossa IA analise o desempenho da turma e sugira um plano pedagógico.
                          </p>
                       </div>
                    </div>
                 )}
              </div>
           )}

           {tab === "print" && (
              <div className="max-w-4xl mx-auto space-y-8 py-10">
                 <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                       <Printer size={32} />
                    </div>
                    <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white">Impressão de Gabaritos</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                       Você pode imprimir um lote de gabaritos genéricos ou personalizados com os nomes dos alunos.
                    </p>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Generic Template */}
                    <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 p-8 rounded-3xl shadow-sm space-y-6">
                       <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500">
                          <FileText size={24} />
                       </div>
                       <div>
                          <h4 className="font-display font-black text-lg text-slate-900 dark:text-white">Gabarito Genérico</h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Um único gabarito em branco para cópias manuais.</p>
                       </div>
                       <button 
                          onClick={handlePrint}
                          className="w-full py-4 bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-2xl font-black flex items-center justify-center gap-3 transition-all"
                       >
                          <Printer size={20} />
                          Imprimir Genérico
                       </button>
                    </div>

                    {/* Batch Printing */}
                    <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 p-8 rounded-3xl shadow-sm space-y-6">
                       <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
                          <Users size={24} />
                       </div>
                       <div>
                          <h4 className="font-display font-black text-lg text-slate-900 dark:text-white">Imprimir para Alunos</h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Gera um gabarito personalizado com QR Code exclusivo para cada um dos {students.length} alunos.</p>
                       </div>
                       <button 
                          disabled={students.length === 0}
                          onClick={handlePrint}
                          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-lg shadow-indigo-100 dark:shadow-none disabled:opacity-50"
                       >
                          <Printer size={20} />
                          Imprimir {students.length} Gabaritos
                       </button>
                    </div>
                 </div>
              </div>
           )}
        </div>
      </div>
    </motion.div>
  );
}
