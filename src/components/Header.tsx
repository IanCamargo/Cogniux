import { User } from "firebase/auth";
import { Link, useLocation } from "react-router-dom";
import { BrainCircuit } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { UserPopover } from "@/components/UserPopover";
import { cn } from "@/lib/utils";

interface HeaderProps {
  user: User;
}

export function Header({ user }: HeaderProps) {
  const location = useLocation();

  const navLink = (to: string, label: string) => (
    <Link
      to={to}
      className={cn(
        buttonVariants({ variant: location.pathname.startsWith(to) ? "secondary" : "ghost", size: "sm" }),
      )}
    >
      {label}
    </Link>
  );

  return (
    <header className="bg-background border-b sticky top-0 z-50 no-print">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="p-1.5 bg-primary rounded-lg text-primary-foreground">
            <BrainCircuit size={24} />
          </div>
          <span className="font-semibold text-xl hidden sm:block">Cogniux</span>
        </Link>

        <nav className="flex items-center gap-1">
          {navLink("/dashboard", "Início")}
          {navLink("/exam/create", "Nova Prova")}

          <Separator orientation="vertical" className="mx-2 h-6 !self-center" />

          <UserPopover user={user} />
        </nav>
      </div>
    </header>
  );
}
