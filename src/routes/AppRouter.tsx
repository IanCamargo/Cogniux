import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { ProfessorLayout } from "@/routes/ProfessorLayout";
import { StudentPortal } from "@/components/StudentPortal";
import { Dashboard } from "@/components/Dashboard";
import { ExamCreator } from "@/components/ExamCreator";
import { ExamDetail } from "@/components/ExamDetail";
import { OnlineExam } from "@/components/OnlineExam";
import { useAuth } from "@/hooks/useAuth";

export function AppRouter() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/portal" replace />} />
      <Route path="/portal" element={<StudentPortal />} />
      <Route path="/online/:examId" element={<OnlineExam />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<ProfessorLayout />}>
          <Route path="/dashboard" element={user ? <Dashboard user={user} /> : null} />
          <Route path="/exam/create" element={user ? <ExamCreator user={user} /> : null} />
          <Route path="/exam/:id/edit" element={user ? <ExamCreator user={user} /> : null} />
          <Route path="/exam/:id" element={<ExamDetail />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/portal" replace />} />
    </Routes>
  );
}
