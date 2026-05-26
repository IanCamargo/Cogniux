import { User } from "firebase/auth";
import { Link, useLocation } from "react-router-dom";
import { BrainCircuit, LogOut, LayoutDashboard, PlusCircle, Sun, Moon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface HeaderProps {
  user: User;
  isDark: boolean;
  onToggleTheme: () => void;
}

export function Header({ user, isDark, onToggleTheme }: HeaderProps) {
  const { logout } = useAuth();
  const location = useLocation();

  const navLink = (to: string, label: string, icon: React.ReactNode) => (
    <Link
      to={to}
      className={cn(
        buttonVariants({ variant: location.pathname.startsWith(to) ? "secondary" : "ghost", size: "sm" }),
        "gap-2"
      )}
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
    </Link>
  );

  return (
    <header className="bg-background border-b sticky top-0 z-50">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="p-1.5 bg-primary rounded-lg text-primary-foreground">
            <BrainCircuit size={24} />
          </div>
          <span className="font-semibold text-xl hidden sm:block">Cogniux</span>
        </Link>

        <nav className="flex items-center gap-1">
          {navLink("/dashboard", "Início", <LayoutDashboard size={18} />)}
          {navLink("/exam/create", "Nova Prova", <PlusCircle size={18} />)}

          <Separator orientation="vertical" className="mx-2 h-6" />

          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleTheme}
            aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </Button>

          <img
            src={user.photoURL ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName ?? "P")}`}
            className="w-8 h-8 rounded-full border ml-1"
            alt=""
          />

          <Button variant="ghost" size="icon" onClick={() => logout()} aria-label="Sair">
            <LogOut size={18} />
          </Button>
        </nav>
      </div>
    </header>
  );
}
