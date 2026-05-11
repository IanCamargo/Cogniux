import { useState } from "react";
import { motion } from "motion/react";
import { LogIn, BrainCircuit, Sparkles, ArrowRight, Sun, Moon } from "lucide-react";
import { auth } from "../lib/firebase";
import { GoogleAuthProvider, signInWithPopup, GithubAuthProvider, OAuthProvider } from "firebase/auth";

interface StudentPortalProps {
  onEnterExam: (code: string) => void;
  onProfessorLogin: (providerName: "google" | "microsoft") => void;
  isDark: boolean;
  setIsDark: (v: boolean) => void;
}

export function StudentPortal({ onEnterExam, onProfessorLogin, isDark, setIsDark }: StudentPortalProps) {
  const [code, setCode] = useState("");

  const handleLogin = async (providerType: "google" | "microsoft") => {
    let provider;
    if (providerType === "google") {
      provider = new GoogleAuthProvider();
    } else {
      provider = new OAuthProvider('microsoft.com');
    }

    try {
      await signInWithPopup(auth, provider);
      onProfessorLogin(providerType);
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      alert("Falha na autenticação com " + providerType);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 transition-colors relative">
      <button 
        onClick={() => setIsDark(!isDark)}
        className="fixed top-4 right-4 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-400 z-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
      >
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8"
      >
        <div className="text-center space-y-4">
           <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-3xl flex items-center justify-center mx-auto text-white shadow-2xl shadow-indigo-200 dark:shadow-none rotate-3">
              <BrainCircuit size={44} />
           </div>
           <div>
              <h1 className="text-4xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tighter">Cogniux</h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Inteligência Pedagógica Avançada</p>
           </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none space-y-8">
           <div className="space-y-4">
              <div className="space-y-2">
                 <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Código da Atividade</label>
                 <input 
                    type="text" 
                    placeholder="Cole o código aqui..."
                    className="w-full text-center text-xl p-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-indigo-600 outline-none transition-all dark:text-white font-black"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                 />
              </div>
              <button 
                 disabled={!code.trim()}
                 onClick={() => onEnterExam(code)}
                 className="w-full py-5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-2xl font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-lg shadow-xl shadow-indigo-100 dark:shadow-none"
              >
                 Acessar Atividade
                 <ArrowRight size={24} />
              </button>
           </div>

           <div className="relative">
              <div className="absolute inset-0 flex items-center">
                 <span className="w-full border-t border-slate-100 dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                 <span className="bg-white dark:bg-slate-900 px-4 text-slate-400 font-black tracking-widest">Acesso do Professor</span>
              </div>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button 
                 onClick={() => handleLogin("google")}
                 className="w-full py-4 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
              >
                 <LogIn size={20} className="text-rose-500" />
                 Google
              </button>
              <button 
                onClick={() => handleLogin("microsoft")}
                className="w-full py-4 bg-indigo-50 border-2 border-indigo-100 text-indigo-700 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-indigo-100 transition-all shadow-sm"
              >
                <div className="grid grid-cols-2 gap-0.5">
                    <div className="w-1.5 h-1.5 bg-red-500"></div>
                    <div className="w-1.5 h-1.5 bg-green-500"></div>
                    <div className="w-1.5 h-1.5 bg-blue-500"></div>
                    <div className="w-1.5 h-1.5 bg-yellow-500"></div>
                </div>
                Outlook
              </button>
           </div>
        </div>

        <div className="flex justify-center flex-wrap gap-4 pt-4">
           <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <Sparkles size={12} className="text-amber-500" />
              Correção via IA
           </div>
           <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <LogIn size={12} className="text-indigo-500" />
              Acesso Web
           </div>
        </div>
      </motion.div>
    </div>
  );
}
