import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BrainCircuit, ArrowRight, Sun, Moon, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { normalizeAccessCode } from "@/lib/accessCode";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "sonner";

export function StudentPortal() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { isDark, toggle } = useTheme();

  const handleEnterExam = async () => {
    try {
      setLoading(true);
      const normalized = normalizeAccessCode(code);

      const tokenSnap = await getDoc(doc(db, "access_tokens", normalized));
      if (tokenSnap.exists()) {
        const tokenData = tokenSnap.data();
        if (tokenData.isUsed) {
          toast.error("Este código de acesso já foi utilizado.");
          return;
        }
        navigate(`/online/${tokenData.examId}?token=${normalized}`);
        return;
      }

      navigate(`/online/${normalized}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao verificar código.");
    } finally {
      setLoading(false);
    }
  };

  const handleProfessorLogin = async (provider: "google" | "microsoft") => {
    try {
      await login(provider);
      navigate("/dashboard");
    } catch {
      toast.error(`Falha na autenticação com ${provider}.`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative">
      <Button
        variant="outline"
        size="icon"
        className="fixed top-4 right-4"
        onClick={toggle}
        aria-label={isDark ? "Tema claro" : "Tema escuro"}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </Button>

      <div className="container max-w-md space-y-8 py-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto text-primary-foreground">
            <BrainCircuit size={36} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cogniux</h1>
            <p className="text-muted-foreground">Inteligência Pedagógica Avançada</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Acesso do Aluno</CardTitle>
            <CardDescription>Insira o código da atividade fornecido pelo professor.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="exam-code">Código da Atividade</Label>
              <Input
                id="exam-code"
                placeholder="Cole o código aqui..."
                className="text-center text-lg font-mono uppercase"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && code.trim() && handleEnterExam()}
              />
            </div>
            <Button
              className="w-full"
              disabled={!code.trim() || loading}
              onClick={handleEnterExam}
            >
              Acessar Atividade
              <ArrowRight className="ml-2" size={18} />
            </Button>

            <Separator />

            <p className="text-xs text-muted-foreground text-center uppercase tracking-widest font-medium">
              Acesso do Professor
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => handleProfessorLogin("google")}>
                <LogIn className="mr-2" size={16} />
                Google
              </Button>
              <Button variant="outline" onClick={() => handleProfessorLogin("microsoft")}>
                Outlook
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
