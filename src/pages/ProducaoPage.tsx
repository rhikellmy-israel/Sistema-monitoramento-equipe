import React, { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { normalizeDisplayName } from "../lib/nameAliasMap";
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
  Search,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { useData } from "../context/DataContext";
import { ProductionEntry, FONT_MODELS, FONTE_DISCARD_REASONS, FonteDiscardReason, FonteModelData } from "../types";
import DateFilter from "../components/DateFilter";
import Pagination from "../components/Pagination";
import { DateFilterMode, isDateMatch, formatToBR, normalizeDateToISO } from "../lib/dateUtils";
import AnimatedCounter from "../components/AnimatedCounter";

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
  "Manutenções",
];

interface FontModelState {
  aprovadas: string;
  descartadas: string;
  motivos: Record<FonteDiscardReason, string>;
}

const createEmptyFontModelState = (): FontModelState => ({
  aprovadas: "",
  descartadas: "",
  motivos: {
    "SUJA": "",
    "MUITA TINTA": "",
    "QUEIMADA": "",
    "DESCASCADA": "",
    "AVARIAS": "",
  },
});

export default function ProducaoPage() {
  const { currentUser, productionEntries, setProductionEntries, addProductionEntry, deleteProductionEntry, updateProductionEntry, users } = useData();

  // RBAC
  const isEstagiario = currentUser?.role === "estagiario_teste";
  const canViewHistory = true; // Estagiários podem visualizar, mas não editar/excluir
  const canEditDelete = currentUser?.role === "admin" || currentUser?.role === "viewer";

  // Seletor do tipo de relatório
  const [reportType, setReportType] = useState<"equipamentos" | "fontes">("equipamentos");

  // Formulário — Equipamentos (strings para evitar leading zero bug)
  const [limposStr, setLimposStr] = useState("");
  const [testadosStr, setTestadosStr] = useState("");
  const [manutEquipStr, setManutEquipStr] = useState("");
  const [manutEscadaStr, setManutEscadaStr] = useState("");
  const [selectedExtraActivities, setSelectedExtraActivities] = useState<string[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [outros, setOutros] = useState("");

  // Formulário — Fontes por Modelo
  const [fontModelInputs, setFontModelInputs] = useState<Record<string, FontModelState>>(() => {
    const initial: Record<string, FontModelState> = {};
    FONT_MODELS.forEach(model => {
      initial[model] = createEmptyFontModelState();
    });
    return initial;
  });

  // Formulário — Fontes Aleatórias (último item da lista)
  const [randomFontModelName, setRandomFontModelName] = useState("");
  const [randomFontInputs, setRandomFontInputs] = useState<FontModelState>(createEmptyFontModelState);

  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Edit
  const [searchTerm, setSearchTerm] = useState("");
  const [editingEntry, setEditingEntry] = useState<ProductionEntry | null>(null);
  const [editLimpos, setEditLimpos] = useState("");
  const [editTestados, setEditTestados] = useState("");
  const [editManutEquip, setEditManutEquip] = useState("");
  const [editManutEscada, setEditManutEscada] = useState("");
  const [editFontesAprovadas, setEditFontesAprovadas] = useState("");
  const [editFontesDescarte, setEditFontesDescarte] = useState("");
  const [editExtraActivities, setEditExtraActivities] = useState<string[]>([]);
  const topRef = useRef<HTMLDivElement>(null);

  // Filtro do histórico
  const [filterMode, setFilterMode] = useState<DateFilterMode>("Mes");
  const [filterValue, setFilterValue] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Pagination
  const [historyPage, setHistoryPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  // Reset page on filter change
  useEffect(() => { setHistoryPage(1); }, [filterMode, filterValue, searchTerm]);

  // Lock body scroll when edit modal is open
  useEffect(() => {
    if (editingEntry) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [editingEntry]);

  // Helper para inputs numéricos sem leading zero
  const handleNumericInput = (value: string, setter: (v: string) => void) => {
    if (value === "") { setter(""); return; }
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed >= 0) setter(String(parsed));
  };

  // Helper para inputs de fontes por modelo (Aprovadas / Descartadas)
  const handleFontModelInput = (model: string, field: "aprovadas" | "descartadas", val: string, isRandom = false) => {
    let parsedVal = "";
    if (val !== "") {
      const p = parseInt(val, 10);
      if (!isNaN(p) && p >= 0) parsedVal = String(p);
    }
    if (isRandom) {
      setRandomFontInputs(prev => ({
        ...prev,
        [field]: parsedVal,
      }));
    } else {
      setFontModelInputs(prev => ({
        ...prev,
        [model]: {
          ...(prev[model] || createEmptyFontModelState()),
          [field]: parsedVal,
        },
      }));
    }
  };

  // Helper para incremento / decremento nos cards de motivos de descarte
  const handleReasonDelta = (model: string, reason: FonteDiscardReason, delta: number, isRandom = false) => {
    if (isRandom) {
      setRandomFontInputs(prev => {
        const current = Number(prev.motivos[reason]) || 0;
        const updated = Math.max(0, current + delta);
        return {
          ...prev,
          motivos: {
            ...prev.motivos,
            [reason]: updated === 0 ? "" : String(updated),
          },
        };
      });
    } else {
      setFontModelInputs(prev => {
        const currentModel = prev[model] || createEmptyFontModelState();
        const current = Number(currentModel.motivos[reason]) || 0;
        const updated = Math.max(0, current + delta);
        return {
          ...prev,
          [model]: {
            ...currentModel,
            motivos: {
              ...currentModel.motivos,
              [reason]: updated === 0 ? "" : String(updated),
            },
          },
        };
      });
    }
  };

  // Helper para digitação direta nos cards de motivos de descarte
  const handleReasonInput = (model: string, reason: FonteDiscardReason, val: string, isRandom = false) => {
    let parsedVal = "";
    if (val !== "") {
      const p = parseInt(val, 10);
      if (!isNaN(p) && p >= 0) parsedVal = String(p);
    }
    if (isRandom) {
      setRandomFontInputs(prev => ({
        ...prev,
        motivos: {
          ...prev.motivos,
          [reason]: parsedVal,
        },
      }));
    } else {
      setFontModelInputs(prev => ({
        ...prev,
        [model]: {
          ...(prev[model] || createEmptyFontModelState()),
          motivos: {
            ...(prev[model]?.motivos || createEmptyFontModelState().motivos),
            [reason]: parsedVal,
          },
        },
      }));
    }
  };

  // Toggle de atividade
  const toggleActivity = (label: string) => {
    setSelectedActivities(prev =>
      prev.includes(label) ? prev.filter(a => a !== label) : [...prev, label]
    );
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (isSubmitting) return; // Bloqueia duplo clique

    if (!selectedDate) {
      setFormError("Selecione a data de referência.");
      return;
    }

    const isoDate = normalizeDateToISO(selectedDate) || selectedDate;
    const currentUserId = currentUser?.id || "unknown";
    const currentUserName = currentUser?.name || "Usuário";

    setIsSubmitting(true);

    let newEntry: ProductionEntry;

    if (reportType === "equipamentos") {
      const limpos = Number(limposStr) || 0;
      const testados = Number(testadosStr) || 0;
      const manutEquip = Number(manutEquipStr) || 0;
      const manutEscada = Number(manutEscadaStr) || 0;

      newEntry = {
        id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        user_id: currentUserId,
        user_name: currentUserName,
        date: isoDate,
        limpos,
        testados,
        manutencao_equipamento: manutEquip,
        manutencao_escada: manutEscada,
        tipo_relatorio: "equipamentos",
        atividades_extras: selectedExtraActivities,
        atividades: selectedActivities,
        outros: outros.trim(),
        created_at: new Date().toISOString(),
      };
    } else {
      // Produção de Fontes por modelo (com validação de motivos de descarte e fontes aleatórias)
      let totalAprovadas = 0;
      let totalDescarte = 0;
      const fontesModelosObj: Record<string, FonteModelData> = {};

      // 1. Validar e processar modelos padrão
      for (const model of FONT_MODELS) {
        const item = fontModelInputs[model] || createEmptyFontModelState();
        const apr = Number(item.aprovadas) || 0;
        const desc = Number(item.descartadas) || 0;

        if (apr > 0 || desc > 0) {
          const sumMotivos = FONTE_DISCARD_REASONS.reduce((acc, r) => acc + (Number(item.motivos[r]) || 0), 0);

          // Validação: soma dos motivos não pode ultrapassar descartadas
          if (sumMotivos > desc) {
            setFormError(`A soma dos motivos (${sumMotivos}) no modelo "${model}" ultrapassa o total de fontes descartadas (${desc}). Corrija os valores para salvar.`);
            setIsSubmitting(false);
            return;
          }

          // Validação: fontes descartadas sem motivo
          if (desc > 0 && sumMotivos < desc) {
            setFormError(`Existem ${desc - sumMotivos} fonte(s) descartada(s) sem motivo informado no modelo "${model}". Complete a distribuição dos motivos.`);
            setIsSubmitting(false);
            return;
          }

          const motivosObj: Partial<Record<FonteDiscardReason, number>> = {};
          FONTE_DISCARD_REASONS.forEach(r => {
            const v = Number(item.motivos[r]) || 0;
            if (v > 0) motivosObj[r] = v;
          });

          fontesModelosObj[model] = {
            aprovadas: apr,
            descartadas: desc,
            motivos: motivosObj,
          };
          totalAprovadas += apr;
          totalDescarte += desc;
        }
      }

      // 2. Validar e processar "FONTES ALEATÓRIAS"
      const rApr = Number(randomFontInputs.aprovadas) || 0;
      const rDesc = Number(randomFontInputs.descartadas) || 0;
      if (rApr > 0 || rDesc > 0) {
        const trimmedName = randomFontModelName.trim();
        if (!trimmedName) {
          setFormError("Informe o nome/modelo da fonte no campo 'Fontes Aleatórias'.");
          setIsSubmitting(false);
          return;
        }

        const sumMotivos = FONTE_DISCARD_REASONS.reduce((acc, r) => acc + (Number(randomFontInputs.motivos[r]) || 0), 0);

        if (sumMotivos > rDesc) {
          setFormError(`A soma dos motivos (${sumMotivos}) em Fontes Aleatórias ("${trimmedName}") ultrapassa o total descartado (${rDesc}).`);
          setIsSubmitting(false);
          return;
        }

        if (rDesc > 0 && sumMotivos < rDesc) {
          setFormError(`Existem ${rDesc - sumMotivos} fonte(s) descartada(s) sem motivo informado em Fontes Aleatórias ("${trimmedName}").`);
          setIsSubmitting(false);
          return;
        }

        const motivosObj: Partial<Record<FonteDiscardReason, number>> = {};
        FONTE_DISCARD_REASONS.forEach(r => {
          const v = Number(randomFontInputs.motivos[r]) || 0;
          if (v > 0) motivosObj[r] = v;
        });

        const customKey = trimmedName.toUpperCase();
        fontesModelosObj[customKey] = {
          aprovadas: rApr,
          descartadas: rDesc,
          motivos: motivosObj,
          isCustom: true,
          customName: trimmedName,
        };
        totalAprovadas += rApr;
        totalDescarte += rDesc;
      }

      if (totalAprovadas === 0 && totalDescarte === 0) {
        setFormError("Informe a quantidade testada (Aprovadas ou Descartadas) em pelo menos um modelo de fonte.");
        setIsSubmitting(false);
        return;
      }

      newEntry = {
        id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        user_id: currentUserId,
        user_name: currentUserName,
        date: isoDate,
        limpos: 0,
        testados: 0,
        manutencao_equipamento: 0,
        manutencao_escada: 0,
        tipo_relatorio: "fontes",
        fontes_modelos: fontesModelosObj,
        fontes_aprovadas: totalAprovadas,
        fontes_descarte: totalDescarte,
        atividades_extras: [],
        atividades: ["Teste de fontes"],
        outros: "",
        created_at: new Date().toISOString(),
      };
    }

    // Gravação segura via banco de dados com merge atômico
    const savedSuccess = await addProductionEntry(newEntry);

    if (!savedSuccess) {
      setFormError("Falha de conexão com o banco de dados. O relatório não pôde ser gravado. Por favor, tente novamente.");
      setIsSubmitting(false);
      return;
    }

    // Reset form
    if (reportType === "equipamentos") {
      setLimposStr("");
      setTestadosStr("");
      setManutEquipStr("");
      setManutEscadaStr("");
      setSelectedExtraActivities([]);
      setSelectedActivities([]);
      setOutros("");
    } else {
      const resetInputs: Record<string, FontModelState> = {};
      FONT_MODELS.forEach(m => { resetInputs[m] = createEmptyFontModelState(); });
      setFontModelInputs(resetInputs);
      setRandomFontModelName("");
      setRandomFontInputs(createEmptyFontModelState());
    }

    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setIsSubmitting(false);
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
    setEditFontesAprovadas(String(entry.fontes_aprovadas || 0));
    setEditFontesDescarte(String(entry.fontes_descarte || 0));
    setEditExtraActivities(entry.atividades_extras || []);
  };

  const handleEditSave = () => {
    if (!editingEntry) return;
    updateProductionEntry(editingEntry.id, {
      limpos: Number(editLimpos) || 0,
      testados: Number(editTestados) || 0,
      manutencao_equipamento: Number(editManutEquip) || 0,
      manutencao_escada: Number(editManutEscada) || 0,
      fontes_aprovadas: Number(editFontesAprovadas) || 0,
      fontes_descarte: Number(editFontesDescarte) || 0,
      atividades_extras: editExtraActivities,
    });
    setEditingEntry(null);
  };

  // Filtro dos entries para o histórico (data + busca por nome)
  const filteredEntries = useMemo(() => {
    return productionEntries
      .map(entry => ({
        ...entry,
        user_name: normalizeDisplayName(entry.user_name || ""),
      }))
      .filter(entry => {
        const iso = normalizeDateToISO(entry.date);
        const dateOk = isDateMatch(iso || "", filterMode, filterValue);
        const searchOk = !searchTerm || (entry.user_name || "").toUpperCase().includes(searchTerm.toUpperCase());
        return dateOk && searchOk;
      });
  }, [productionEntries, filterMode, filterValue, searchTerm]);

  // KPIs baseados nos registros filtrados da tela
  const monthlyKpis = useMemo(() => {
    let totalLimpos = 0;
    let totalTestados = 0;
    filteredEntries.forEach(e => {
      totalLimpos += Number(e.limpos) || 0;
      totalTestados += Number(e.testados) || 0;
    });

    return {
      limpos: totalLimpos,
      testados: totalTestados,
      total: totalLimpos + totalTestados,
      entries: filteredEntries.length,
    };
  }, [filteredEntries]);

  // Display date/period for card dynamically
  const filterLabelDisplay = useMemo(() => {
    if (filterMode === "Todas") return "Todo o Histórico";
    if (filterMode === "Dia") {
      const parts = filterValue.split("-");
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return filterValue;
    }
    if (filterMode === "Mes") {
      const parts = filterValue.split("-");
      if (parts.length === 2) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
        return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      }
      return filterValue;
    }
    if (filterMode === "Ano") return `Ano de ${filterValue}`;
    return filterValue;
  }, [filterMode, filterValue]);

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
              <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-950 via-indigo-800 to-brand-orange font-headline tracking-tighter leading-none">
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
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-violet-500" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {filterMode === "Mes" ? "Total Mensal" : filterMode === "Dia" ? "Total Diário" : filterMode === "Ano" ? "Total Anual" : filterMode === "Todas" ? "Total Período" : "Total Filtrado"}
            </span>
          </div>
          <p className="text-3xl font-black text-slate-800 font-headline tracking-tight"><AnimatedCounter value={monthlyKpis.total} /></p>
          <p className="text-xs text-slate-400 font-medium mt-1 capitalize">{filterLabelDisplay}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
              <Brush className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Limpos</span>
          </div>
          <p className="text-3xl font-black text-emerald-600 font-headline tracking-tight"><AnimatedCounter value={monthlyKpis.limpos} /></p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
              <MonitorCheck className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Testados</span>
          </div>
          <p className="text-3xl font-black text-amber-600 font-headline tracking-tight"><AnimatedCounter value={monthlyKpis.testados} /></p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-400 to-purple-500" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-500 group-hover:scale-110 transition-transform">
              <CalendarDays className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Lançamentos</span>
          </div>
          <p className="text-3xl font-black text-violet-600 font-headline tracking-tight"><AnimatedCounter value={monthlyKpis.entries} /></p>
        </div>
      </div>
      )}

      {/* FORMULÁRIO + HISTÓRICO */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 lg:gap-8">

        {/* FORMULÁRIO DE LANÇAMENTO */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-3xl shadow-[0_4px_25px_-5px_rgba(0,0,0,0.06)] border border-slate-100 xl:sticky xl:top-24">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white rounded-t-3xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black font-headline tracking-tight">
                    {reportType === "equipamentos" ? "Novo Lançamento - Equipamentos" : "Novo Lançamento - Fontes"}
                  </h2>
                  <p className="text-indigo-200 text-xs font-medium">Registre sua produção do dia</p>
                </div>
              </div>

              {/* Botão Seletor de Tipo de Relatório */}
              <div className="flex bg-indigo-950/40 p-1 rounded-xl border border-white/10 backdrop-blur-xs">
                <button
                  type="button"
                  onClick={() => { setReportType("equipamentos"); setFormError(""); }}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5",
                    reportType === "equipamentos"
                      ? "bg-white text-indigo-700 shadow-md"
                      : "text-indigo-200 hover:text-white"
                  )}
                >
                  <Wrench className="w-3.5 h-3.5" /> Equipamentos
                </button>
                <button
                  type="button"
                  onClick={() => { setReportType("fontes"); setFormError(""); }}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5",
                    reportType === "fontes"
                      ? "bg-white text-indigo-700 shadow-md"
                      : "text-indigo-200 hover:text-white"
                  )}
                >
                  <Zap className="w-3.5 h-3.5" /> Produção de Fontes
                </button>
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

              {/* Data de Referência (Comum a ambos) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                  <CalendarDays className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                  Data de Referência
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 appearance-none"
                />
              </div>

              {reportType === "equipamentos" ? (
                <>
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
                        className="w-full bg-emerald-50 border border-emerald-200 px-4 py-3.5 rounded-xl text-center text-2xl font-black text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 font-headline placeholder:text-emerald-300 appearance-none"
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
                        className="w-full bg-amber-50 border border-amber-200 px-4 py-3.5 rounded-xl text-center text-2xl font-black text-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 font-headline placeholder:text-amber-300 appearance-none"
                      />
                    </div>
                  </div>

                  {/* Manutenções */}
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
                        className="w-full bg-indigo-50 border border-indigo-200 px-4 py-3.5 rounded-xl text-center text-2xl font-black text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 font-headline placeholder:text-indigo-300 appearance-none"
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
                        className="w-full bg-cyan-50 border border-cyan-200 px-4 py-3.5 rounded-xl text-center text-2xl font-black text-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 font-headline placeholder:text-cyan-300 appearance-none"
                      />
                    </div>
                  </div>

                  {/* Atividades Extras (Checkboxes / Multi-select) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                      <Sparkles className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5 text-brand-orange" />
                      Atividades Extras do Dia
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { key: "Sucata", label: "Sucata", pts: "+30 pts" },
                        { key: "Conserto Minas", label: "Conserto Minas", pts: "+30 pts" },
                        { key: "RMA", label: "RMA", pts: "+40 pts" }
                      ].map((act) => {
                        const isSelected = selectedExtraActivities.includes(act.key);
                        return (
                          <button
                            type="button"
                            key={act.key}
                            onClick={() => {
                              setSelectedExtraActivities(prev =>
                                prev.includes(act.key) ? prev.filter(a => a !== act.key) : [...prev, act.key]
                              );
                            }}
                            className={cn(
                              "flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer select-none",
                              isSelected
                                ? "bg-gradient-to-br from-indigo-500 to-violet-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20"
                                : "bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-50"
                            )}
                          >
                            <span className="text-xs font-black">{act.label}</span>
                            <span className={cn("text-[9px] font-bold mt-1 px-1.5 py-0.5 rounded", isSelected ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-600")}>
                              {act.pts}
                            </span>
                          </button>
                        );
                      })}
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
                </>
              ) : (
                /* RELATÓRIO DE PRODUÇÃO DE FONTES POR MODELO */
                <div className="space-y-5 max-h-[540px] overflow-y-auto custom-scrollbar pr-1">
                  <div className="bg-indigo-50/80 border border-indigo-100 rounded-2xl p-3.5 text-xs text-indigo-900 font-medium leading-relaxed">
                    <strong>Lançamento por Modelo:</strong> Informe as quantidades aprovadas e descartadas. Para as fontes descartadas, <strong>distribua as quantidades entre os motivos de descarte</strong> nos cards abaixo de cada modelo. Cada fonte aprovada soma <strong>+0,5 pt</strong>.
                  </div>

                  {/* Modelos Pré-Cadastrados */}
                  {FONT_MODELS.map((model) => {
                    const item = fontModelInputs[model] || createEmptyFontModelState();
                    const descCount = Number(item.descartadas) || 0;
                    const sumMotivos = FONTE_DISCARD_REASONS.reduce((acc, r) => acc + (Number(item.motivos[r]) || 0), 0);
                    const hasMismatch = descCount > 0 && sumMotivos !== descCount;
                    const isExceeded = sumMotivos > descCount;

                    return (
                      <div key={model} className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 space-y-3.5 hover:border-indigo-300 transition-all shadow-xs">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="text-xs font-black text-slate-800 font-headline uppercase tracking-tight">{model}</span>
                          <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">+0.5 PT / Aprov</span>
                        </div>

                        {/* Aprovadas & Descartadas */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-1">
                              <CheckCircle2 className="w-3 h-3 inline mr-1 -mt-0.5 text-emerald-500" />
                              Aprovadas
                            </label>
                            <input
                              type="number"
                              min={0}
                              placeholder="0"
                              value={item.aprovadas}
                              onChange={(e) => handleFontModelInput(model, "aprovadas", e.target.value)}
                              className="w-full bg-emerald-50 border border-emerald-200 px-3 py-2.5 rounded-xl text-center text-xl font-black text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-headline placeholder:text-emerald-300"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-rose-600 uppercase tracking-widest mb-1">
                              <Trash2 className="w-3 h-3 inline mr-1 -mt-0.5 text-rose-500" />
                              Descartadas
                            </label>
                            <input
                              type="number"
                              min={0}
                              placeholder="0"
                              value={item.descartadas}
                              onChange={(e) => handleFontModelInput(model, "descartadas", e.target.value)}
                              className="w-full bg-rose-50 border border-rose-200 px-3 py-2.5 rounded-xl text-center text-xl font-black text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-headline placeholder:text-rose-300"
                            />
                          </div>
                        </div>

                        {/* Motivos de Descarte (Cards com Incremento / Decremento) */}
                        <div className="pt-2 border-t border-slate-200/70">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Motivos do Descarte
                            </span>
                            {descCount > 0 && (
                              <span className={cn(
                                "text-[9px] font-bold px-2 py-0.5 rounded-md",
                                isExceeded
                                  ? "bg-rose-100 text-rose-700 border border-rose-200"
                                  : sumMotivos === descCount
                                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                  : "bg-amber-100 text-amber-700 border border-amber-200"
                              )}>
                                {isExceeded
                                  ? `Ultrapassou (+${sumMotivos - descCount})`
                                  : sumMotivos === descCount
                                  ? `Motivos 100% informados (${sumMotivos}/${descCount})`
                                  : `Faltam ${descCount - sumMotivos} motivo(s)`}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {FONTE_DISCARD_REASONS.map((reason) => {
                              const val = Number(item.motivos[reason]) || 0;
                              return (
                                <div
                                  key={reason}
                                  className={cn(
                                    "p-2 rounded-xl border transition-all flex flex-col items-center justify-between",
                                    val > 0
                                      ? "bg-indigo-50/70 border-indigo-200 text-indigo-900 shadow-xs"
                                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                  )}
                                >
                                  <span className="text-[9px] font-extrabold uppercase tracking-tight text-center truncate w-full mb-1" title={reason}>
                                    {reason}
                                  </span>
                                  <div className="flex items-center gap-1 w-full justify-center">
                                    <button
                                      type="button"
                                      onClick={() => handleReasonDelta(model, reason, -1)}
                                      className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                                      title="Diminuir"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min={0}
                                      value={item.motivos[reason] || ""}
                                      placeholder="0"
                                      onChange={(e) => handleReasonInput(model, reason, e.target.value)}
                                      className="w-9 py-0.5 text-center text-xs font-black text-slate-800 bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleReasonDelta(model, reason, 1)}
                                      className="w-6 h-6 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-black text-xs flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                                      title="Aumentar"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* FONTES ALEATÓRIAS — Último item da relação */}
                  {(() => {
                    const rDescCount = Number(randomFontInputs.descartadas) || 0;
                    const rSumMotivos = FONTE_DISCARD_REASONS.reduce((acc, r) => acc + (Number(randomFontInputs.motivos[r]) || 0), 0);
                    const rExceeded = rSumMotivos > rDescCount;

                    return (
                      <div className="bg-gradient-to-br from-indigo-50/70 via-purple-50/50 to-white border-2 border-dashed border-indigo-300/80 rounded-2xl p-4 space-y-3.5 shadow-xs">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-indigo-600" />
                            <span className="text-xs font-black text-indigo-950 font-headline uppercase tracking-tight">
                              FONTES ALEATÓRIAS
                            </span>
                          </div>
                          <span className="text-[9px] font-bold text-indigo-600 bg-indigo-100/60 px-2 py-0.5 rounded-md border border-indigo-200">
                            Modelo Customizado (+0.5 PT / Aprov)
                          </span>
                        </div>

                        {/* Input do Nome/Modelo Customizado */}
                        <div>
                          <label className="block text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1">
                            Nome / Modelo da Fonte:
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: FONTE INTELBRAS 12V 1.0A"
                            value={randomFontModelName}
                            onChange={(e) => setRandomFontModelName(e.target.value)}
                            className="w-full bg-white border border-indigo-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 uppercase"
                          />
                        </div>

                        {/* Aprovadas & Descartadas */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-1">
                              <CheckCircle2 className="w-3 h-3 inline mr-1 -mt-0.5 text-emerald-500" />
                              Aprovadas
                            </label>
                            <input
                              type="number"
                              min={0}
                              placeholder="0"
                              value={randomFontInputs.aprovadas}
                              onChange={(e) => handleFontModelInput("", "aprovadas", e.target.value, true)}
                              className="w-full bg-emerald-50 border border-emerald-200 px-3 py-2.5 rounded-xl text-center text-xl font-black text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-headline placeholder:text-emerald-300"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-rose-600 uppercase tracking-widest mb-1">
                              <Trash2 className="w-3 h-3 inline mr-1 -mt-0.5 text-rose-500" />
                              Descartadas
                            </label>
                            <input
                              type="number"
                              min={0}
                              placeholder="0"
                              value={randomFontInputs.descartadas}
                              onChange={(e) => handleFontModelInput("", "descartadas", e.target.value, true)}
                              className="w-full bg-rose-50 border border-rose-200 px-3 py-2.5 rounded-xl text-center text-xl font-black text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-headline placeholder:text-rose-300"
                            />
                          </div>
                        </div>

                        {/* Motivos de Descarte para Fontes Aleatórias */}
                        <div className="pt-2 border-t border-indigo-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Motivos do Descarte (Fontes Aleatórias)
                            </span>
                            {rDescCount > 0 && (
                              <span className={cn(
                                "text-[9px] font-bold px-2 py-0.5 rounded-md",
                                rExceeded
                                  ? "bg-rose-100 text-rose-700 border border-rose-200"
                                  : rSumMotivos === rDescCount
                                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                  : "bg-amber-100 text-amber-700 border border-amber-200"
                              )}>
                                {rExceeded
                                  ? `Ultrapassou (+${rSumMotivos - rDescCount})`
                                  : rSumMotivos === rDescCount
                                  ? `Motivos 100% informados (${rSumMotivos}/${rDescCount})`
                                  : `Faltam ${rDescCount - rSumMotivos} motivo(s)`}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {FONTE_DISCARD_REASONS.map((reason) => {
                              const val = Number(randomFontInputs.motivos[reason]) || 0;
                              return (
                                <div
                                  key={reason}
                                  className={cn(
                                    "p-2 rounded-xl border transition-all flex flex-col items-center justify-between",
                                    val > 0
                                      ? "bg-indigo-100/70 border-indigo-300 text-indigo-900 shadow-xs"
                                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                  )}
                                >
                                  <span className="text-[9px] font-extrabold uppercase tracking-tight text-center truncate w-full mb-1" title={reason}>
                                    {reason}
                                  </span>
                                  <div className="flex items-center gap-1 w-full justify-center">
                                    <button
                                      type="button"
                                      onClick={() => handleReasonDelta("", reason, -1, true)}
                                      className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                                      title="Diminuir"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min={0}
                                      value={randomFontInputs.motivos[reason] || ""}
                                      placeholder="0"
                                      onChange={(e) => handleReasonInput("", reason, e.target.value, true)}
                                      className="w-9 py-0.5 text-center text-xs font-black text-slate-800 bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleReasonDelta("", reason, 1, true)}
                                      className="w-6 h-6 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-black text-xs flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                                      title="Aumentar"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-4 rounded-xl font-black font-headline tracking-widest uppercase transition-all flex items-center justify-center gap-2 group ${
                  isSubmitting
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                    : "bg-gradient-to-r from-indigo-600 via-indigo-700 to-brand-orange hover:from-indigo-700 hover:to-brand-orange text-white shadow-lg shadow-indigo-600/20 hover:shadow-brand-orange/30 active:scale-[0.98]"
                }`}
              >
                <Sparkles className={`w-4 h-4 ${isSubmitting ? "animate-spin" : "group-hover:animate-pulse"}`} />
                {isSubmitting ? "Salvando..." : "Registrar Produção"}
              </button>
            </form>
          </div>
        </div>

        {/* HISTÓRICO EM CARDS — Oculto para estagiário */}
        {canViewHistory && (
        <div className="xl:col-span-3">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="shrink-0">
                <h2 className="text-2xl font-black text-slate-800 font-headline tracking-tight">Histórico de Produção</h2>
                <p className="text-sm text-slate-500 font-medium mt-1">
                  {filteredEntries.length} registro{filteredEntries.length !== 1 ? "s" : ""} encontrado{filteredEntries.length !== 1 ? "s" : ""}
                </p>
              </div>
              <DateFilter
                mode={filterMode}
                value={filterValue}
                onChange={(m, v) => { setFilterMode(m); setFilterValue(v); }}
                className="bg-white"
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
            <>
            <div className="production-cards-grid">
              {filteredEntries.slice((historyPage - 1) * ITEMS_PER_PAGE, historyPage * ITEMS_PER_PAGE).map((entry, idx) => {
                const allActivities = [...(entry.atividades || [])];
                if (entry.outros) allActivities.push(entry.outros);
                const total = (Number(entry.limpos) || 0) + (Number(entry.testados) || 0);
                const manutEquipVal = Number(entry.manutencao_equipamento) || 0;
                const manutEscadaVal = Number(entry.manutencao_escada) || 0;
                const fontesAprovadasVal = Number(entry.fontes_aprovadas) || 0;
                const fontesDescarteVal = Number(entry.fontes_descarte) || 0;
                const extraActivities = entry.atividades_extras || [];

                // Cálculo dos pontos conquistados no dia
                let dayPoints = (Number(entry.limpos) || 0) * 3 + (Number(entry.testados) || 0) * 1;
                dayPoints += manutEquipVal * 3 + manutEscadaVal * 10;
                dayPoints += fontesAprovadasVal * 0.5;
                extraActivities.forEach(act => {
                  if (act === "Sucata") dayPoints += 30;
                  if (act === "Conserto Minas") dayPoints += 30;
                  if (act === "RMA") dayPoints += 40;
                });
                dayPoints = Math.round(dayPoints * 100) / 100;

                return (
                  <div
                    key={entry.id}
                    className="bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
                  >
                    {/* Card Header */}
                    <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {(() => {
                          const userWithPhoto = users.find(u => u.name.trim().toLowerCase() === entry.user_name?.trim().toLowerCase());
                          return userWithPhoto?.photoUrl ? (
                            <img src={userWithPhoto.photoUrl} alt={entry.user_name} className="w-10 h-10 rounded-full object-cover shadow-md border border-indigo-200" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-indigo-500/20">
                              {entry.user_name?.substring(0, 2).toUpperCase()}
                            </div>
                          );
                        })()}
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
                          <p className="text-[10px] font-extrabold text-indigo-600 mt-0.5 leading-none">{dayPoints} PTS</p>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="px-5 pb-4">
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-emerald-50 rounded-xl py-2.5 px-3 text-center border border-emerald-100">
                          <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-0.5">Limpos</p>
                          <p className="text-lg font-black text-emerald-500">{entry.limpos}</p>
                        </div>
                        <div className="bg-amber-50 rounded-xl py-2.5 px-3 text-center border border-amber-100">
                          <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mb-0.5">Testados</p>
                          <p className="text-lg font-black text-amber-500">{entry.testados}</p>
                        </div>
                      </div>

                      {/* Maintenance Stats */}
                      {(manutEquipVal > 0 || manutEscadaVal > 0) && (
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="bg-indigo-50 rounded-xl py-2 px-3 text-center border border-indigo-100">
                            <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest mb-0.5">Manut. Equip.</p>
                            <p className="text-base font-black text-indigo-500">{manutEquipVal}</p>
                          </div>
                          <div className="bg-cyan-50 rounded-xl py-2 px-3 text-center border border-cyan-100">
                            <p className="text-[9px] font-bold text-cyan-600 uppercase tracking-widest mb-0.5">Manut. Escada</p>
                            <p className="text-base font-black text-cyan-500">{manutEscadaVal}</p>
                          </div>
                        </div>
                      )}

                      {/* Fontes Stats */}
                      {(fontesAprovadasVal > 0 || fontesDescarteVal > 0) && (
                        <div className="space-y-2 mb-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-indigo-50 rounded-xl py-2 px-3 text-center border border-indigo-100">
                              <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest mb-0.5">Fontes Aprov.</p>
                              <p className="text-base font-black text-indigo-500">{fontesAprovadasVal}</p>
                            </div>
                            <div className="bg-rose-50 rounded-xl py-2 px-3 text-center border border-rose-100">
                              <p className="text-[9px] font-bold text-rose-600 uppercase tracking-widest mb-0.5">Fontes Desc.</p>
                              <p className="text-base font-black text-rose-500">{fontesDescarteVal}</p>
                            </div>
                          </div>

                          {entry.fontes_modelos && Object.keys(entry.fontes_modelos).length > 0 && (
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1.5">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Detalhamento por Modelo</p>
                              {Object.entries(entry.fontes_modelos).map(([mName, mVals]: [string, any]) => {
                                const motivos = mVals?.motivos || {};
                                const motivosEntries = Object.entries(motivos).filter(([_, qty]) => Number(qty) > 0);
                                return (
                                  <div key={mName} className="text-[10px] py-1 border-b border-slate-100 last:border-0">
                                    <div className="flex justify-between items-center">
                                      <span className="font-bold text-slate-700">{mName}</span>
                                      <div className="flex gap-2 font-black">
                                        {Number(mVals?.aprovadas) > 0 && <span className="text-emerald-600">+{mVals.aprovadas} apr</span>}
                                        {Number(mVals?.descartadas) > 0 && <span className="text-rose-600">{mVals.descartadas} desc</span>}
                                      </div>
                                    </div>
                                    {motivosEntries.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {motivosEntries.map(([reasonKey, reasonQty]) => (
                                          <span key={reasonKey} className="text-[8px] font-bold bg-rose-50 text-rose-600 border border-rose-100 px-1.5 py-0.2 rounded">
                                            {reasonKey}: {Number(reasonQty)}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
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

                      {/* Atividades Extras */}
                      {extraActivities.length > 0 && (
                        <div className="border-t border-slate-100 pt-3 mt-3">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Extras (+PTS)</p>
                          <div className="flex flex-wrap gap-1.5">
                            {extraActivities.map((act, i) => {
                              let ptsLabel = "";
                              if (act === "Sucata") ptsLabel = "+30 pts";
                              if (act === "Conserto Minas") ptsLabel = "+30 pts";
                              if (act === "RMA") ptsLabel = "+40 pts";
                              return (
                                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-bold shadow-sm shadow-indigo-600/10">
                                  <Sparkles className="w-2.5 h-2.5 text-brand-orange animate-pulse" />
                                  {act} ({ptsLabel})
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <Pagination
              currentPage={historyPage}
              totalItems={filteredEntries.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setHistoryPage}
            />
            </>
          )}
        </div>
        )}
      </div>

      {/* MODAL DE EDIÇÃO */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {editingEntry && (
            <motion.div
              key="edit-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setEditingEntry(null)}
            >
              <motion.div
                key="edit-modal-content"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden max-h-[90vh] flex flex-col"
              >
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-5 text-white flex items-center justify-between shrink-0">
                  <h3 className="text-lg font-black font-headline">Editar Lançamento</h3>
                  <button onClick={() => setEditingEntry(null)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Fontes Aprovadas</label>
                      <input type="number" min={0} value={editFontesAprovadas} onChange={(e) => handleNumericInput(e.target.value, setEditFontesAprovadas)} className="w-full bg-indigo-50/50 border border-indigo-200/60 px-3 py-2.5 rounded-xl text-center text-xl font-black text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-headline" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Fontes Descarte</label>
                      <input type="number" min={0} value={editFontesDescarte} onChange={(e) => handleNumericInput(e.target.value, setEditFontesDescarte)} className="w-full bg-rose-50/50 border border-rose-200/60 px-3 py-2.5 rounded-xl text-center text-xl font-black text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-headline" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Atividades Extras</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: "Sucata", label: "Sucata" },
                        { key: "Conserto Minas", label: "Minas" },
                        { key: "RMA", label: "RMA" }
                      ].map((act) => {
                        const isSelected = editExtraActivities.includes(act.key);
                        return (
                          <button
                            type="button"
                            key={act.key}
                            onClick={() => {
                              setEditExtraActivities(prev =>
                                prev.includes(act.key) ? prev.filter(a => a !== act.key) : [...prev, act.key]
                              );
                            }}
                            className={cn(
                              "py-2 px-1 rounded-xl border text-[11px] font-black transition-all cursor-pointer select-none text-center",
                              isSelected
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                            )}
                          >
                            {act.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <button onClick={handleEditSave} className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl font-black font-headline tracking-widest uppercase transition-all shadow-lg flex items-center justify-center gap-2 active:scale-[0.98]">
                    <CheckCircle2 className="w-4 h-4" /> Salvar Alterações
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

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
