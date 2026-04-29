import React, { useState, useMemo, useRef } from "react";
import {
  ClipboardList,
  Plus,
  Sparkles,
  CalendarDays,
  Brush,
  MonitorCheck,
  TrendingUp,
  ListChecks,
  Tag,
  X,
  CheckCircle2,
  AlertCircle,
  Wrench,
  ArrowUpDown,
  Pencil,
  Trash2,
  Search
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { useData } from "../context/DataContext";
import { ProductionEntry } from "../types";
import DateFilter from "../components/DateFilter";
import { DateFilterMode, isDateMatch, formatToBR, normalizeDateToISO } from "../lib/dateUtils";

// Labels pré-definidas de atividades
const ACTIVITY_LABELS = [
  "Organização do Setor",
  "Criação de Ordens",
  "Linkagem",
  "Embalagem",
  "Teste de fontes",
  "Confirmação de Ordens",
  "Gravação",
  "Relatório",
  "Sucata",
  "Conserto Minas",
  "RMA",
  "Manutenções",
];

export default function ProducaoPage() {
  const { currentUser, productionEntries, setProductionEntries, deleteProductionEntry, updateProductionEntry, monitoringData, setMonitoringData } = useData();

  // RBAC
  const isEstagiario = currentUser?.role === "estagiario_teste";
  const canViewHistory = !isEstagiario;
  const canEditDelete = currentUser?.role === "admin" || currentUser?.role === "viewer";

  // Formulário — strings para evitar leading zero bug
  const [limposStr, setLimposStr] = useState("");
  const [testadosStr, setTestadosStr] = useState("");
  const [manutEquipStr, setManutEquipStr] = useState("");
  const [manutEscadaStr, setManutEscadaStr] = useState("");
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [outros, setOutros] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [formError, setFormError] = useState("");

  // Search & Edit
  const [searchTerm, setSearchTerm] = useState("");
  const [editingEntry, setEditingEntry] = useState<ProductionEntry | null>(null);
  const [editLimpos, setEditLimpos] = useState("");
  const [editTestados, setEditTestados] = useState("");
  const [editManutEquip, setEditManutEquip] = useState("");
  const [editManutEscada, setEditManutEscada] = useState("");
  const topRef = useRef<HTMLDivElement>(null);

  // Filtro do histórico
  const [filterMode, setFilterMode] = useState<DateFilterMode>("Mes");
  const [filterValue, setFilterValue] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Helper para inputs numéricos sem leading zero
  const handleNumericInput = (value: string, setter: (v: string) => void) => {
    if (value === "") { setter(""); return; }
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed >= 0) setter(String(parsed));
  };

  // Toggle de atividade
  const toggleActivity = (label: string) => {
    setSelectedActivities(prev =>
      prev.includes(label) ? prev.filter(a => a !== label) : [...prev, label]
    );
  };

  // Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!selectedDate) {
      setFormError("Selecione a data de referência.");
      return;
    }

    const isoDate = normalizeDateToISO(selectedDate) || selectedDate;
    const limpos = Number(limposStr) || 0;
    const testados = Number(testadosStr) || 0;
    const manutEquip = Number(manutEquipStr) || 0;
    const manutEscada = Number(manutEscadaStr) || 0;

    const newEntry: ProductionEntry = {
      id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      user_id: currentUser?.id || "unknown",
      user_name: currentUser?.name || "Usuário",
      date: isoDate,
      limpos,
      testados,
      manutencao_equipamento: manutEquip,
      manutencao_escada: manutEscada,
      atividades: selectedActivities,
      outros: outros.trim(),
      created_at: new Date().toISOString(),
    };

    setProductionEntries(prev => [newEntry, ...prev]);

    const dayOfWeek = new Date(isoDate).toLocaleDateString("pt-BR", { weekday: "long" });
    const allActivities = [...selectedActivities];
    if (outros.trim()) allActivities.push(outros.trim());

    setMonitoringData(prev => [
      ...prev,
      {
        data_registro: isoDate,
        dia_da_semana: dayOfWeek,
        funcionario: currentUser?.name || "Usuário",
        limpos,
        testados,
        observacao: allActivities.length > 0 ? `Atividades: ${allActivities.join(", ")}` : undefined,
      },
    ]);

    // Reset form
    setLimposStr("");
    setTestadosStr("");
    setManutEquipStr("");
    setManutEscadaStr("");
    setSelectedActivities([]);
    setOutros("");
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      topRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 2500);
  };

  // Handlers de CRUD
  const handleDelete = (id: string) => {
    if (window.confirm("Deseja realmente excluir este registro?")) {
      deleteProductionEntry(id);
    }
  };

  const openEditModal = (entry: ProductionEntry) => {
    setEditingEntry(entry);
    setEditLimpos(String(entry.limpos || 0));
    setEditTestados(String(entry.testados || 0));
    setEditManutEquip(String(entry.manutencao_equipamento || 0));
    setEditManutEscada(String(entry.manutencao_escada || 0));
  };

  const handleEditSave = () => {
    if (!editingEntry) return;
    updateProductionEntry(editingEntry.id, {
      limpos: Number(editLimpos) || 0,
      testados: Number(editTestados) || 0,
      manutencao_equipamento: Number(editManutEquip) || 0,
      manutencao_escada: Number(editManutEscada) || 0,
    });
    setEditingEntry(null);
  };

  // Filtro dos entries para o histórico (data + busca por nome)
  const filteredEntries = useMemo(() => {
    return productionEntries.filter(entry => {
      const iso = normalizeDateToISO(entry.date);
      const dateOk = isDateMatch(iso || "", filterMode, filterValue);
      const searchOk = !searchTerm || (entry.user_name || "").toUpperCase().includes(searchTerm.toUpperCase());
      return dateOk && searchOk;
    });
  }, [productionEntries, filterMode, filterValue, searchTerm]);

  // KPIs mensais — TODOS os lançamentos do mês
  const monthlyKpis = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const monthEntries = productionEntries.filter(e => {
      const iso = normalizeDateToISO(e.date);
      return iso?.startsWith(currentMonth);
    });

    let totalLimpos = 0;
    let totalTestados = 0;
    monthEntries.forEach(e => {
      totalLimpos += Number(e.limpos) || 0;
      totalTestados += Number(e.testados) || 0;
    });

    return {
      limpos: totalLimpos,
      testados: totalTestados,
      total: totalLimpos + totalTestados,
      entries: monthEntries.length,
    };
  }, [productionEntries]);

  // Display date for header
  const currentMonthDisplay = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-12">
      <div ref={topRef} />
      {/* HEADER */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-950 via-indigo-800 to-violet-500 font-headline tracking-tighter leading-none">
                Produção Diária
              </h1>
              <p className="text-slate-500 text-sm font-medium mt-1">
                Registre sua produção e acompanhe sua performance
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* KPIs DO MÊS ATUAL — Oculto para estagiário */}
      {canViewHistory && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group overflow-hidden relative"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-violet-500" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Mensal</span>
          </div>
          <p className="text-3xl font-black text-slate-800 font-headline tracking-tight">{monthlyKpis.total.toLocaleString()}</p>
          <p className="text-xs text-slate-400 font-medium mt-1 capitalize">{currentMonthDisplay}</p>
        </motion.div>

        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group overflow-hidden relative"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
              <Brush className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Limpos</span>
          </div>
          <p className="text-3xl font-black text-emerald-600 font-headline tracking-tight">{monthlyKpis.limpos.toLocaleString()}</p>
        </motion.div>

        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group overflow-hidden relative"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
              <MonitorCheck className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Testados</span>
          </div>
          <p className="text-3xl font-black text-amber-600 font-headline tracking-tight">{monthlyKpis.testados.toLocaleString()}</p>
        </motion.div>

        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group overflow-hidden relative"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-400 to-purple-500" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-500 group-hover:scale-110 transition-transform">
              <CalendarDays className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Lançamentos</span>
          </div>
          <p className="text-3xl font-black text-violet-600 font-headline tracking-tight">{monthlyKpis.entries}</p>
        </motion.div>
      </div>
      )}

      {/* FORMULÁRIO + HISTÓRICO */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">

        {/* FORMULÁRIO DE LANÇAMENTO */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="xl:col-span-2"
        >
          <div className="bg-white rounded-3xl shadow-[0_4px_25px_-5px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden sticky top-24">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black font-headline tracking-tight">Novo Lançamento</h2>
                  <p className="text-indigo-200 text-xs font-medium">Registre sua produção do dia</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Sucesso */}
              <AnimatePresence>
                {showSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    Produção registrada com sucesso!
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Erro */}
              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                  {formError}
                </div>
              )}

              {/* Data */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                  <CalendarDays className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                  Data de Referência
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                />
              </div>

              {/* Equipamentos */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                    <Brush className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5 text-emerald-500" />
                    Eq. Limpos
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={limposStr}
                    placeholder="0"
                    onChange={(e) => handleNumericInput(e.target.value, setLimposStr)}
                    className="w-full bg-emerald-50/50 border border-emerald-200/60 px-4 py-3.5 rounded-xl text-center text-2xl font-black text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all font-headline placeholder:text-emerald-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                    <MonitorCheck className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5 text-amber-500" />
                    Eq. Testados
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={testadosStr}
                    placeholder="0"
                    onChange={(e) => handleNumericInput(e.target.value, setTestadosStr)}
                    className="w-full bg-amber-50/50 border border-amber-200/60 px-4 py-3.5 rounded-xl text-center text-2xl font-black text-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all font-headline placeholder:text-amber-300"
                  />
                </div>
              </div>

              {/* Manutenções (Novos Campos de Gamificação) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                    <Wrench className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5 text-indigo-500" />
                    Manut. Equip. <span className="text-indigo-400">(+3pts)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={manutEquipStr}
                    placeholder="0"
                    onChange={(e) => handleNumericInput(e.target.value, setManutEquipStr)}
                    className="w-full bg-indigo-50/50 border border-indigo-200/60 px-4 py-3.5 rounded-xl text-center text-2xl font-black text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all font-headline placeholder:text-indigo-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                    <ArrowUpDown className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5 text-cyan-500" />
                    Manut. Escada <span className="text-cyan-400">(+10pts)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={manutEscadaStr}
                    placeholder="0"
                    onChange={(e) => handleNumericInput(e.target.value, setManutEscadaStr)}
                    className="w-full bg-cyan-50/50 border border-cyan-200/60 px-4 py-3.5 rounded-xl text-center text-2xl font-black text-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 transition-all font-headline placeholder:text-cyan-300"
                  />
                </div>
              </div>

              {/* Atividades (Chips) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                  <ListChecks className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                  Atividades Realizadas
                </label>
                <div className="flex flex-wrap gap-2">
                  {ACTIVITY_LABELS.map((label) => (
                    <button
                      type="button"
                      key={label}
                      onClick={() => toggleActivity(label)}
                      className="chip-toggle"
                      data-active={String(selectedActivities.includes(label))}
                    >
                      {selectedActivities.includes(label) && <CheckCircle2 className="w-3 h-3" />}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Outros */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                  <Tag className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                  Outros (Texto Livre)
                </label>
                <input
                  type="text"
                  value={outros}
                  onChange={(e) => setOutros(e.target.value)}
                  placeholder="Descreva atividades não listadas..."
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl font-black font-headline tracking-widest uppercase transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 flex items-center justify-center gap-2 group active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4 group-hover:animate-pulse" />
                Registrar Produção
              </button>
            </form>
          </div>
        </motion.div>

        {/* HISTÓRICO EM CARDS — Oculto para estagiário */}
        {canViewHistory && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="xl:col-span-3"
        >
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-800 font-headline tracking-tight">Histórico de Produção</h2>
                <p className="text-sm text-slate-500 font-medium mt-1">
                  {filteredEntries.length} registro{filteredEntries.length !== 1 ? "s" : ""} encontrado{filteredEntries.length !== 1 ? "s" : ""}
                </p>
              </div>
              <DateFilter
                mode={filterMode}
                value={filterValue}
                onChange={(m, v) => { setFilterMode(m); setFilterValue(v); }}
                className="bg-white/80 backdrop-blur"
              />
            </div>
            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome do colaborador..."
                className="w-full bg-white border border-slate-200 pl-11 pr-4 py-3 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all placeholder:text-slate-400 shadow-sm"
              />
            </div>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 shadow-inner mb-6">
                <ClipboardList className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-headline font-bold text-slate-700 mb-2">Nenhum registro encontrado</h3>
              <p className="text-slate-500 font-medium max-w-sm">
                Utilize o formulário ao lado para registrar sua produção diária.
              </p>
            </div>
          ) : (
            <div className="production-cards-grid">
              {filteredEntries.map((entry, idx) => {
                const allActivities = [...(entry.atividades || [])];
                if (entry.outros) allActivities.push(entry.outros);
                const total = (Number(entry.limpos) || 0) + (Number(entry.testados) || 0);
                const manutEquipVal = Number(entry.manutencao_equipamento) || 0;
                const manutEscadaVal = Number(entry.manutencao_escada) || 0;

                return (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    key={entry.id}
                    className="bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden group"
                  >
                    {/* Card Header */}
                    <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-indigo-500/20">
                          {entry.user_name?.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate group-hover:text-indigo-700 transition-colors">
                            {entry.user_name}
                          </p>
                          <p className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md inline-block">
                            {formatToBR(normalizeDateToISO(entry.date))}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {canEditDelete && (
                          <>
                            <button onClick={() => openEditModal(entry)} className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors" title="Editar">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(entry.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors" title="Deletar">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <div className="text-right ml-1">
                          <p className="text-2xl font-black text-slate-800 font-headline leading-none">{total}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total</p>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="px-5 pb-4">
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-emerald-50 rounded-xl py-2.5 px-3 text-center border border-emerald-100/60">
                          <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-0.5">Limpos</p>
                          <p className="text-lg font-black text-emerald-500">{entry.limpos}</p>
                        </div>
                        <div className="bg-amber-50 rounded-xl py-2.5 px-3 text-center border border-amber-100/60">
                          <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mb-0.5">Testados</p>
                          <p className="text-lg font-black text-amber-500">{entry.testados}</p>
                        </div>
                      </div>

                      {/* Maintenance Stats */}
                      {(manutEquipVal > 0 || manutEscadaVal > 0) && (
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="bg-indigo-50 rounded-xl py-2 px-3 text-center border border-indigo-100/60">
                            <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest mb-0.5">Manut. Equip.</p>
                            <p className="text-base font-black text-indigo-500">{manutEquipVal}</p>
                          </div>
                          <div className="bg-cyan-50 rounded-xl py-2 px-3 text-center border border-cyan-100/60">
                            <p className="text-[9px] font-bold text-cyan-600 uppercase tracking-widest mb-0.5">Manut. Escada</p>
                            <p className="text-base font-black text-cyan-500">{manutEscadaVal}</p>
                          </div>
                        </div>
                      )}

                      {/* Atividades */}
                      {allActivities.length > 0 && (
                        <div className="border-t border-slate-100 pt-3">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Atividades</p>
                          <div className="flex flex-wrap gap-1.5">
                            {allActivities.map((act, i) => (
                              <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-bold border border-slate-100">
                                <ListChecks className="w-2.5 h-2.5 text-indigo-400" />
                                {act}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
        )}
      </div>

      {/* MODAL DE EDIÇÃO */}
      <AnimatePresence>
        {editingEntry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setEditingEntry(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden"
            >
              <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-5 text-white flex items-center justify-between">
                <h3 className="text-lg font-black font-headline">Editar Lançamento</h3>
                <button onClick={() => setEditingEntry(null)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-500 font-bold">{editingEntry.user_name} — {formatToBR(normalizeDateToISO(editingEntry.date))}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Limpos</label>
                    <input type="number" min={0} value={editLimpos} onChange={(e) => handleNumericInput(e.target.value, setEditLimpos)} className="w-full bg-emerald-50/50 border border-emerald-200/60 px-3 py-2.5 rounded-xl text-center text-xl font-black text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-headline" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Testados</label>
                    <input type="number" min={0} value={editTestados} onChange={(e) => handleNumericInput(e.target.value, setEditTestados)} className="w-full bg-amber-50/50 border border-amber-200/60 px-3 py-2.5 rounded-xl text-center text-xl font-black text-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-headline" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Manut. Equip.</label>
                    <input type="number" min={0} value={editManutEquip} onChange={(e) => handleNumericInput(e.target.value, setEditManutEquip)} className="w-full bg-indigo-50/50 border border-indigo-200/60 px-3 py-2.5 rounded-xl text-center text-xl font-black text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-headline" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Manut. Escada</label>
                    <input type="number" min={0} value={editManutEscada} onChange={(e) => handleNumericInput(e.target.value, setEditManutEscada)} className="w-full bg-cyan-50/50 border border-cyan-200/60 px-3 py-2.5 rounded-xl text-center text-xl font-black text-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 font-headline" />
                  </div>
                </div>
                <button onClick={handleEditSave} className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl font-black font-headline tracking-widest uppercase transition-all shadow-lg flex items-center justify-center gap-2 active:scale-[0.98]">
                  <CheckCircle2 className="w-4 h-4" /> Salvar Alterações
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Overlay de Sucesso */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-8 py-4 rounded-2xl shadow-2xl shadow-emerald-600/30 flex items-center gap-3 font-bold"
          >
            <CheckCircle2 className="w-6 h-6" />
            <span>Lançamento realizado com sucesso!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
