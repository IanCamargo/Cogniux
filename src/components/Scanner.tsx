import { useState, useRef } from "react";
import Webcam from "react-webcam";
import { motion, AnimatePresence } from "motion/react";
import { Camera, RefreshCw, Check, X, ArrowLeft, Loader2, Scan } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { scanAnswerSheet } from "../services/geminiService";
import { db } from "../lib/firebase";
import { collection, addDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";

interface ScannerProps {
  onBack: () => void;
  onScanned: (examId: string) => void;
}

export function Scanner({ onBack, onScanned }: ScannerProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [examId, setExamId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "scanning" | "confirming">("idle");
  const [scanResult, setScanResult] = useState<any>(null);
  const webcamRef = useRef<Webcam>(null);

  const capture = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
      setStatus("scanning");
      processImage(imageSrc);
    }
  };

  const processImage = async (image: string) => {
    setLoading(true);
    setStatus("scanning");
    try {
      const alternatives = ["A", "B", "C", "D", "E"]; 
      const result = await scanAnswerSheet(image, 50, alternatives);
      setScanResult(result);
      
      // Fetch exam details for better confirmation
      const targetId = result.examId || examId;
      if (targetId) {
        const examSnap = await getDoc(doc(db, "exams", targetId));
        if (examSnap.exists()) {
           setScanResult((prev: any) => ({ ...prev, examInfo: examSnap.data() }));
        }
      }
      
      setStatus("confirming");
      
      // Reactive update of local examId if found
      if (result.examId) setExamId(result.examId);
    } catch (e) {
       console.error(e);
       alert("Erro ao identificar prova. Tente iluminar melhor o gabarito.");
       setStatus("idle");
    } finally {
       setLoading(false);
    }
  };

  const saveSubmission = async () => {
    if (!scanResult) return;
    setLoading(true);
    try {
      const targetExamId = scanResult.examId || examId;
      if (!targetExamId) {
        alert("Não foi possível identificar o ID da prova.");
        return;
      }

      // Fetch the exam to compare answers
      const examRef = doc(db, "exams", targetExamId);
      const examSnap = await getDoc(examRef);
      
      if (!examSnap.exists()) {
        alert("Prova não encontrada no banco de dados.");
        return;
      }

      const examData = examSnap.data();
      const officialAnswers = examData.answerKey;
      
      // Calculate score
      let correct = 0;
      scanResult.answers.forEach((ans: string, i: number) => {
        if (ans === officialAnswers[i]) correct++;
      });
      const score = (correct / officialAnswers.length) * 10;

      // Save submission
      await addDoc(collection(db, "exams", targetExamId, "submissions"), {
        studentName: scanResult.studentName || "Aluno não identificado",
        answers: scanResult.answers,
        score,
        gradedAt: serverTimestamp(),
        isOnline: false,
      });

      alert(`Gabarito processado com sucesso! Nota: ${score.toFixed(1)}`);
      onScanned(targetExamId); 
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar submissão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-xl mx-auto space-y-6"
    >
      <div className="flex items-center justify-between">
         <button onClick={onBack} className="flex items-center gap-2 text-slate-500 font-bold">
            <ArrowLeft size={20} />
            Sair do Scanner
         </button>
         <h2 className="text-xl font-display font-black">Corretor de Gabaritos</h2>
      </div>

      <div className="relative aspect-[3/4] bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-200 dark:border-slate-800 transition-colors">
        <AnimatePresence>
          {status === "idle" ? (
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="w-full h-full object-cover"
              videoConstraints={{ facingMode: "environment" }}
              mirrored={false}
              forceScreenshotSourceSize={false}
              imageSmoothing={true}
              disablePictureInPicture={true}
              onUserMedia={() => {}}
              onUserMediaError={() => {}}
              screenshotQuality={1}
            />
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0">
               <img src={capturedImage!} className="w-full h-full object-cover" />
               <div className="absolute inset-0 bg-indigo-600/20 backdrop-blur-[2px]" />
               {loading && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-4">
                    <Loader2 className="animate-spin" size={48} />
                    <p className="font-bold">IA Analisando Gabarito...</p>
                 </div>
               )}
            </motion.div>
          )}
        </AnimatePresence>

        {status === "idle" && (
          <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
             <div className="w-full h-full border-2 border-white/50 border-dashed rounded-xl relative">
                <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg" />
                <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg" />
                <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg" />
                <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-indigo-400 rounded-br-lg" />
                
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
                   <Scan className="text-white/30" size={64} />
                   <div className="bg-indigo-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-widest">
                      Alinhe o QR Code
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>

      <div className="flex justify-center">
        {status === "idle" ? (
          <button
            onClick={capture}
            className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-indigo-200 active:scale-90 transition-transform border-8 border-indigo-100 dark:border-indigo-900"
          >
            <Camera size={32} />
          </button>
        ) : !loading && status === "confirming" && (
           <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl w-full space-y-4 animate-in slide-in-from-bottom-4 transition-colors">
              <div className="flex items-center justify-between">
                 <h3 className="font-display font-black text-slate-900 dark:text-white">Resultado da Captura</h3>
                 <button onClick={() => setStatus("idle")} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500">
                    <RefreshCw size={18} />
                 </button>
              </div>
              <div className="flex gap-4 items-start">
                 <div className="flex-1 space-y-2">
                    <div className="flex justify-between text-sm">
                       <span className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-xs">Aluno</span>
                       <span className="text-slate-900 dark:text-slate-100 font-black truncate max-w-[140px]">{scanResult?.studentName || "Nâo identificado"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                       <span className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-xs">Respostas</span>
                       <span className="text-slate-900 dark:text-slate-100 font-black">{scanResult?.answers?.length} Questões</span>
                    </div>
                    {scanResult?.examInfo && (
                       <div className="flex justify-between text-sm">
                          <span className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-xs">Prova</span>
                          <span className="text-slate-900 dark:text-slate-100 font-black">{scanResult.examInfo.subject}</span>
                       </div>
                    )}
                 </div>
                 <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 shrink-0">
                    <QRCodeSVG 
                      value={JSON.stringify({ 
                        examId: scanResult?.examId || examId, 
                        studentName: scanResult?.studentName,
                        numQuestions: scanResult?.examInfo?.numQuestions || scanResult?.answers?.length
                      })} 
                      size={64} 
                    />
                 </div>
              </div>
              <div className="flex gap-4 pt-2">
                 <button 
                   onClick={() => setStatus("idle")}
                   className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                 >
                   Cancelar
                 </button>
                 <button 
                   onClick={saveSubmission}
                   className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 dark:shadow-none"
                 >
                   <Check size={20} />
                   Confirmar
                 </button>
              </div>
           </div>
        )}
      </div>
    </motion.div>
  );
}
