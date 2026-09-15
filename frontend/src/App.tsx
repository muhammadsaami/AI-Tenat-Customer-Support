import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { OverviewPage } from "@/pages/OverviewPage";
import { ChatPage } from "@/pages/ChatPage";
import { DocumentsPage } from "@/pages/DocumentsPage";
import { KnowledgePage } from "@/pages/KnowledgePage";
import { ActivityPage } from "@/pages/ActivityPage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { useAuth } from "@/context/AuthProvider";

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<Protected />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/knowledge" element={<KnowledgePage />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function Protected() {
  const { user, status } = useAuth();
  if (status === "authenticating") {
    return (
      <div className="boot-screen">
        <div className="boot-inner">
          <span className="boot-mark"><Sparkles size={20} /></span>
          <span className="thinking-dots"><span /><span /><span /></span>
          <div className="text-sm text-muted">Restoring your session…</div>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}