import React, { useState, useMemo, useEffect } from "react";
import {
  Megaphone,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  CheckCircle2,
  Clock,
  Archive,
  AlertTriangle,
  Trophy,
  Users,
  Send,
  X,
  Sparkles,
  Calendar,
  Layers,
  FileText,
  UserCheck,
  Check,
  Zap,
  Medal,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { useData } from "../context/DataContext";
import { Announcement, AnnouncementType, AnnouncementStatus } from "../types";
import Pagination from "../components/Pagination";
import { formatToBR } from "../lib/dateUtils";
import { calculateOfficialRanking, generateRankingAnnouncementData, getLatestActiveMonth } from "../lib/rankingCalculator";

export default function ComunicadosPage() {
  const {
    currentUser,
    users,
    announcements,
    productionEntries,
    monitoringData,
    attendanceData,
    auditors,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    markAnnouncementAsRead
  } = useData();

  const isAdmin = currentUser?.role === "admin";

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [audienceFilter, setAudienceFilter] = useState<string>("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // Drawer / Modal State for Admin Form
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTipo, setFormTipo] = useState<AnnouncementType>("informativo");
  const [formTitulo, setFormTitulo] = useState("");
  const [formMensagem, setFormMensagem] = useState("");
  const [formDestinatarios, setFormDestinatarios] = useState<string>("todos");
  const [formDisparoTipo, setFormDisparoTipo] = useState<"imediato" | "agendado">("imediato");
  const [formAgendadoData, setFormAgendadoData] = useState("");
  const [formPrioridade, setFormPrioridade] = useState<"alta" | "media" | "baixa">("media");
  const [formError, setFormError] = useState("");

  // Live Official Ranking Data for Ranking Announcement Type
  const activeMonthInfo = useMemo(() => getLatestActiveMonth(productionEntries, monitoringData), [productionEntries, monitoringData]);

  const liveRankingData = useMemo(() => {
    const rankingList = calculateOfficialRanking({
      productionEntries,
      monitoringData,
      attendanceData,
      auditors,
      users,
      filterMode: "Mes",
      filterValue: activeMonthInfo.monthKey,
    });
    return generateRankingAnnouncementData(rankingList, activeMonthInfo.label);
  }, [productionEntries, monitoringData, attendanceData, auditors, users, activeMonthInfo]);

  // Modal State for Viewing Detailed Announcement
  const [viewingAnnouncement, setViewingAnnouncement] = useState<Announcement | null>(null);

  // Filter announcements according to role
  const userRole = currentUser?.role || "viewer";
  const userKey = currentUser?.email || currentUser?.id || "user";

  const visibleAnnouncements = useMemo(() => {
    return announcements.filter(a => {
      // If not admin, only show active and published announcements matching audience
      if (!isAdmin) {
        if (a.status !== "ativo") return false;
        if (a.destinatarios !== "todos" && a.destinatarios !== userRole) return false;
      }

      // Search term filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchTitle = a.titulo.toLowerCase().includes(term);
        const matchMsg = a.mensagem.toLowerCase().includes(term);
        const matchAuthor = a.autor.toLowerCase().includes(term);
        if (!matchTitle && !matchMsg && !matchAuthor) return false;
      }

      // Status filter
      if (statusFilter !== "todos") {
        if (a.status !== statusFilter) return false;
      }

      // Audience filter
      if (audienceFilter !== "todos") {
        if (a.destinatarios !== audienceFilter) return false;
      }

      return true;
    });
  }, [announcements, isAdmin, userRole, searchTerm, statusFilter, audienceFilter]);

  const totalColaboradores = useMemo(() => {
    return Math.max(users.filter(u => u.active !== false).length, 1);
  }, [users]);

  // Open creation form
  const handleOpenNew = () => {
    setEditingId(null);
    setFormTipo("informativo");
    setFormTitulo("");
    setFormMensagem("");
    setFormDestinatarios("todos");
    setFormDisparoTipo("imediato");
    setFormAgendadoData("");
    setFormPrioridade("media");
    setFormError("");
    setIsDrawerOpen(true);
  };

  // Pre-fill ranking data when choosing Ranking type or clicking the populate button
  const handleApplyRankingPreset = () => {
    setFormTipo("ranking");
    setFormTitulo(liveRankingData.titulo);
    setFormMensagem(liveRankingData.mensagem);
    setFormPrioridade("alta");
    setFormDestinatarios("todos");
  };

  // Open edit form
  const handleOpenEdit = (ann: Announcement) => {
    setEditingId(ann.id);
    setFormTipo(ann.tipo);
    setFormTitulo(ann.titulo);
    setFormMensagem(ann.mensagem);
    setFormDestinatarios(ann.destinatarios);
    setFormDisparoTipo(ann.data_inicio ? "agendado" : "imediato");
    setFormAgendadoData(ann.data_inicio || "");
    setFormPrioridade(ann.prioridade || "media");
    setFormError("");
    setIsDrawerOpen(true);
  };

  // Save announcement (create or update)
  const handleSave = (status: AnnouncementStatus) => {
    if (!isAdmin) return;
    setFormError("");

    if (!formTitulo.trim()) {
      setFormError("Informe o título do comunicado.");
      return;
    }
    if (!formMensagem.trim()) {
      setFormError("Escreva a mensagem do comunicado.");
      return;
    }

    const rankingPayload = formTipo === "ranking" ? {
      ranking_leader_name: liveRankingData.firstPlace?.name,
      ranking_leader_photo: liveRankingData.leaderPhoto,
      ranking_leader_score: liveRankingData.firstPlace?.score,
      ranking_runner_up_name: liveRankingData.secondPlace?.name,
      ranking_runner_up_photo: liveRankingData.runnerUpPhoto,
      ranking_runner_up_score: liveRankingData.secondPlace?.score,
      ranking_diff: liveRankingData.diff,
    } : {};

    if (editingId) {
      updateAnnouncement(editingId, {
        tipo: formTipo,
        titulo: formTitulo.trim(),
        mensagem: formMensagem.trim(),
        destinatarios: formDestinatarios,
        status: status,
        prioridade: formPrioridade,
        data_inicio: formDisparoTipo === "agendado" && formAgendadoData ? formAgendadoData : undefined,
        ...rankingPayload
      });
    } else {
      addAnnouncement({
        tipo: formTipo,
        titulo: formTitulo.trim(),
        mensagem: formMensagem.trim(),
        autor: currentUser?.name || "Administrador",
        autor_foto: formTipo === "ranking" && liveRankingData.leaderPhoto ? liveRankingData.leaderPhoto : currentUser?.photoUrl,
        destinatarios: formDestinatarios,
        status: status,
        prioridade: formPrioridade,
        is_automatico: false,
        data_inicio: formDisparoTipo === "agendado" && formAgendadoData ? formAgendadoData : undefined,
        ...rankingPayload
      });
    }

    setIsDrawerOpen(false);
  };

  // Toggle active/inactive
  const handleToggleStatus = (ann: Announcement) => {
    if (!isAdmin) return;
    const newStatus: AnnouncementStatus = ann.status === "ativo" ? "arquivado" : "ativo";
    updateAnnouncement(ann.id, { status: newStatus });
  };

  // Delete announcement
  const handleDelete = (id: string) => {
    if (!isAdmin) return;
    if (window.confirm("Deseja realmente excluir este comunicado?")) {
      deleteAnnouncement(id);
    }
  };

  const getTipoBadge = (tipo: AnnouncementType) => {
    switch (tipo) {
      case "ranking":
        return { label: "Ranking", bg: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Trophy };
      case "importante":
        return { label: "Importante", bg: "bg-rose-500/10 text-rose-600 border-rose-500/20", icon: AlertTriangle };
      default:
        return { label: "Informativo", bg: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20", icon: Megaphone };
    }
  };

  const getStatusBadge = (status: AnnouncementStatus) => {
    switch (status) {
      case "ativo":
        return { label: "Ativo", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      case "agendado":
        return { label: "Agendado", bg: "bg-indigo-50 text-indigo-700 border-indigo-200" };
      case "rascunho":
        return { label: "Rascunho", bg: "bg-amber-50 text-amber-700 border-amber-200" };
      case "arquivado":
      default:
        return { label: "Arquivado", bg: "bg-slate-100 text-slate-600 border-slate-200" };
    }
  };

  const getAudienceLabel = (aud: string) => {
    switch (aud) {
      case "estagiario_teste": return "Estagiários";
      case "gerente": return "Gerência";
      case "admin": return "Administradores";
      case "viewer": return "Visualizadores";
      default: return "Todos os Colaboradores";
    }
  };

  const hasAnnouncements = visibleAnnouncements.length > 0;

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300 pb-16">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
            <Megaphone className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-primary font-headline tracking-tight">
              {isAdmin ? "Gerenciamento de Comunicados" : "Mural de Comunicados"}
            </h1>
            <p className="text-slate-500 text-sm font-medium mt-1">
              {isAdmin
                ? "Crie, segmente e acompanhe a entrega de mensagens corporativas."
                : "Avisos, destaques de produtividade e comunicados do setor."}
            </p>
          </div>
        </div>

        {/* Button in header when there are announcements */}
        {isAdmin && hasAnnouncements && (
          <button
            onClick={handleOpenNew}
            className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-brand-orange text-white rounded-2xl font-black font-headline text-sm shadow-lg shadow-indigo-600/20 hover:shadow-brand-orange/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-5 h-5" /> Novo Comunicado
          </button>
        )}
      </header>

      {/* FILTER & SEARCH BAR (Visible when there are announcements or search active) */}
      {(hasAnnouncements || searchTerm || statusFilter !== "todos" || audienceFilter !== "todos") && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Buscar comunicados..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          </div>

          {isAdmin && (
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-400 cursor-pointer"
              >
                <option value="todos">Status: Todos</option>
                <option value="ativo">Status: Ativos</option>
                <option value="agendado">Status: Agendados</option>
                <option value="rascunho">Status: Rascunhos</option>
                <option value="arquivado">Status: Arquivados</option>
              </select>

              <select
                value={audienceFilter}
                onChange={(e) => { setAudienceFilter(e.target.value); setCurrentPage(1); }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-400 cursor-pointer"
              >
                <option value="todos">Público: Todos</option>
                <option value="estagiario_teste">Público: Estagiários</option>
                <option value="gerente">Público: Gerência</option>
              </select>
            </div>
          )}

          {(searchTerm || statusFilter !== "todos" || audienceFilter !== "todos") && (
            <button
              onClick={() => { setSearchTerm(""); setStatusFilter("todos"); setAudienceFilter("todos"); }}
              className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-indigo-600 px-3 py-2 transition-colors cursor-pointer"
            >
              Limpar
            </button>
          )}
        </div>
      )}

      {/* FEED DE COMUNICADOS OU TELA CENTRALIZADA VAZIA */}
      {!hasAnnouncements ? (
        /* SEÇÃO 1: TELA INICIAL CENTRALIZADA QUANDO NÃO HOUVER COMUNICADOS */
        <div className="min-h-[460px] bg-white rounded-3xl shadow-sm border border-slate-100 p-12 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 rounded-3xl bg-indigo-50 flex items-center justify-center mb-6 shadow-sm border border-indigo-100/70">
            <Megaphone className="w-12 h-12 text-indigo-600" />
          </div>

          <h2 className="text-2xl font-black font-headline text-slate-800 tracking-tight mb-2">
            Nenhum comunicado disponível no momento
          </h2>

          <p className="text-slate-500 text-sm max-w-md leading-relaxed mb-8">
            {isAdmin
              ? "Crie comunicados informativos, avisos de alta prioridade ou destaque o líder atual do ranking de produtividade."
              : "Você está em dia com todos os comunicados corporativos e de ranking da equipe."}
          </p>

          {isAdmin && (
            <button
              onClick={handleOpenNew}
              className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-brand-orange text-white rounded-2xl font-black font-headline text-base shadow-xl shadow-indigo-600/25 hover:shadow-brand-orange/40 hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Plus className="w-6 h-6" /> Criar Novo Comunicado
            </button>
          )}
        </div>
      ) : (
        /* FEED COM OS COMUNICADOS CADASTRADOS */
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold font-headline text-slate-800">
                {isAdmin ? "Comunicados Recentes" : "Comunicados Disponíveis"}
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-400">
              Total: {visibleAnnouncements.length} registro{visibleAnnouncements.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {visibleAnnouncements.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((ann, idx) => {
              const tipoInfo = getTipoBadge(ann.tipo);
              const statusInfo = getStatusBadge(ann.status);
              const TipoIcon = tipoInfo.icon;
              const isRead = (ann.lido_por || []).includes(userKey);
              const readCount = (ann.lido_por || []).length;
              const reachPct = totalColaboradores > 0 ? Math.min(100, Math.round((readCount / totalColaboradores) * 100)) : 0;
              const isRanking = ann.tipo === "ranking";

              return (
                <motion.div
                  key={ann.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={cn(
                    "p-6 hover:bg-slate-50/70 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6",
                    !isRead && !isAdmin && "bg-indigo-50/20",
                    isRanking && "border-l-4 border-l-amber-400 bg-amber-50/10"
                  )}
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Visual Icon / Leader Photo for Ranking */}
                    {isRanking && (ann.ranking_leader_photo || ann.autor_foto) ? (
                      <div className="relative shrink-0">
                        <img
                          src={ann.ranking_leader_photo || ann.autor_foto}
                          alt="Líder"
                          className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-400 shadow-md shadow-amber-400/20"
                        />
                        <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center shadow font-black text-[10px]">
                          1º
                        </div>
                      </div>
                    ) : (
                      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm", tipoInfo.bg)}>
                        <TipoIcon className="w-7 h-7" />
                      </div>
                    )}

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {isAdmin && (
                          <span className={cn("text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border", statusInfo.bg)}>
                            {statusInfo.label}
                          </span>
                        )}
                        <span className={cn("text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border", tipoInfo.bg)}>
                          {tipoInfo.label}
                        </span>
                        {ann.prioridade === "alta" && (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-full">
                            Alta Prioridade
                          </span>
                        )}
                        {!isRead && !isAdmin && (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-indigo-600 text-white rounded-full animate-pulse">
                            Novo
                          </span>
                        )}
                        <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {ann.published_at ? formatToBR(ann.published_at.substring(0, 10)) : formatToBR(ann.created_at.substring(0, 10))}
                        </span>
                      </div>

                      <h3
                        onClick={() => setViewingAnnouncement(ann)}
                        className="text-base font-black font-headline text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer flex items-center gap-2"
                      >
                        {ann.titulo}
                      </h3>

                      <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed font-normal whitespace-pre-line">
                        {ann.mensagem}
                      </p>

                      {/* Ranking Highlight Info Banner */}
                      {isRanking && ann.ranking_leader_name && (
                        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                          <span className="px-2.5 py-1 bg-amber-100/70 border border-amber-200 text-amber-800 rounded-lg font-bold flex items-center gap-1.5">
                            🥇 1º: {ann.ranking_leader_name} ({ann.ranking_leader_score?.toLocaleString("pt-BR")} pts)
                          </span>
                          {ann.ranking_runner_up_name && (
                            <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-bold flex items-center gap-1.5">
                              🥈 2º: {ann.ranking_runner_up_name} ({ann.ranking_runner_up_score?.toLocaleString("pt-BR")} pts)
                            </span>
                          )}
                          {typeof ann.ranking_diff === "number" && ann.ranking_diff > 0 && (
                            <span className="text-rose-600 font-extrabold">
                              🔥 Dif: {ann.ranking_diff.toLocaleString("pt-BR")} pts
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-400 font-medium">
                        <span className="flex items-center gap-1.5 text-slate-600 font-bold">
                          <Users className="w-3.5 h-100vh text-indigo-500" />
                          {getAudienceLabel(ann.destinatarios)}
                        </span>

                        {isAdmin && (
                          <span className="text-indigo-600 font-extrabold flex items-center gap-1">
                            <Eye className="w-3.5 h-100vh" />
                            {reachPct}% de Alcance ({readCount} visualizações)
                          </span>
                        )}

                        <span className="text-slate-400">
                          Por: <strong className="text-slate-700">{ann.autor}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                    <button
                      onClick={() => {
                        setViewingAnnouncement(ann);
                        markAnnouncementAsRead(ann.id, userKey);
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Ler Completo
                    </button>

                    {!isAdmin && !isRead && (
                      <button
                        onClick={() => markAnnouncementAsRead(ann.id, userKey)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                      >
                        <Check className="w-3.5 h-100vh" /> Entendido
                      </button>
                    )}

                    {isAdmin && (
                      <>
                        <button
                          onClick={() => handleToggleStatus(ann)}
                          className={cn(
                            "p-2 rounded-xl border transition-colors cursor-pointer",
                            ann.status === "ativo"
                              ? "bg-slate-50 border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-600"
                              : "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100"
                          )}
                          title={ann.status === "ativo" ? "Arquivar/Desativar" : "Reativar Comunicado"}
                        >
                          {ann.status === "ativo" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={() => handleOpenEdit(ann)}
                          className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(ann.id)}
                          className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={visibleAnnouncements.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
            className="p-6 border-t border-slate-100"
          />
        </div>
      )}

      {/* MODAL CRIAR / EDITAR COMUNICADO — CENTRALIZADO */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setIsDrawerOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="bg-white w-full max-w-2xl max-h-[90vh] shadow-2xl rounded-3xl border border-slate-200 flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-brand-orange p-6 text-white flex items-center justify-between shrink-0 rounded-t-3xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black font-headline">
                      {editingId ? "Editar Comunicado" : "Novo Comunicado"}
                    </h2>
                    <p className="text-indigo-100 text-xs font-medium">Configure título, público e disparo</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {formError}
                  </div>
                )}

                {/* Tipo / Categoria */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Estilo Visual / Categoria
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { type: "informativo", label: "Informativo", icon: Megaphone, color: "text-indigo-600" },
                      { type: "ranking", label: "Ranking", icon: Trophy, color: "text-amber-500" },
                      { type: "importante", label: "Importante", icon: AlertTriangle, color: "text-rose-500" },
                    ].map((item) => {
                      const Icon = item.icon;
                      const isSelected = formTipo === item.type;
                      return (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => {
                            setFormTipo(item.type as AnnouncementType);
                            if (item.type === "ranking" && !formTitulo) {
                              setFormTitulo(liveRankingData.titulo);
                              setFormMensagem(liveRankingData.mensagem);
                              setFormPrioridade("alta");
                            }
                          }}
                          className={cn(
                            "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer",
                            isSelected
                              ? "bg-indigo-50/80 border-indigo-500 text-indigo-900 shadow-sm"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                          )}
                        >
                          <Icon className={cn("w-5 h-5 mb-1", item.color)} />
                          <span className="text-xs font-black">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* PRÉVIA DINÂMICA DE RANKING (SEÇÃO 15 DA ESPECIFICAÇÃO) */}
                {formTipo === "ranking" && (
                  <div className="bg-gradient-to-br from-amber-50 via-orange-50/40 to-slate-50 border-2 border-amber-300/80 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                        <Trophy className="w-4 h-4 text-amber-500" /> Prévia Oficial do Ranking Atual ({activeMonthInfo.label})
                      </h4>
                      <button
                        type="button"
                        onClick={handleApplyRankingPreset}
                        className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
                        title="Preenche o título e a mensagem com os dados oficiais calculados"
                      >
                        <RefreshCw className="w-3 h-100vh" /> Aplicar Texto
                      </button>
                    </div>

                    {liveRankingData.firstPlace ? (
                      <div className="space-y-3">
                        {/* 1º Lugar */}
                        <div className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-amber-200 shadow-xs">
                          {liveRankingData.leaderPhoto ? (
                            <img
                              src={liveRankingData.leaderPhoto}
                              alt={liveRankingData.firstPlace.name}
                              className="w-12 h-12 rounded-full object-cover border-2 border-amber-400 shadow-sm shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-black text-sm shadow-sm shrink-0">
                              {liveRankingData.firstPlace.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">
                                🥇 1º Lugar
                              </span>
                            </div>
                            <p className="text-sm font-black text-slate-800 truncate mt-0.5">
                              {liveRankingData.firstPlace.name}
                            </p>
                            <p className="text-xs font-black text-amber-600">
                              {liveRankingData.firstPlace.score.toLocaleString("pt-BR")} pontos
                            </p>
                          </div>
                        </div>

                        {/* 2º Lugar e Disputa Competitiva */}
                        {liveRankingData.secondPlace && (
                          <div className="bg-white/80 p-3.5 rounded-xl border border-slate-200 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-700 flex items-center gap-1">
                                🥈 2º Lugar: <strong>{liveRankingData.secondPlace.name}</strong>
                              </span>
                              <span className="font-black text-slate-600">
                                {liveRankingData.secondPlace.score.toLocaleString("pt-BR")} pontos
                              </span>
                            </div>
                            <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-lg text-xs text-amber-900 font-medium leading-relaxed">
                              🔥 <strong>Faltam {liveRankingData.diff.toLocaleString("pt-BR")} pontos</strong> para {liveRankingData.secondPlace.name} ultrapassar {liveRankingData.firstPlace.name}!
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic text-center py-2">
                        Nenhum registro de produção encontrado no período para compor o ranking.
                      </p>
                    )}
                  </div>
                )}

                {/* Título */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Título do Comunicado *
                  </label>
                  <input
                    type="text"
                    value={formTitulo}
                    onChange={(e) => setFormTitulo(e.target.value)}
                    placeholder="Ex: Aviso Importante, Manutenção Programada..."
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Mensagem / Conteúdo */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Conteúdo / Mensagem *
                  </label>
                  <textarea
                    rows={6}
                    value={formMensagem}
                    onChange={(e) => setFormMensagem(e.target.value)}
                    placeholder="Escreva a mensagem corporativa aqui com todos os detalhes..."
                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none leading-relaxed"
                  />
                </div>

                {/* Segmentação / Público */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-3">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-600" /> Segmentação (Público)
                  </label>

                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-300">
                      <input
                        type="radio"
                        name="destinatarios"
                        checked={formDestinatarios === "todos"}
                        onChange={() => setFormDestinatarios("todos")}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-800">Todos os Colaboradores</p>
                        <p className="text-[10px] text-slate-400">Envio global para toda a empresa</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-300">
                      <input
                        type="radio"
                        name="destinatarios"
                        checked={formDestinatarios === "estagiario_teste"}
                        onChange={() => setFormDestinatarios("estagiario_teste")}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-800">Apenas Estagiários</p>
                        <p className="text-[10px] text-slate-400">Exclusivo para credenciais de teste/estágio</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Disparo */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-3">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-600" /> Disparo
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormDisparoTipo("imediato")}
                      className={cn(
                        "p-3 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer",
                        formDisparoTipo === "imediato"
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      Imediato (Agora)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormDisparoTipo("agendado")}
                      className={cn(
                        "p-3 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer",
                        formDisparoTipo === "agendado"
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      Agendado
                    </button>
                  </div>

                  {formDisparoTipo === "agendado" && (
                    <input
                      type="datetime-local"
                      value={formAgendadoData}
                      onChange={(e) => setFormAgendadoData(e.target.value)}
                      className="w-full bg-white border border-slate-200 p-3 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                    />
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0 rounded-b-3xl">
                <button
                  type="button"
                  onClick={() => handleSave("rascunho")}
                  className="px-5 py-3 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Salvar Rascunho
                </button>

                <button
                  type="button"
                  onClick={() => handleSave(formDisparoTipo === "agendado" ? "agendado" : "ativo")}
                  className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-sm font-black font-headline uppercase tracking-wider shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" /> Publicar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DETALHADO DO COMUNICADO (Estrutura visual diferenciada para Ranking — Seção 9) */}
      <AnimatePresence>
        {viewingAnnouncement && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setViewingAnnouncement(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-800 max-w-md w-full overflow-hidden relative"
            >
              {/* Header Visual Banner */}
              <div className={cn(
                "h-44 relative overflow-hidden flex flex-col items-center justify-center p-6 text-center",
                viewingAnnouncement.tipo === "ranking"
                  ? "bg-gradient-to-br from-amber-950 via-slate-900 to-orange-950"
                  : viewingAnnouncement.tipo === "importante"
                  ? "bg-gradient-to-br from-rose-950 via-slate-900 to-red-950"
                  : "bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900"
              )}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.25),transparent)]" />
                
                {/* Ranking Leader Photo prominent view */}
                {viewingAnnouncement.tipo === "ranking" && (viewingAnnouncement.ranking_leader_photo || viewingAnnouncement.autor_foto) ? (
                  <div className="relative z-10 mb-2">
                    <img
                      src={viewingAnnouncement.ranking_leader_photo || viewingAnnouncement.autor_foto}
                      alt="Líder"
                      className="w-20 h-20 rounded-full object-cover border-4 border-amber-400 shadow-xl shadow-amber-500/20"
                    />
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-black text-xs shadow">
                      👑
                    </div>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center relative z-10 shadow-lg mb-2">
                    {viewingAnnouncement.tipo === "ranking" ? (
                      <Trophy className="w-8 h-8 text-amber-400" />
                    ) : viewingAnnouncement.tipo === "importante" ? (
                      <AlertTriangle className="w-8 h-8 text-rose-400" />
                    ) : (
                      <Megaphone className="w-8 h-8 text-indigo-300" />
                    )}
                  </div>
                )}

                <button
                  onClick={() => setViewingAnnouncement(null)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer z-20"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-7 space-y-5">
                {/* Author Info */}
                <div className="flex items-center gap-3">
                  {viewingAnnouncement.autor_foto ? (
                    <img src={viewingAnnouncement.autor_foto} alt="Author" className="w-10 h-10 rounded-full object-cover border border-slate-700" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                      {viewingAnnouncement.autor?.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">{viewingAnnouncement.autor}</h4>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                      {viewingAnnouncement.published_at ? formatToBR(viewingAnnouncement.published_at.substring(0, 10)) : formatToBR(viewingAnnouncement.created_at.substring(0, 10))}
                    </p>
                  </div>
                </div>

                <h3 className="text-xl font-black font-headline text-white leading-snug">
                  {viewingAnnouncement.titulo}
                </h3>

                {/* Seção Estruturada Especial para Ranking (Seção 9) */}
                {viewingAnnouncement.tipo === "ranking" && viewingAnnouncement.ranking_leader_name && (
                  <div className="bg-slate-800/90 rounded-2xl p-4 border border-amber-500/30 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🥇</span>
                        <div>
                          <p className="text-xs font-bold text-amber-400 uppercase">1º Lugar</p>
                          <p className="text-sm font-black text-white">{viewingAnnouncement.ranking_leader_name}</p>
                        </div>
                      </div>
                      <span className="text-base font-black text-amber-400">
                        {viewingAnnouncement.ranking_leader_score?.toLocaleString("pt-BR")} pts
                      </span>
                    </div>

                    {viewingAnnouncement.ranking_runner_up_name && (
                      <div className="flex items-center justify-between pt-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🥈</span>
                          <span className="text-slate-300 font-bold">{viewingAnnouncement.ranking_runner_up_name}</span>
                        </div>
                        <span className="text-slate-400 font-bold">
                          {viewingAnnouncement.ranking_runner_up_score?.toLocaleString("pt-BR")} pts
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line font-medium">
                  {viewingAnnouncement.mensagem}
                </p>

                <div className="pt-4 border-t border-slate-800 space-y-2.5">
                  <button
                    onClick={() => {
                      markAnnouncementAsRead(viewingAnnouncement.id, userKey);
                      setViewingAnnouncement(null);
                    }}
                    className="w-full py-3.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-black font-headline rounded-2xl uppercase tracking-wider shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
                  >
                    Entendido
                  </button>

                  <button
                    onClick={() => setViewingAnnouncement(null)}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl text-xs transition-colors cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
