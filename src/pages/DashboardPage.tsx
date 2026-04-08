import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowUp,
  CheckCircle2,
  TrendingUp,
  Filter,
  ChevronRight,
  ChevronDown,
  TrendingDown,
  Clock,
  AlertTriangle,
  Loader2,
  X,
  Layers,
  Search,
  FileText,
} from "lucide-react";
import { cn } from "../lib/utils";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Treemap,
} from "recharts";
import { motion } from "motion/react";
import { useData } from "../context/DataContext";
import { calculateMetrics, TimeFilter, KPIData } from "../lib/analytics";

export default function MonitoringView() {
  const { monitoringData } = useData();
  const [period, setPeriod] = useState<TimeFilter>("mes");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [selectedAuditors, setSelectedAuditors] = useState<string[]>([]);
  const [isAuditorsInit, setIsAuditorsInit] = useState(false);
  const [showAuditorsMenu, setShowAuditorsMenu] = useState(false);
  const [stats, setStats] = useState<KPIData | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [categorySort, setCategorySort] = useState<"apr" | "div" | "tot">("apr");
  const [categoryLimit, setCategoryLimit] = useState<number>(15);
  const [globalStatusFilter, setGlobalStatusFilter] = useState<"all" | "aprovado" | "divergencia">("all");
  const [categoryFilter, setCategoryFilter] = useState<{
    category: string;
    type: "aprovadas" | "divergencias";
  } | null>(null);

  const uniqueAuditors = useMemo(() => {
    if (!monitoringData) return [];
    const auditors = new Set<string>();
    for (const record of monitoringData) {
      if (record["AUDITOR"]) {
        auditors.add(record["AUDITOR"]);
      }
    }
    return Array.from(auditors).sort();
  }, [monitoringData]);

  // Preenche todos os auditores automaticamente no primeiro load
  useEffect(() => {
    if (uniqueAuditors.length > 0 && !isAuditorsInit) {
      setSelectedAuditors(uniqueAuditors);
      setIsAuditorsInit(true);
    }
  }, [uniqueAuditors, isAuditorsInit]);

  const toggleAuditor = (aud: string) => {
    setSelectedAuditors((prev) =>
      prev.includes(aud) ? prev.filter((a) => a !== aud) : [...prev, aud],
    );
  };

  const toggleAllAuditors = () => {
    if (selectedAuditors.length === uniqueAuditors.length) {
      setSelectedAuditors([]); // Desmarca todos
    } else {
      setSelectedAuditors(uniqueAuditors); // Marca todos
    }
  };

  // Close menu when clicking outside (naive approach, handles most scenarios for dropdowns simply)
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".auditor-dropdown-container")) {
        setShowAuditorsMenu(false);
      }
    };
    if (showAuditorsMenu)
      document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showAuditorsMenu]);

  useEffect(() => {
    setIsCalculating(true);
    setErrorMsg(null);
    const timer = setTimeout(() => {
      try {
        let startD = customStart
          ? new Date(customStart + "T00:00:00")
          : undefined;
        let endD = customEnd ? new Date(customEnd + "T00:00:00") : undefined;
        if (startD && !endD) endD = startD; // Single day filter support

        // Filtro em Array de Checkboxes Real: Só inclui quem ta marcado
        const targetData = monitoringData.filter(
          (d) => d["AUDITOR"] && selectedAuditors.includes(d["AUDITOR"]),
        );

        const result = calculateMetrics(targetData, period, startD, endD, globalStatusFilter);
        setStats(result);
      } catch (err: any) {
        console.error("Crash na calculo analytico:", err);
        setErrorMsg(err?.message || "Erro desconhecido");
      } finally {
        setIsCalculating(false);
      }
    }, 10);
    return () => clearTimeout(timer);
  }, [monitoringData, period, customStart, customEnd, selectedAuditors, globalStatusFilter]);

  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-error">
        <AlertTriangle className="w-12 h-12" />
        <h2 className="text-xl font-bold">Erro de Processamento!</h2>
        <p className="font-mono text-sm">{errorMsg}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <h2 className="text-xl font-headline font-bold text-slate-700 animate-pulse">
          Processando dados de{" "}
          {period === "dia"
            ? "hoje"
            : period === "semana"
              ? "esta semana"
              : period === "mes"
                ? "este mês"
                : period === "ano"
                  ? "últimos 12 meses"
                  : "período"}
          ...
        </h2>
        <p className="text-slate-500 text-sm">
          Organizando desempenho inteligente para {monitoringData?.length || 0}{" "}
          registros...
        </p>
      </div>
    );
  }

  const auditors = stats.auditorsRanking || [];
  const trendData = stats.volumeDiario || [];

  return (
    <div
      className={cn(
        "space-y-10 transition-opacity duration-200",
        isCalculating ? "opacity-60" : "opacity-100",
      )}
    >
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-4xl font-extrabold text-primary font-headline tracking-tight">
              Monitoramento da Equipe
            </h1>
            {isCalculating && (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            )}
          </div>
          <p className="text-slate-500 text-lg leading-relaxed">
            Visão executiva do desempenho, eficiência e qualidade das operações
            de auditoria em tempo real.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 bg-surface-container-low p-1.5 rounded-xl">
          <button
            onClick={() => setPeriod("dia")}
            className={cn(
              "px-5 py-2 text-sm font-semibold rounded-lg transition-colors",
              period === "dia"
                ? "bg-surface-container-lowest text-primary shadow-sm"
                : "text-slate-500 hover:text-primary",
            )}
          >
            Dia
          </button>
          <button
            onClick={() => setPeriod("semana")}
            className={cn(
              "px-5 py-2 text-sm font-semibold rounded-lg transition-colors",
              period === "semana"
                ? "bg-surface-container-lowest text-primary shadow-sm"
                : "text-slate-500 hover:text-primary",
            )}
          >
            Semanal
          </button>
          <button
            onClick={() => setPeriod("mes")}
            className={cn(
              "px-5 py-2 text-sm font-semibold rounded-lg transition-colors",
              period === "mes"
                ? "bg-surface-container-lowest text-primary shadow-sm"
                : "text-slate-500 hover:text-primary",
            )}
          >
            Mensal
          </button>
          <button
            onClick={() => setPeriod("ano")}
            className={cn(
              "px-5 py-2 text-sm font-semibold rounded-lg transition-colors",
              period === "ano"
                ? "bg-surface-container-lowest text-primary shadow-sm"
                : "text-slate-500 hover:text-primary",
            )}
          >
            Anual
          </button>

          <div className="w-px h-4 bg-outline-variant/30 mx-1"></div>

          <div
            className={cn(
              "flex flex-col sm:flex-row items-center gap-2 px-2 py-1 rounded-lg transition-colors",
              period === "custom"
                ? "bg-surface-container-lowest shadow-sm"
                : "",
            )}
          >
            <button
              onClick={() => setPeriod("custom")}
              className={cn(
                "px-3 py-1.5 text-sm font-semibold rounded-md transition-colors",
                period === "custom"
                  ? "text-primary"
                  : "text-slate-500 hover:text-primary",
              )}
            >
              Personalizado
            </button>
            {period === "custom" && (
              <div className="flex items-center gap-2 text-sm">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="bg-transparent border border-outline-variant/30 rounded px-2 py-1 text-slate-700 outline-none focus:border-primary"
                  title="Data Inicial"
                />
                <span className="text-slate-400">até</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="bg-transparent border border-outline-variant/30 rounded px-2 py-1 text-slate-700 outline-none focus:border-primary"
                  title="Data Final"
                />
              </div>
            )}
          </div>

          <div className="w-px h-4 bg-outline-variant/30 mx-1"></div>

          <div className="relative hidden sm:flex items-center auditor-dropdown-container">
            <button
              onClick={() => setShowAuditorsMenu(!showAuditorsMenu)}
              className="flex items-center justify-between w-48 pl-9 pr-3 py-2 text-sm font-semibold text-primary border border-outline-variant/20 rounded-lg bg-surface-container-lowest hover:bg-surface-container-low transition-colors focus:outline-none"
            >
              <Filter className="w-4 h-4 text-primary absolute left-3 pointer-events-none" />
              <span className="truncate mr-2">
                {selectedAuditors.length === 0
                  ? "Filtro Auditor (Todos)"
                  : `${selectedAuditors.length} Selecionados`}
              </span>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-primary transition-transform",
                  showAuditorsMenu ? "rotate-180" : "",
                )}
              />
            </button>

            {showAuditorsMenu && (
              <div className="absolute top-full mt-2 right-0 w-64 bg-surface-container-lowest border border-outline-variant/20 rounded-xl shadow-lg z-50 py-2 max-h-72 overflow-y-auto">
                <div
                  className="px-4 py-2 hover:bg-surface-container-low transition-colors cursor-pointer flex items-center gap-3 text-sm text-slate-700 font-semibold"
                  onClick={toggleAllAuditors}
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0",
                      selectedAuditors.length === uniqueAuditors.length &&
                        uniqueAuditors.length > 0
                        ? "bg-primary border-primary"
                        : "border-slate-300",
                    )}
                  >
                    {selectedAuditors.length === uniqueAuditors.length &&
                      uniqueAuditors.length > 0 && (
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      )}
                  </div>
                  <span>Todos os Auditores</span>
                </div>

                <div className="h-px bg-outline-variant/10 my-1"></div>

                {uniqueAuditors.map((auditor) => (
                  <label
                    key={auditor}
                    className="px-4 py-2 hover:bg-surface-container-low transition-colors cursor-pointer flex items-center gap-3 text-sm text-slate-700 select-none"
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={selectedAuditors.includes(auditor)}
                      onChange={() => toggleAuditor(auditor)}
                    />
                    <div
                      className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0",
                        selectedAuditors.includes(auditor)
                          ? "bg-primary border-primary"
                          : "border-slate-300",
                      )}
                    >
                      {selectedAuditors.includes(auditor) && (
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <span className="truncate font-medium">{auditor}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-7 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-slate-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all flex flex-col gap-5 group hover:-translate-y-1">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300 shadow-inner">
               <Layers className="w-6 h-6" />
            </div>
            <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1", stats.totalAuditoriasTrend >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
              {stats.totalAuditoriasTrend >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />} 
              {Math.abs(stats.totalAuditoriasTrend).toFixed(1)}%
            </span>
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Total de Auditorias</h3>
            <div className="text-4xl font-black text-slate-800 font-headline tracking-tighter">
              {stats.totalAuditorias}
            </div>
          </div>
        </div>

        <div className="bg-white p-7 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-slate-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all flex flex-col gap-5 group hover:-translate-y-1">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300 shadow-inner">
               <CheckCircle2 className="w-6 h-6" />
            </div>
            <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1", stats.taxaAprovacaoTrend >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
              {stats.taxaAprovacaoTrend >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />} 
              {stats.taxaAprovacaoTrend > 0 ? '+' : ''}{stats.taxaAprovacaoTrend.toFixed(1)}%
            </span>
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Taxa de Aprovação</h3>
            <div className="text-4xl font-black text-slate-800 font-headline tracking-tighter">
              {stats.taxaAprovacao.toFixed(1)}<span className="text-2xl text-slate-400 ml-1">%</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-7 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-slate-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all flex flex-col gap-5 group hover:-translate-y-1">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors duration-300 shadow-inner">
               <Clock className="w-6 h-6" />
            </div>
            <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1", stats.tempoMedioTrend <= 0 ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600")}>
              {stats.tempoMedioTrend <= 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />} 
              {stats.tempoMedioTrend > 0 ? '+' : ''}
              {(() => {
                 const trendMin = Math.round(Math.abs(stats.tempoMedioTrend) * 60);
                 if (trendMin < 60) return `${trendMin}m`;
                 const h = Math.floor(trendMin / 60);
                 const m = trendMin % 60;
                 return m > 0 ? `${h}h ${m}m` : `${h}h`;
              })()}
            </span>
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Intervalos Méd. entre Baixas</h3>
            <div className="text-4xl font-black text-slate-800 font-headline tracking-tighter flex items-end gap-1">
              {(() => {
                 const minutes = Math.round(stats.tempoMedio * 60);
                 if (minutes < 60) return <>{minutes}<span className="text-2xl text-slate-400 mb-1">m</span></>;
                 const h = Math.floor(minutes / 60);
                 const m = minutes % 60;
                 return (
                    <>
                       {h}<span className="text-2xl text-slate-400 mb-1">h</span>
                       {m > 0 && <span className="ml-1">{m}<span className="text-2xl text-slate-400 mb-1">m</span></span>}
                    </>
                 );
              })()}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-slate-100">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-headline">
                Volume de Auditorias
              </h3>
              <p className="text-sm text-slate-500">
                Acompanhamento diário de produtividade da equipe
              </p>
            </div>
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>{" "}
                Volume Real
              </span>
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-outline-variant"></span>{" "}
                Projeção
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trendData}
                margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="4 4"
                  vertical={false}
                  stroke="#e2e8f0"
                  opacity={0.6}
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fontWeight: 600, fill: "#64748b" }}
                  dy={10}
                />
                <YAxis hide />
                <Tooltip
                  cursor={{
                    stroke: "#cbd5e1",
                    strokeWidth: 1,
                    strokeDasharray: "4 4",
                  }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const displayLabel = data.fullLabel || label;
                      return (
                        <div className="bg-slate-900/95 backdrop-blur text-white p-3.5 rounded-xl shadow-xl flex flex-col gap-1.5 border border-slate-700/50 animate-in fade-in zoom-in-95 duration-150">
                          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 opacity-70" />
                            {displayLabel}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.6)]"></div>
                            <span className="text-2xl font-bold font-headline">
                              {payload[0].value}{" "}
                              <span className="text-xs font-normal text-slate-400">
                                auditorias
                              </span>
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="volume"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorVolume)"
                  activeDot={{
                    r: 6,
                    fill: "#4f46e5",
                    stroke: "#fff",
                    strokeWidth: 2,
                    className: "shadow-lg",
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-slate-100 flex flex-col">
          <h3 className="text-xl font-bold text-slate-800 font-headline mb-1">
            Status Operacional
          </h3>
          <p className="text-sm text-slate-400 font-medium mb-8">
            Distribuição global dos processos
          </p>

          <div className="flex-1 flex flex-col justify-center gap-5">
            <div 
              onClick={() => setGlobalStatusFilter(prev => prev === "aprovado" ? "all" : "aprovado")}
              className={cn(
                "group p-4 rounded-xl border transition-all duration-300 cursor-pointer shadow-sm hover:-translate-y-0.5",
                globalStatusFilter === "aprovado" 
                  ? "bg-emerald-50/50 border-emerald-500 ring-2 ring-emerald-500/20" 
                  : "bg-white border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30",
                globalStatusFilter === "divergencia" && "opacity-50 grayscale"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-transform",
                    globalStatusFilter === "aprovado" ? "bg-emerald-500 text-white shadow-md" : "bg-white text-emerald-500 shadow-sm group-hover:scale-110"
                  )}>
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-700">Aprovado sem Div.</h4>
                    <p className="text-xs text-slate-400 font-medium">
                      {stats.statusDistribution[0]?.count || 0} auditorias
                    </p>
                  </div>
                </div>
                <span className="text-xl font-black font-headline text-slate-800">
                  {stats.statusDistribution[0]?.percent?.toFixed(0) || 0}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500" 
                  style={{ width: `${stats.statusDistribution[0]?.percent || 0}%` }}
                ></div>
              </div>
            </div>

            <div 
              onClick={() => setGlobalStatusFilter(prev => prev === "divergencia" ? "all" : "divergencia")}
              className={cn(
                "group p-4 rounded-xl border transition-all duration-300 cursor-pointer shadow-sm hover:-translate-y-0.5",
                globalStatusFilter === "divergencia" 
                  ? "bg-rose-50/50 border-rose-500 ring-2 ring-rose-500/20" 
                  : "bg-white border-slate-100 hover:border-rose-200 hover:bg-rose-50/30",
                globalStatusFilter === "aprovado" && "opacity-50 grayscale"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-transform",
                    globalStatusFilter === "divergencia" ? "bg-rose-500 text-white shadow-md" : "bg-white text-rose-500 shadow-sm group-hover:scale-110"
                  )}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-700">Com Divergência</h4>
                    <p className="text-xs text-slate-400 font-medium">
                      {stats.statusDistribution[1]?.count || 0} auditorias
                    </p>
                  </div>
                </div>
                <span className="text-xl font-black font-headline text-slate-800">
                  {stats.statusDistribution[1]?.percent?.toFixed(0) || 0}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-rose-500" 
                  style={{ width: `${stats.statusDistribution[1]?.percent || 0}%` }}
                ></div>
              </div>
            </div>
            {/* SLA METRIC */}
            <div className="group mt-4 p-5 rounded-xl border border-slate-100 bg-gradient-to-br from-indigo-50/50 to-white hover:border-indigo-200 transition-all shadow-sm flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-500" /> Lead Time Médio
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-[180px]">Tempo de vida útil Média das O.S</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-indigo-600 font-headline group-hover:scale-105 inline-block transition-transform">
                  {stats.slaMetrics?.mediaLeadTimeHours?.toFixed(1) || "0.0"}h
                </span>
                <p className="text-[10px] uppercase text-indigo-400 font-bold tracking-wider">Horas Úteis</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowCategoryModal(true)}
            className="mt-8 py-3.5 w-full bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-indigo-500/30 font-headline tracking-wide uppercase"
          >
            Ver Detalhes por Categoria
          </button>
        </div>
      </div>

      <section className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-slate-100 overflow-hidden mt-8">
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-800 font-headline mb-0.5">
              Performance por Assunto
            </h3>
            <p className="text-sm text-slate-500 font-medium">
              Análise de conversão e divergência por categorias
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={categorySort}
              onChange={(e) => setCategorySort(e.target.value as any)}
              className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="apr">Mais Aprovados</option>
              <option value="div">Mais Divergências</option>
              <option value="tot">Maior Volume Geral</option>
            </select>
            <select
              value={categoryLimit}
              onChange={(e) => setCategoryLimit(Number(e.target.value))}
              className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
              <option value={15}>Top 15</option>
              <option value={20}>Top 20</option>
              <option value={999}>Todos</option>
            </select>
          </div>
        </div>
        <div className="p-6 w-full max-h-[420px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          {(() => {
            const topCategories = stats.categoryDistribution
              .sort((a, b) => {
                if (categorySort === "apr") return b.aprovadoSemDiv - a.aprovadoSemDiv;
                if (categorySort === "div") return b.comDivergencia - a.comDivergencia;
                return b.total - a.total;
              })
              .slice(0, categoryLimit);
            const chartHeight = Math.max(280, topCategories.length * 50);

            return (
              <div style={{ height: `${chartHeight}px`, width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topCategories}
                    layout="vertical"
                    margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.6} />
                    <XAxis type="number" hide />
                    <YAxis 
                      type="category" 
                      dataKey="category" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fontWeight: 600, fill: "#475569" }}
                      width={240}
                    />
              <Tooltip
                cursor={{ fill: "#f1f5f9" }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-slate-900/95 backdrop-blur text-white p-3.5 rounded-xl shadow-xl flex flex-col gap-1.5 border border-slate-700/50 animate-in fade-in zoom-in-95 duration-150">
                        <span className="text-xs font-semibold text-slate-300 break-words max-w-[200px] mb-1">
                          {label}
                        </span>
                        {payload.map((entry: any, index: number) => {
                          const val = entry.value;
                          if (!val) return null; // hide empty breakdowns safely
                          return (
                            <div key={index} className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                <span className="text-xs text-slate-200 truncate max-w-[120px]">{entry.name}</span>
                              </div>
                              <span className="text-sm font-bold font-headline">{val}</span>
                            </div>
                          );
                        })}
                        {(() => {
                           const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
                           return (
                             <div className="border-t border-slate-700/50 mt-1 pt-1.5 flex items-center justify-between gap-4">
                               <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total</span>
                               <span className="text-sm font-black text-white">{total}</span>
                             </div>
                           );
                        })()}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {selectedAuditors.map((auditor, idx) => {
                const colors = ["#4f46e5", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4", "#f43f5e", "#14b8a6"];
                return (
                  <Bar 
                    key={auditor}
                    name={auditor}
                    dataKey={`${auditor}_${categorySort}`} 
                    stackId="categoryData"
                    fill={colors[idx % colors.length]} 
                    barSize={24}
                  />
                );
              })}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            );
          })()}
        </div>
      </section>

      {/* HEATMAP E WORD CLOUD */}
      {/* HEATMAP */}
      <section className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-slate-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xl font-bold text-slate-800 font-headline mb-0.5">
            Curva de Fadiga (Heatmap)
          </h3>
          <p className="text-sm text-slate-500 font-medium">
            Volume de aprovação por horário e dia da semana
          </p>
        </div>
        <div className="p-6">
          {(() => {
            const maxVal = Math.max(...(stats.heatmapData?.map(d => d.value) || [0]), 1);
            const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
            const hours = Array.from({length: 24}, (_, i) => i);
            return (
              <div className="flex gap-4 w-full overflow-x-auto custom-scrollbar pb-4 pt-2 px-2">
                <div className="flex flex-col gap-2 pt-6 pr-4 border-r border-slate-100 flex-shrink-0">
                  {days.map(d => (
                    <span key={d} className="text-[11px] font-bold text-slate-400 h-7 flex items-center justify-end w-8">
                      {d}
                    </span>
                  ))}
                </div>
                <div className="flex-1 min-w-[720px]">
                  <div className="flex gap-1.5 mb-3">
                    {hours.map(h => (
                      <span key={h} className="flex-1 text-[10px] font-bold text-slate-400 text-center">
                        {h}h
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-rows-7 gap-2">
                    {days.map((_, dayIdx) => (
                      <div key={dayIdx} className="grid grid-cols-24 gap-1.5 flex-1">
                        {hours.map(hour => {
                          const cell = stats.heatmapData?.find(d => d.day === dayIdx && d.hour === hour);
                          const val = cell?.value || 0;
                          const intensity = val / maxVal;
                          return (
                            <div 
                              key={hour} 
                              className="h-7 rounded-sm transition-all duration-300 cursor-crosshair relative group hover:scale-110 hover:z-10 hover:shadow-lg hover:ring-2 hover:ring-indigo-300 ring-offset-1"
                              style={{
                                backgroundColor: val === 0 ? "#f8fafc" : `rgba(79, 70, 229, ${Math.max(0.2, intensity)})`
                              }}
                              title={`${days[dayIdx]}, ${hour}h: ${val} fechamentos`}
                            >
                              {val > 0 && (
                                <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-[10px] font-black text-white pointer-events-none drop-shadow-md">
                                  {val}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </section>



      <section className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-slate-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
          <div>
            <h3 className="text-xl font-bold text-slate-800 font-headline mb-0.5">
              Ranking de Auditores
            </h3>
            <p className="text-sm text-slate-500 font-medium">
              Performance de aprovação e tempo de atendimento
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowReportModal(true)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-lg flex items-center gap-2 transition-colors">
              Exportar Relatório <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Auditor
                </th>
                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">
                  Total OS Apr.
                </th>
                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">
                  Porcentagem Apr.
                </th>
                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">
                  Tempo Méd. entre Apr.
                </th>
                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {auditors.map((auditor, i) => (
                <tr
                  key={i}
                  className="hover:bg-surface-container-low/30 transition-colors"
                >
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <img
                        src={auditor.avatar}
                        alt={auditor.name}
                        className="w-8 h-8 rounded-full object-cover border border-slate-100"
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {auditor.name}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {auditor.level}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-center font-headline font-bold text-primary">
                    {auditor.total}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-900">
                          {auditor.rate}%
                        </span>
                        <span
                          className={cn(
                            "flex items-center text-[10px] font-bold",
                            auditor.trend.startsWith("+")
                              ? "text-on-tertiary-container"
                              : "text-error",
                          )}
                        >
                          {auditor.trend.startsWith("+") ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {auditor.trend}
                        </span>
                      </div>
                      <div className="w-20 h-1 bg-surface-container rounded-full overflow-hidden">
                        <div
                          className="h-full bg-on-tertiary-container"
                          style={{ width: `${auditor.rate}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-center font-headline font-bold text-slate-500">
                    {auditor.time}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold",
                        auditor.status === "EXCELENTE" ||
                          auditor.status === "ALTA PERFORMANCE"
                          ? "bg-tertiary-fixed/20 text-on-tertiary-fixed-variant"
                          : "bg-indigo-50 text-indigo-700",
                      )}
                    >
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          auditor.status === "EXCELENTE" ||
                            auditor.status === "ALTA PERFORMANCE"
                            ? "bg-on-tertiary-fixed-variant"
                            : "bg-indigo-700",
                        )}
                      ></span>
                      {auditor.status}
                    </span>
                  </td>
                </tr>
              ))}
              {auditors.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-8 text-slate-500 text-sm"
                  >
                    Nenhum dado encontrado para o período. Realize a importação
                    para ver os resultados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Category Details Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10 bg-surface-container-low/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold font-headline text-slate-900">
                    Detalhes por Categoria
                  </h2>
                  <p className="text-sm text-slate-500">
                    Distribuição completa do status das auditorias por assunto
                    da OS
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-3 border-b border-outline-variant/10 bg-surface-container-lowest">
              {!categoryFilter ? (
                <div className="relative max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Buscar categoria..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
              ) : (
                <button
                  onClick={() => setCategoryFilter(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-lg flex items-center gap-2 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  Voltar para Categorias
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-surface-container-lowest custom-scrollbar">
              {categoryFilter ? (
                <div className="flex flex-col gap-4">
                  <div className="mb-2">
                    <h3 className="text-lg font-bold text-slate-800">
                      {categoryFilter.type === "aprovadas" ? (
                        <span className="text-emerald-600 flex items-center gap-2"><CheckCircle2 className="w-5 h-5"/> OS Aprovadas</span>
                      ) : (
                        <span className="text-rose-600 flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> OS com Divergência</span>
                      )}
                    </h3>
                    <p className="text-sm text-slate-500 font-medium">{categoryFilter.category}</p>
                  </div>
                  <div className="space-y-3">
                    {stats.rawCurrentRecords
                      .filter(r => (r["ASSUNTO_OS"] || 'Não Categorizado').trim() === categoryFilter.category && (categoryFilter.type === "aprovadas" ? r.isApprovedSemDiv : !r.isApprovedSemDiv))
                      .map((record, i) => (
                        <div key={i} className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col gap-2">
                           <div className="flex justify-between items-start">
                             <div className="flex items-center gap-2">
                               <span className="font-bold text-slate-800">OS #{record.ID_CLIENTE}</span>
                               <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium border border-slate-200">{record.AUDITOR}</span>
                             </div>
                             <span className="text-xs font-semibold text-slate-400 tabular-nums">
                               {new Date(record["DATA/HORA_FECHAMENTO"]).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                             </span>
                           </div>
                           <p className="text-sm text-slate-600 font-medium">{record.CLIENTE}</p>
                           {categoryFilter.type === "divergencias" && (
                             <div className="mt-2 p-3 bg-rose-50/50 rounded-lg border border-rose-100/50">
                               <p className="text-xs font-semibold text-rose-800 mb-1">Diagnóstico:</p>
                               <p className="text-xs text-rose-700 leading-snug">{record.DIAGNOSTICO_MENSAGEM_OS || "Não informado"}</p>
                               <p className="text-xs font-semibold text-rose-800 mt-2 mb-1">Próxima Tarefa:</p>
                               <p className="text-xs text-rose-700 leading-snug">{record.PROXIMA_TAREFA || "Não informada"}</p>
                             </div>
                           )}
                           {categoryFilter.type === "aprovadas" && (
                             <div className="mt-2 text-xs text-slate-500">
                               Sem diagnóstico de erro registrado.
                             </div>
                           )}
                        </div>
                      ))}
                      {stats.rawCurrentRecords.filter(r => (r["ASSUNTO_OS"] || 'Não Categorizado').trim() === categoryFilter.category && (categoryFilter.type === "aprovadas" ? r.isApprovedSemDiv : !r.isApprovedSemDiv)).length === 0 && (
                        <div className="p-8 text-center text-slate-500 text-sm">
                          Nenhuma Ordem de Serviço encontrada para este filtro.
                        </div>
                      )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stats.categoryDistribution
                    .filter((cat) =>
                      cat.category
                        .toLowerCase()
                        .includes(categorySearch.toLowerCase()),
                    )
                    .map((cat, idx) => {
                      const percentApr =
                        cat.total > 0
                          ? (cat.aprovadoSemDiv / cat.total) * 100
                          : 0;
                      const percentDiv =
                        cat.total > 0
                          ? (cat.comDivergencia / cat.total) * 100
                          : 0;

                      return (
                        <div
                          key={idx}
                          className="border border-outline-variant/20 rounded-xl p-5 hover:border-primary/30 transition-all bg-white shadow-sm flex flex-col gap-5 group relative"
                        >
                          <div className="flex justify-between items-start gap-3">
                            <h3 className="font-bold text-slate-800 text-sm leading-snug break-words group-hover:text-primary transition-colors">
                              {cat.category}
                            </h3>
                            <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap">
                              {cat.total} total
                            </span>
                          </div>

                          <div className="mt-auto flex flex-col gap-3">
                            <div className="flex items-center justify-between text-sm">
                              <div 
                                onClick={() => cat.aprovadoSemDiv > 0 && setCategoryFilter({ category: cat.category, type: 'aprovadas' })}
                                className={cn("flex flex-col p-1.5 -m-1.5 rounded-lg transition-colors", cat.aprovadoSemDiv > 0 ? "cursor-pointer hover:bg-emerald-50" : "opacity-50 cursor-not-allowed")}
                              >
                                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                                  Aprovadas
                                </span>
                                <span className="font-bold text-emerald-600 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  {cat.aprovadoSemDiv}
                                  <span className="text-[10px] text-emerald-600/70 ml-1">
                                    ({percentApr.toFixed(0)}%)
                                  </span>
                                </span>
                              </div>

                              <div 
                                onClick={() => cat.comDivergencia > 0 && setCategoryFilter({ category: cat.category, type: 'divergencias' })}
                                className={cn("flex flex-col items-end p-1.5 -m-1.5 rounded-lg transition-colors", cat.comDivergencia > 0 ? "cursor-pointer hover:bg-rose-50" : "opacity-50 cursor-not-allowed")}
                              >
                                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                                  Divergências
                                </span>
                                <span className="font-bold text-rose-600 flex items-center gap-1">
                                  {cat.comDivergencia}
                                  <span className="text-[10px] text-rose-600/70 mr-1">
                                    ({percentDiv.toFixed(0)}%)
                                  </span>
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                </span>
                              </div>
                            </div>

                            <div className="h-2.5 w-full flex rounded-full overflow-hidden bg-slate-100 shadow-inner">
                              {cat.aprovadoSemDiv > 0 && (
                                <div
                                  className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                                  style={{ width: `${percentApr}%` }}
                                  title={`${percentApr.toFixed(1)}% Aprovado`}
                                ></div>
                              )}
                              {cat.comDivergencia > 0 && (
                                <div
                                  className="h-full bg-rose-500 transition-all duration-500 ease-out"
                                  style={{ width: `${percentDiv}%` }}
                                  title={`${percentDiv.toFixed(1)}% Com Divergência`}
                                ></div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  {stats.categoryDistribution.filter((cat) =>
                    cat.category
                      .toLowerCase()
                      .includes(categorySearch.toLowerCase()),
                  ).length === 0 && (
                    <div className="col-span-full py-16 text-center text-slate-500 flex flex-col items-center">
                      <Search className="w-12 h-12 text-slate-300 mb-4" />
                      <p className="font-medium text-lg text-slate-700">
                        Nenhuma categoria encontrada.
                      </p>
                      <p className="text-sm mt-1">
                        Nenhum resultado corresponde à sua busca.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-outline-variant/10 bg-surface-container-lowest text-right">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="px-6 py-2.5 bg-surface-container-low hover:bg-surface-container text-slate-700 font-bold rounded-lg transition-colors text-sm"
              >
                FECHAR
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Report Explorer Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10 bg-surface-container-low/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold font-headline text-slate-900">
                    Relatório Analítico Consolidado
                  </h2>
                  <p className="text-sm text-slate-500">
                    Visualização e extração da base de dados ({stats?.rawCurrentRecords?.length || 0} registros)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center text-slate-500 transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-8 bg-surface-container-lowest text-center items-center justify-center">
               <FileText className="w-20 h-20 text-slate-200" />
               <div className="max-w-md">
                 <h3 className="text-xl font-bold text-slate-800 mb-2">Relatório Pronto para Download</h3>
                 <p className="text-sm text-slate-500 mb-6">Você está exportando o relatório de auditoria do período selecionado. A planilha incluirá todos os detalhes capturados pelo sistema, com a indicação de aprovação ou erro.</p>
                 <button 
                  onClick={() => {
                    if (!stats?.rawCurrentRecords) return;
                    // Export to CSV
                    const headers = ["ID_CLIENTE", "CLIENTE", "AUDITOR", "DATA", "ASSUNTO_OS", "STATUS_MENSAGEM_OS", "SITUACAO_CONSOLIDADA"];
                    const csvRows = [headers.join(",")];
                    stats.rawCurrentRecords.forEach(r => {
                      const row = [
                        r.ID_CLIENTE || "",
                        `"${(r.CLIENTE || "").replace(/"/g, '""')}"`,
                        `"${(r.AUDITOR || "").replace(/"/g, '""')}"`,
                        r["DATA/HORA_FECHAMENTO"] || "",
                        `"${(r.ASSUNTO_OS || "").replace(/"/g, '""')}"`,
                        r.STATUS_MENSAGEM_OS || "",
                        r.isApprovedSemDiv ? "APROVADO" : "DIVERGENCIA"
                      ];
                      csvRows.push(row.join(","));
                    });
                    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join("\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", `relatorio_auditoria_${period}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="px-8 py-3 bg-primary hover:bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-indigo-500/30 transition-all font-headline tracking-wide uppercase"
                 >
                   Fazer Download (.CSV)
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
