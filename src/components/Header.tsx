import { User } from "firebase/auth";
import { BrainCircuit, LogOut, LayoutDashboard, PlusCircle, Scan, Sun, Moon } from "lucide-react";
import { auth } from "../lib/firebase";
import { useState, useEffect } from "react";

interface HeaderProps {
  user: User;
  setView: (v: "dashboard" | "create" | "scan" | "detail") => void;
  isDark: boolean;
  setIsDark: (v: boolean) => void;
}

export function Header({ user, setView, isDark, setIsDark }: HeaderProps) {

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-colors">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div 
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => setView("dashboard")}
        >
          <div className="p-1.5 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg text-white shadow-lg shadow-indigo-200 dark:shadow-none">
            <BrainCircuit size={24} />
          </div>
          <span className="font-display font-black text-xl tracking-tight text-slate-900 dark:text-white hidden sm:block">
            Cogniux
          </span>
        </div>

        <nav className="flex items-center gap-1 sm:gap-2 md:gap-4 font-sans">
          <button 
            onClick={() => setView("dashboard")}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
          >
            <LayoutDashboard size={20} />
            <span className="text-sm font-semibold hidden md:block">Início</span>
          </button>
          <button 
            onClick={() => setView("create")}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
          >
            <PlusCircle size={20} />
            <span className="text-sm font-semibold hidden md:block">Nova Prova</span>
          </button>
          <button 
            onClick={() => setView("scan")}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
          >
            <Scan size={20} />
            <span className="text-sm font-semibold hidden md:block">Escanear</span>
          </button>
          
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-2" />
          
          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={() => setIsDark(!isDark)}
              className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <img 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
              className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700"
              alt="Avatar"
            />
            <button 
              onClick={() => auth.signOut()}
              className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
            >
              <LogOut size={20} />
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
