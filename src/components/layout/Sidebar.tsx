import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  UploadCloud,
  Users,
  AlertTriangle,
  History,
  Trophy,
  Settings,
  HelpCircle,
  Shield,
  LogOut,
  PackagePlus,
  PenTool,
  ClipboardList,
  Menu,
  X
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useData } from "../../context/DataContext";

interface SidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const { currentUser, setCurrentUser } = useData();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fechar drawer ao mudar de rota em mobile
  useEffect(() => {
    if (isMobile && isOpen && onToggle) {
      onToggle();
    }
  }, [location.pathname]);

  // Permissões
  const isAdmin = currentUser?.role === "admin";
  const isGerente = currentUser?.role === "gerente";
  const isEstagiario = currentUser?.role === "estagiario_teste";
  const canImport = isAdmin || isGerente;

  // Definição de Menus Completa
  const allMenuItems = [
    { id: "import", path: "/import", label: "Importação", icon: UploadCloud, requireImport: true },
    { id: "monitoring", path: "/dashboard", label: "Monitoramento da Equipe", icon: Users },
    { id: "producao", path: "/producao", label: "Produção", icon: ClipboardList },
    { id: "fechamento", path: "/fechamento", label: "Fechamento Setor", icon: AlertTriangle },
    { id: "maintenance", path: "/maintenance", label: "Manutenções", icon: PenTool },
    { id: "rma", path: "/rma", label: "Controle RMA", icon: PackagePlus },
    { id: "attendance", path: "/attendance", label: "Atrasos de Ponto", icon: History },
    { id: "ranking", path: "/ranking", label: "Ranking Geral", icon: Trophy },
  ];

  // RBAC Filter
  const menuItems = allMenuItems.filter(item => {
    if (item.requireImport && !canImport) return false;
    if (isEstagiario) {
      return item.id === "producao" || item.id === "ranking";
    }
    return true;
  });

  const handleLogout = () => {
    if (window.confirm("Deseja sair da sua conta?")) {
      localStorage.removeItem("mock_auth_email");
      setCurrentUser(null);
    }
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case "admin": return "Administrador";
      case "gerente": return "Gerência";
      case "estagiario_teste": return "Estagiário";
      default: return "Visualizador";
    }
  };

  const drawerState = isMobile ? (isOpen ? "open" : "closed") : "open";

  return (
    <>
      {/* Overlay Mobile */}
      {isMobile && (
        <div
          className="drawer-overlay"
          data-state={drawerState}
          onClick={onToggle}
        />
      )}

      {/* Sidebar / Drawer */}
      <aside
        className="sidebar-drawer"
        data-state={drawerState}
      >
        <div className="p-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="text-white w-6 h-6" fill="currentColor" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-primary leading-none">
                S.L.T
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                Laboratório
              </p>
            </div>
            {/* Close button on mobile */}
            {isMobile && (
              <button onClick={onToggle} className="ml-auto p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.id}
                to={item.path}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all group",
                  active
                    ? "bg-indigo-50 text-indigo-700 font-semibold border-r-4 border-indigo-700"
                    : "text-slate-600 hover:bg-slate-100",
                )}
              >
                <item.icon
                  className={cn(
                    "w-5 h-5",
                    active
                      ? "text-indigo-700"
                      : "text-slate-400 group-hover:text-indigo-900",
                  )}
                />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-1">
          {isAdmin && (
            <Link
              to="/admin"
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                isActive("/admin") ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <Settings className={cn("w-5 h-5", isActive("/admin") ? "text-indigo-700" : "text-slate-400")} />
              <span className="text-sm font-medium">Cadastros & API</span>
            </Link>
          )}
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">
            <HelpCircle className="w-5 h-5 text-slate-400" />
            <span className="text-sm font-medium">Suporte</span>
          </button>
        </div>

        <div className="p-6 border-t border-outline-variant/10 flex items-center justify-between group cursor-pointer hover:bg-slate-100 transition-colors" onClick={handleLogout}>
          <div className="flex items-center gap-3">
            {currentUser?.photoUrl ? (
              <img src={currentUser.photoUrl} alt="User" className="w-10 h-10 rounded-full object-cover border border-primary/20 shadow-sm" />
            ) : (
              <div className="w-10 h-10 rounded-full border border-primary/20 bg-primary/10 flex items-center justify-center text-primary font-bold shadow-sm">
                {currentUser?.name?.substring(0, 2).toUpperCase() || "US"}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-900 truncate" title={currentUser?.name || ""}>{currentUser?.name || "Usuário"}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                {getRoleLabel(currentUser?.role)}
              </p>
            </div>
          </div>
          <LogOut className="w-4 h-4 text-slate-400 group-hover:text-error transition-colors" />
        </div>
      </aside>
    </>
  );
}
