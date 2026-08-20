import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import TopBar from "./components/layout/TopBar";
import ImportPage from "./pages/ImportPage";
import DashboardPage from "./pages/DashboardPage";
import FechamentoPage from "./pages/FechamentoPage";
import AttendancePage from "./pages/AttendancePage";
import RankingPage from "./pages/RankingPage";
import RmaPage from "./pages/RmaPage";
import AdminPage from "./pages/AdminPage";
import LoginPage from "./pages/LoginPage";
import ProducaoPage from "./pages/ProducaoPage";
import ComunicadosPage from "./pages/ComunicadosPage";
import { motion, AnimatePresence } from "motion/react";
import { DataProvider, useData } from "./context/DataContext";
import { KeyRound } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("React ErrorBoundary Caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", background: "#ffe6e6", color: "#8b0000", fontFamily: "monospace" }}>
          <h2>Algo quebrou a interface (Erro do React)</h2>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{this.state.error?.toString()}</pre>
          <pre style={{ marginTop: "10px", fontSize: "11px" }}>{this.state.error?.stack}</pre>
          <button onClick={() => window.location.reload()} style={{ padding: "10px", background: "black", color: "white" }}>
            Recarregar Pagina
          </button>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

// Route guard for estagiário role
function RoleGuard({ children }: { children: React.ReactNode }) {
  const { currentUser } = useData();
  const location = useLocation();

  if (currentUser?.role === "estagiario_teste") {
    const allowed = ["/producao", "/ranking", "/comunicados"];
    const isAllowed = allowed.some(p => location.pathname.startsWith(p));
    if (!isAllowed) {
      return <Navigate to="/producao" replace />;
    }
  }

  return <>{children}</>;
}

function AuthenticatedLayout() {
  const { currentUser } = useData();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);

  React.useEffect(() => {
    // Iniciar dark mode a partir do localStorage
    if (localStorage.getItem("theme") === "dark") {
      document.documentElement.classList.add("dark");
    }
  }, []);

  // Close sidebar on resize to mobile
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!currentUser) {
      return <Navigate to="/login" replace />;
  }

  const getModuleTitle = (path: string) => {
    if (path.startsWith("/admin")) return "Configurações Globais";
    if (path.startsWith("/import")) return "Importação de Dados";
    if (path.startsWith("/comunicados")) return "Gerenciamento de Comunicados";
    if (path.startsWith("/fechamento")) return "Fechamento Mês Geral";
    if (path.startsWith("/rma")) return "Controle de RMA (Retorno e Garantia)";
    if (path.startsWith("/attendance")) return "Atrasos de Ponto";
    if (path.startsWith("/ranking")) return "Ranking Geral";
    if (path.startsWith("/producao")) return "Produção Diária";
    return "Monitoramento da Equipe";
  };

  const getDefaultRoute = () => {
    if (currentUser?.role === "estagiario_teste") return "/producao";
    if (currentUser?.role === "viewer") return "/dashboard";
    return "/import";
  };

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  return (
    <div className="min-h-screen bg-surface flex">
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

      {/* Dynamic spacer for desktop sidebar */}
      <div className="main-spacer" data-sidebar={sidebarOpen ? "open" : "closed"} />

      <main className="flex-1 min-h-screen flex flex-col min-w-0">
        <TopBar title={getModuleTitle(location.pathname)} onMenuToggle={toggleSidebar} sidebarOpen={sidebarOpen} />

        <div className="flex-1 mt-20 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <ErrorBoundary>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <RoleGuard>
                  <Routes location={location}>
                     <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />
                     <Route path="/dashboard" element={<DashboardPage />} />
                     <Route path="/comunicados" element={<ComunicadosPage />} />
                     <Route path="/import" element={<ImportPage />} />
                     <Route path="/fechamento" element={<FechamentoPage />} />
                     <Route path="/rma" element={<RmaPage />} />
                     <Route path="/attendance" element={<AttendancePage />} />
                     <Route path="/ranking" element={<RankingPage />} />
                     <Route path="/producao" element={<ProducaoPage />} />
                     <Route path="/admin" element={<AdminPage />} />
                  </Routes>
                </RoleGuard>
              </motion.div>
            </AnimatePresence>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

function AppContent() {
  const { currentUser, authLoading } = useData();
  
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface">
        <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center text-primary shadow-inner animate-pulse">
           <KeyRound className="w-10 h-10 animate-spin" style={{ animationDuration: '3s' }} />
        </div>
        <p className="mt-4 text-slate-400 font-bold tracking-widest uppercase text-xs">Carregando Sessão...</p>
      </div>
    );
  }

  return (
    <Router>
        <Routes>
            <Route path="/login" element={currentUser ? <Navigate to="/" replace /> : <LoginPage />} />
            <Route path="/*" element={<AuthenticatedLayout />} />
        </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </ErrorBoundary>
  );
}
