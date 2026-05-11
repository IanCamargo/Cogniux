import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { db } from "../lib/firebase";
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc, getDocs } from "firebase/firestore";
import { motion } from "motion/react";
import { BookOpen, Calendar, ChevronRight, Plus, Scan, BrainCircuit, Trash2, Edit2 } from "lucide-react";
import { cn } from "../lib/utils";

interface DashboardProps {
  user: User;
  onSelectExam: (id: string) => void;
  onEditExam: (exam: any) => void;
  onCreate: () => void;
  onScan: () => void;
}

export function Dashboard({ user, onSelectExam, onEditExam, onCreate, onScan }: DashboardProps) {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "exams"),
      where("professorId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setExams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return unsubscribe;
  }, [user.uid]);

  const handleDelete = async (e: any, examId: string) => {
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja excluir esta prova e todos os seus dados?")) return;
    try {
      // Clean up subcollections first
      const subPaths = ["submissions", "students", "plans"];
      for (const path of subPaths) {
        try {
          const snap = await getDocs(collection(db, "exams", examId, path));
          for (const d of snap.docs) {
            await deleteDoc(doc(db, "exams", examId, path, d.id));
          }
        } catch (subErr) {
          console.warn(`Aviso: Falha ao limpar subcoleção ${path}:`, subErr);
        }
      }

      // Delete related tokens
      try {
        const tokenSnap = await getDocs(query(collection(db, "access_tokens"), where("examId", "==", examId)));
        for (const t of tokenSnap.docs) {
          await deleteDoc(doc(db, "access_tokens", t.id));
        }
      } catch (tokenErr) {
        console.warn("Aviso: Falha ao limpar tokens:", tokenErr);
      }

      await deleteDoc(doc(db, "exams", examId));
    } catch (error) {
      console.error("Erro ao excluir prova:", error);
      alert("Erro ao excluir prova. Verifique se você é o proprietário desta avaliação.");
    }
  };

  const handleEdit = (e: any, exam: any) => {
    e.stopPropagation();
    onEditExam(exam);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-display font-black text-slate-900 dark:text-white leading-tight">Olá, Prof. {user.displayName?.split(' ')[0]}</h2>
          <p className="text-slate-500 dark:text-slate-400">Você tem {exams.length} provas cadastradas no momento.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={onScan}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
          >
            <Scan size={20} />
            Escanear Prova
          </button>
          <button
            onClick={onCreate}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none"
          >
            <Plus size={20} />
            Nova Prova
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-2 group hover:border-indigo-100 dark:hover:border-indigo-900 transition-colors">
          <BookOpen className="text-indigo-600 dark:text-indigo-400 mb-2" size={32} />
          <p className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total de Provas</p>
          <p className="text-4xl font-display font-black text-slate-900 dark:text-white">{exams.length}</p>
        </div>
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-2 group hover:border-emerald-100 dark:hover:border-emerald-900 transition-colors">
          <Calendar className="text-emerald-500 mb-2" size={32} />
          <p className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Mês Atual</p>
          <p className="text-4xl font-display font-black text-slate-900 dark:text-white">
            {exams.filter(e => {
              const date = e.createdAt?.toDate();
              return date && date.getMonth() === new Date().getMonth();
            }).length}
          </p>
        </div>
        <div className="p-6 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-3xl text-white space-y-2 relative overflow-hidden shadow-lg shadow-indigo-200 dark:shadow-none">
          <div className="relative z-10">
            <BrainCircuit className="mb-2" size={32} />
            <p className="text-sm font-black opacity-60 uppercase tracking-widest">Eficiência Cognitiva</p>
            <p className="text-4xl font-display font-black">99.2%</p>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-10 text-white">
             <BrainCircuit size={120} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-display font-black text-slate-900 dark:text-white">Provas Recentes</h2>
        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse" />
            ))
          ) : exams.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
              <p className="text-slate-500 dark:text-slate-400 font-bold">Nenhuma prova encontrada.</p>
              <button 
                onClick={onCreate}
                className="mt-4 text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
              >
                Crie sua primeira prova agora
              </button>
            </div>
          ) : (
            exams.map((exam) => (
              <motion.div
                key={exam.id}
                whileHover={{ y: -4 }}
                onClick={() => onSelectExam(exam.id)}
                className="group p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none hover:border-indigo-200 dark:hover:border-indigo-800 transition-all cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                    <BookOpen size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {exam.subject}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{exam.semester}</span>
                      {exam.course && (
                        <>
                          <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                          <span className="text-xs font-bold text-indigo-500/80 dark:text-indigo-400/80 uppercase tracking-widest">{exam.course}</span>
                        </>
                      )}
                      {exam.className && (
                        <>
                          <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                          <span className="text-xs font-bold text-emerald-500/80 dark:text-emerald-400/80 uppercase tracking-widest">{exam.className}</span>
                        </>
                      )}
                      <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{exam.numQuestions} Questões</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                  <div className="flex gap-2 mr-4">
                    <button 
                      onClick={(e) => handleEdit(e, exam)}
                      className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900 transition-colors"
                      title="Editar Prova"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={(e) => handleDelete(e, exam.id)}
                      className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900 transition-colors"
                      title="Excluir Prova"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Status</p>
                    <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold border border-emerald-100 dark:border-emerald-800">
                      Ativa
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 dark:text-slate-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900 transition-colors">
                    <ChevronRight size={24} />
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
