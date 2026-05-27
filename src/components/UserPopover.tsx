import { useNavigate } from "react-router-dom";
import { Sun, Moon, Monitor, Settings, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import type { Theme } from "@/lib/theme";
import type { User } from "firebase/auth";

const THEME_OPTIONS: { value: Theme; icon: React.ReactNode; label: string }[] = [
  { value: "light", icon: <Sun className="size-4" />, label: "Claro" },
  { value: "system", icon: <Monitor className="size-4" />, label: "Sistema" },
  { value: "dark", icon: <Moon className="size-4" />, label: "Escuro" },
];

interface UserPopoverProps {
  user: User;
}

export function UserPopover({ user }: UserPopoverProps) {
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const avatarUrl =
    user.photoURL ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName ?? "P")}&background=random`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <img src={avatarUrl} className="w-8 h-8 rounded-full border select-none" alt="" draggable={false} />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52">
        <div className="px-2 py-1.5">
          <p className="text-sm font-semibold truncate">{user.displayName ?? "Usuário"}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => navigate("/profile")}>
            <Settings className="size-4" />
            Configurações
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel>Tema</DropdownMenuLabel>
          {THEME_OPTIONS.map((opt) => (
            <DropdownMenuItem
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={cn(theme === opt.value && "bg-accent text-accent-foreground")}
            >
              {opt.icon}
              {opt.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive" onClick={() => logout()}>
            <LogOut className="size-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
