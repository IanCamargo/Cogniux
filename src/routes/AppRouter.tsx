import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { ProfessorLayout } from "@/routes/ProfessorLayout";
import { StudentPortal } from "@/components/StudentPortal";
import { Dashboard } from "@/components/Dashboard";
import { ExamCreator } from "@/components/ExamCreator";
import { ExamDetail } from "@/components/ExamDetail";
import { OnlineExam } from "@/components/OnlineExam";
import { ProfilePage } from "@/pages/ProfilePage";
import { SeedPage } from "@/pages/SeedPage";
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
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/exam/create" element={<ExamCreator user={user!} />} />
          <Route path="/exam/:id/edit" element={<ExamCreator user={user!} />} />
          <Route path="/exam/:id" element={<Navigate to="overview" replace />} />
          <Route path="/exam/:id/:tab" element={<ExamDetail />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/seed" element={<SeedPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/portal" replace />} />
    </Routes>
  );
}
