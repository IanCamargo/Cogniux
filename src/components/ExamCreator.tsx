import { useState } from "react";
import { User } from "firebase/auth";
import { db } from "../lib/firebase";
import { collection, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { motion } from "motion/react";
import { ArrowLeft, Save, X, Sparkles, Wand2, Loader2, BookOpen, BrainCircuit, School, FileUp, Paperclip, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";
import { generateExamQuestions, generateAnswerKey, GeneratedQuestion, FileContext } from "../services/geminiService";

interface ExamCreatorProps {
  user: User;
  onCancel: () => void;
  onCreated: (id: string) => void;
  initialData?: any;
}

export function ExamCreator({ user, onCancel, onCreated, initialData }: ExamCreatorProps) {
  const [step, setStep] = useState(1);
  const [generationMode, setGenerationMode] = useState<"full" | "key">("full");
  const [formData, setFormData] = useState({
    subject: initialData?.subject || "",
    semester: initialData?.semester || (new Date().getFullYear() + "." + (new Date().getMonth() < 6 ? "1" : "2")),
    course: initialData?.course || "",
    className: initialData?.className || "",
    unit: initialData?.unit || "",
    numQuestions: initialData?.numQuestions || 10,
    alternativesPerQuestion: initialData?.alternativesPerQuestion || 5,
    isOnline: initialData?.isOnline || false,
  });
  const [questions, setQuestions] = useState<GeneratedQuestion[]>(initialData?.questions || []);
  const [answerKey, setAnswerKey] = useState<string[]>(initialData?.answerKey || []);
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [topic, setTopic] = useState("");
  const [contextFiles, setContextFiles] = useState<{ name: string; data: string; mimeType: string }[]>([]);

  const handleFileChange = (e: any) => {
    const files = e.target.files as FileList;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = (event.target?.result as string).split(",")[1];
        setContextFiles(prev => [...prev, { name: file.name, data: base64, mimeType: file.type }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setContextFiles(prev => prev.filter((_, i) => i !== index));
  };

  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  const handleNext = () => {
    if (formData.numQuestions > 0) {
      if (answerKey.length !== formData.numQuestions) {
        const newKey = [...answerKey];
        if (newKey.length < formData.numQuestions) {
          // Pad with empty
          while (newKey.length < formData.numQuestions) newKey.push("");
        } else {
          // Truncate
          newKey.splice(formData.numQuestions);
        }
        setAnswerKey(newKey);
      }
    }
    setStep(2);
  };

  const handleGenerateAI = async () => {
    if (!formData.subject || !topic) return alert("Preencha a matéria e o tópico!");
    setAiGenerating(true);
    try {
      const filesForAI: FileContext[] = contextFiles.map(f => ({ data: f.data, mimeType: f.mimeType }));
      if (generationMode === "full") {
        const generated = await generateExamQuestions(formData.subject, topic, formData.numQuestions, "intermediate", filesForAI);
        setQuestions(generated);
        setAnswerKey(generated.map(q => q.correctAnswer));
      } else {
        const key = await generateAnswerKey(formData.subject, topic, formData.numQuestions, filesForAI);
        setAnswerKey(key);
        setQuestions([]); // Clear questions if we only generated key
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao gerar conteúdo via IA.");
    } finally {
      setAiGenerating(false);
    }
  };

  const saveExam = async () => {
    if (answerKey.includes("")) return alert("Preencha todas as respostas do gabarito!");
    setLoading(true);
    try {
      if (initialData?.id) {
        await updateDoc(doc(db, "exams", initialData.id), {
          ...formData,
          answerKey,
          questions: questions.length > 0 ? questions : null,
          professorId: user.uid,
          updatedAt: serverTimestamp(),
        });
        onCreated(initialData.id);
      } else {
        const docRef = await addDoc(collection(db, "exams"), {
          ...formData,
          answerKey,
          questions: questions.length > 0 ? questions : null,
          professorId: user.uid,
          createdAt: serverTimestamp(),
        });
        onCreated(docRef.id);
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar prova.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-4xl mx-auto pb-20"
    >
      <button 
        onClick={onCancel}
        className="mb-8 flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors font-semibold"
      >
        <ArrowLeft size={20} />
        Voltar para o Painel
      </button>

      <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 dark:shadow-none">
                <BrainCircuit size={24} />
             </div>
             <div>
               <h2 className="text-2xl font-display font-black text-slate-900 dark:text-white">
                   {initialData ? "Editar Atividade" : "Criar Nova Atividade"}
                </h2>
               <p className="text-slate-500 dark:text-slate-400">Personalize com IA e gerencie sua unidade curricular</p>
             </div>
          </div>
          <div className="flex gap-1">
             <div className={`w-12 h-1.5 rounded-full transition-all duration-500 ${step >= 1 ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
             <div className={`w-12 h-1.5 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
          </div>
        </div>

        <div className="p-10">
          {step === 1 ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                   <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                      <BookOpen size={20} className="text-indigo-600" />
                      Informações Acadêmicas
                   </h3>
                   <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Matéria / UC</label>
                        <input
                          type="text"
                          placeholder="Ex: Algoritmos II"
                          className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none transition-all dark:text-white font-bold"
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Curso</label>
                          <input
                            type="text"
                            placeholder="Análise de Sistemas"
                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none transition-all dark:text-white font-bold"
                            value={formData.course}
                            onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Turma</label>
                          <input
                            type="text"
                            placeholder="ADS-3A"
                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none transition-all dark:text-white font-bold"
                            value={formData.className}
                            onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Unidade</label>
                          <input
                            type="text"
                            placeholder="Campus Principal"
                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none transition-all dark:text-white font-bold"
                            value={formData.unit}
                            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Semestre</label>
                          <input
                            type="text"
                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none transition-all dark:text-white font-bold"
                            value={formData.semester}
                            onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                          />
                        </div>
                      </div>
                   </div>
                </div>

                <div className="space-y-6">
                   <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                      <Sparkles size={20} className="text-amber-500" />
                      Geração via IA (Opcional)
                   </h3>
                   <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[28px] border border-slate-100 dark:border-slate-800 flex flex-col gap-4">
                      <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                         <button 
                            onClick={() => setGenerationMode("full")}
                            className={cn(
                               "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                               generationMode === "full" ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-slate-500"
                            )}
                         >
                            Prova Completa
                         </button>
                         <button 
                            onClick={() => setGenerationMode("key")}
                            className={cn(
                               "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                               generationMode === "key" ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-slate-500"
                            )}
                         >
                            Apenas Gabarito
                         </button>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Anexar Materiais (PDF, Imagens)</label>
                          <div className="flex flex-wrap gap-2 mb-2">
                             {contextFiles.map((file, idx) => (
                               <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-xl border border-indigo-100 dark:border-indigo-800 text-[10px] font-black uppercase">
                                  <Paperclip size={12} />
                                  <span className="truncate max-w-[100px]">{file.name}</span>
                                  <button onClick={() => removeFile(idx)} className="text-rose-500 hover:text-rose-700">
                                     <X size={12} />
                                  </button>
                               </div>
                             ))}
                          </div>
                          <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors cursor-pointer group">
                             <FileUp size={20} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                             <span className="text-xs font-black text-slate-500 group-hover:text-indigo-600 transition-colors uppercase tracking-widest">Subir arquivos da aula</span>
                             <input type="file" multiple className="hidden" onChange={handleFileChange} accept=".pdf,image/*,text/*" />
                          </label>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Tópico ou Conteúdo</label>
                          <textarea
                            placeholder="Sobre o que deve ser a prova? (Ex: Capítulo 4 - Herança)"
                            rows={3}
                            className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none transition-all dark:text-white text-sm"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleGenerateAI}
                        disabled={aiGenerating || !formData.subject || !topic}
                        className="w-full py-4 bg-white dark:bg-slate-900 border-2 border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50"
                      >
                         {aiGenerating ? <Loader2 className="animate-spin" /> : <Wand2 size={18} />}
                         {aiGenerating ? "Gerando Questões..." : "Gerar Questões com IA"}
                      </button>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center uppercase font-black tracking-widest">
                         A IA preencherá o gabarito automaticamente
                      </p>
                   </div>
                   
                   <div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
                      <input 
                        type="checkbox" 
                        id="online-exam"
                        className="w-5 h-5 rounded-lg text-indigo-600" 
                        checked={formData.isOnline}
                        onChange={(e) => setFormData({...formData, isOnline: e.target.checked})}
                      />
                      <label htmlFor="online-exam" className="text-sm font-bold text-slate-700 dark:text-slate-300">Habilitar Aplicação Online</label>
                   </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Qtd. de Questões</label>
                   <input
                     type="number"
                     min="1" max="100"
                     className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none transition-all dark:text-white font-bold"
                     value={formData.numQuestions}
                     onChange={(e) => setFormData({ ...formData, numQuestions: parseInt(e.target.value) || 1 })}
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Alternativas</label>
                   <select
                     className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none transition-all dark:text-white font-bold"
                     value={formData.alternativesPerQuestion}
                     onChange={(e) => setFormData({ ...formData, alternativesPerQuestion: parseInt(e.target.value) })}
                   >
                     {[2,3,4,5].map(v => <option key={v} value={v}>{v} {v === 2 ? '(V/F)' : 'Alternativas'}</option>)}
                   </select>
                 </div>
              </div>

              <button
                disabled={!formData.subject || formData.numQuestions <= 0}
                onClick={handleNext}
                className="w-full py-5 bg-indigo-600 hover:bg-black dark:hover:bg-slate-800 text-white rounded-[24px] font-black transition-all shadow-xl shadow-indigo-100 dark:shadow-none disabled:opacity-50 disabled:shadow-none text-lg flex items-center justify-center gap-3"
              >
                Próximo Passo
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                 <h3 className="font-display font-black text-xl text-slate-800 dark:text-white">Conferir Gabarito</h3>
                 {questions.length > 0 && (
                   <span className="px-4 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full text-xs font-black uppercase tracking-widest">IA Gerada</span>
                 )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                {answerKey.map((ans, idx) => (
                  <div key={idx} className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-start">
                       <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Questão {idx + 1}</span>
                       {questions[idx] && (
                         <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded font-black uppercase">Conteúdo IA</span>
                       )}
                    </div>
                    
                    {questions[idx] && (
                       <p className="text-sm font-bold text-slate-700 dark:text-slate-200 line-clamp-2">{questions[idx].text}</p>
                    )}

                    <div className="flex gap-2 justify-between">
                      {ALPHABET.slice(0, formData.alternativesPerQuestion).map((letter) => (
                        <button
                          key={letter}
                          onClick={() => {
                             const newKey = [...answerKey];
                             newKey[idx] = letter;
                             setAnswerKey(newKey);
                          }}
                          className={`flex-1 h-10 rounded-xl text-sm font-black transition-all ${
                            ans === letter 
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none' 
                            : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                          }`}
                        >
                          {letter}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Voltar
                </button>
                <button
                  onClick={saveExam}
                  disabled={loading}
                  className="flex-[2] py-4 bg-indigo-600 hover:bg-black dark:hover:bg-slate-800 text-white rounded-2xl font-black transition-all shadow-lg shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                  {loading ? "Processando..." : "Finalizar e Salvar Atividade"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
