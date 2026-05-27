import { Outlet } from "react-router-dom";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";

export function ProfessorLayout() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header user={user} />
      <main className="flex-1 py-6">
        <div className="container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
