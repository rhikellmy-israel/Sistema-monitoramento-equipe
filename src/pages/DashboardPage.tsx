import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { normalizeDisplayName, ACTIVE_INTERN_NAMES } from "../lib/nameAliasMap";
import {
  Layers,
  Search,
  Filter,
  Calendar,
  Info,
  Beaker,
  Brush,
  Trophy,
  ChevronRight,
  MonitorCheck,
  X,
  FileText,
  Download,
  Loader2,
  Zap,
  Trash2
} from "lucide-react";
import { cn } from "../lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  LabelList
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { useData } from "../context/DataContext";
import DateFilter from "../components/DateFilter";
import AnimatedCounter from "../components/AnimatedCounter";
import Pagination from "../components/Pagination";
import { DateFilterMode, isDateMatch, formatToBR, normalizeDateToISO } from "../lib/dateUtils";
import ReportMonitoramento from "../components/reports/ReportMonitoramento";
import { exportNodeToPng, getFilterPeriodLabel, getReportFilename } from "../lib/exportReportPng";

export default function DashboardPage() {
  const { monitoringData, productionEntries, users } = useData();
  const [selectedFuncionario, setSelectedFuncionario] = useState<string>("Todos");
  const [filterMode, setFilterMode] = useState<DateFilterMode>("Todas");
  const [filterValue, setFilterValue] = useState("");
  const [selectedDayRecord, setSelectedDayRecord] = useState<any | null>(null);

  // PNG Report State
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Pagination
  const [internPage, setInternPage] = useState(1);
  const [fechamentoPage, setFechamentoPage] = useState(1);
  const ITEMS_PER_PAGE = 25;
  const INTERNS_PER_PAGE = 10;

  // Reset pages on filter change
  useEffect(() => { setInternPage(1); setFechamentoPage(1); }, [filterMode, filterValue, selectedFuncionario]);

  // Merge productionEntries com monitoringData para reatividade completa
  // Deduplicação: se productionEntries tem um registro para user+date, ignora o monitoringData equivalente
  const mergedMonitoringData = useMemo(() => {
    // Build dedup keys from production entries
    const prodKeys = new Set<string>();
    const fromProduction = productionEntries.map(e => {
      const isoDate = normalizeDateToISO(e.date) || e.date;
      const resolvedName = normalizeDisplayName(e.user_name || "Usuário");
      prodKeys.add(`${resolvedName}|${isoDate}`);
      const d = new Date(isoDate);
      const dayOfWeek = !isNaN(d.getTime()) ? d.toLocaleDateString("pt-BR", { weekday: "long" }) : "";
      const allActivities = [...(e.atividades || [])];
      if (e.outros) allActivities.push(e.outros);
      return {
        data_registro: isoDate,
        dia_da_semana: dayOfWeek,
        funcionario: resolvedName,
        limpos: Number(e.limpos) || 0,
        testados: Number(e.testados) || 0,
        observacao: allActivities.length > 0 ? `Atividades: ${allActivities.join(", ")}` : undefined,
      };
    });

    // Filter monitoringData to exclude entries already covered by productionEntries
    const dedupedMonitoring = monitoringData.filter(m => {
      const resolvedName = normalizeDisplayName(m.funcionario || "");
      const key = `${resolvedName}|${m.data_registro}`;
      return !prodKeys.has(key);
    }).map(m => ({
      ...m,
      funcionario: normalizeDisplayName(m.funcionario || ""),
    }));

    return [...dedupedMonitoring, ...fromProduction];
  }, [monitoringData, productionEntries]);

  // Derivar dados únicos
  const funcionarios = useMemo(() => {
    if (!mergedMonitoringData) return [];
    const nomes = new Set(mergedMonitoringData.map(d => d.funcionario).filter(Boolean));
    return Array.from(nomes).sort();
  }, [mergedMonitoringData]);

  // Filtragem
  const filteredData = useMemo(() => {
    let base = mergedMonitoringData || [];
    
    // Filtro por Data
    if (filterMode !== "Todas" && filterValue.trim()) {
      base = base.filter(d => {
        if (!d.data_registro) return false;
        return isDateMatch(String(d.data_registro), filterMode, filterValue);
      });
    }

    // Filtro por Funcionário
    if (selectedFuncionario !== "Todos") {
      base = base.filter(d => d.funcionario === selectedFuncionario);
    }
    
    return base;
  }, [mergedMonitoringData, selectedFuncionario, filterMode, filterValue]);

  // KPIs
  const kpis = useMemo(() => {
    let limpos = 0;
    let testados = 0;
    filteredData.forEach(d => {
      limpos += Number(d.limpos) || 0;
      testados += Number(d.testados) || 0;
    });
    return {
      limpos,
      testados,
      total: limpos + testados
    };
  }, [filteredData]);

  // Agrupamento por Funcionario (Gráfico 1)
  const dataByFuncionario = useMemo(() => {
    if (selectedFuncionario !== "Todos") return [];
    const map = new Map<string, { limpos: number, testados: number, total: number }>();
    filteredData.forEach(d => {
      const f = d.funcionario || "Sem Nome";
      const atual = map.get(f) || { limpos: 0, testados: 0, total: 0 };
      atual.limpos += Number(d.limpos) || 0;
      atual.testados += Number(d.testados) || 0;
      atual.total += (Number(d.limpos) || 0) + (Number(d.testados) || 0);
      map.set(f, atual);
    });
    return Array.from(map.entries()).map(([k, v]) => ({ name: k, ...v })).sort((a, b) => b.total - a.total);
  }, [filteredData, selectedFuncionario]);

  // Métricas de Fontes — Estagiários (Dinâmico a partir da Produção e respeitando os filtros)
  const internPowerSupplyMetrics = useMemo(() => {
    const internsMap = new Map<string, { id: string; name: string; photoUrl?: string }>();

    // 1. Usuários cadastrados com role estagiário
    users.filter(u => u.role === "estagiario_teste" && u.active !== false).forEach(u => {
      const norm = normalizeDisplayName(u.name);
      if (!internsMap.has(norm)) {
        internsMap.set(norm, { id: u.id, name: norm, photoUrl: u.photoUrl });
      }
    });

    // 2. Nomes canônicos de estagiários ativos
    ACTIVE_INTERN_NAMES.forEach((cName, idx) => {
      const norm = normalizeDisplayName(cName);
      if (!internsMap.has(norm)) {
        const userMatch = users.find(u => normalizeDisplayName(u.name) === norm);
        internsMap.set(norm, { id: userMatch?.id || `intern-${idx}`, name: norm, photoUrl: userMatch?.photoUrl });
      }
    });

    // 3. Qualquer usuário com lançamentos de fontes na produção
    productionEntries.forEach(entry => {
      if ((entry.fontes_aprovadas && entry.fontes_aprovadas > 0) || (entry.fontes_descarte && entry.fontes_descarte > 0)) {
        const norm = normalizeDisplayName(entry.user_name || "");
        if (!internsMap.has(norm)) {
          const userMatch = users.find(u => normalizeDisplayName(u.name) === norm);
          internsMap.set(norm, { id: userMatch?.id || entry.user_id || `prod-intern-${norm}`, name: norm, photoUrl: userMatch?.photoUrl });
        }
      }
    });

    // Filtra produção respeitando os filtros de data ativos
    const periodProduction = productionEntries.filter(entry => {
      if (!entry.date) return false;
      return isDateMatch(normalizeDateToISO(entry.date) || entry.date, filterMode, filterValue);
    });

    let allInterns = Array.from(internsMap.values()).map(intern => {
      const internEntries = periodProduction.filter(e => {
        const normName = normalizeDisplayName(e.user_name || "");
        return normName === intern.name || (e.user_id && e.user_id === intern.id);
      });

      let fontesTestadas = 0;
      let fontesDescartadas = 0;

      internEntries.forEach(e => {
        fontesTestadas += Number(e.fontes_aprovadas) || 0;
        fontesDescartadas += Number(e.fontes_descarte) || 0;
      });

      return {
        ...intern,
        fontesTestadas,
        fontesDescartadas,
        totalFontes: fontesTestadas + fontesDescartadas,
      };
    });

    // Se houver filtro específico de funcionário que corresponda a um estagiário
    if (selectedFuncionario !== "Todos") {
      const specificMatch = allInterns.filter(i => i.name.toUpperCase().trim() === selectedFuncionario.toUpperCase().trim());
      if (specificMatch.length > 0) {
        allInterns = specificMatch;
      }
    }

    return allInterns.sort((a, b) => b.fontesTestadas - a.fontesTestadas || a.name.localeCompare(b.name));
  }, [users, productionEntries, filterMode, filterValue, selectedFuncionario]);

  // Evolução Mensal / Componente de Fechamento (Agrupado por YYYY-MM)
  const fechamentoMensal = useMemo(() => {
    const map = new Map<string, { limpos: number, testados: number, total: number, diasTrab: Set<string> }>();
    mergedMonitoringData.forEach(d => {
      if (!d.data_registro) return;
      let monthKey = "Indefinido";
      try {
        const isoDate = normalizeDateToISO(d.data_registro);
        if (isoDate) {
            monthKey = isoDate.substring(0, 7);
            d.data_registro = isoDate;
        }
      } catch (e) {}

      const atual = map.get(monthKey) || { limpos: 0, testados: 0, total: 0, diasTrab: new Set() };
      atual.limpos += Number(d.limpos) || 0;
      atual.testados += Number(d.testados) || 0;
      atual.total += (Number(d.limpos) || 0) + (Number(d.testados) || 0);
      atual.diasTrab.add(d.data_registro);
      map.set(monthKey, atual);
    });
    return Array.from(map.entries())
      .map(([k, v]) => ({ month: k, ...v, diasTrabalhados: v.diasTrab.size }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [mergedMonitoringData]);

  // Lista dos registros brutos do filtro (para visualização no gráfico individual)
  const historicalRecords = useMemo(() => {
    return [...filteredData].sort((a, b) => String(b.data_registro).localeCompare(String(a.data_registro)));
  }, [filteredData]);

  const periodoLabel = useMemo(() => getFilterPeriodLabel(filterMode, filterValue), [filterMode, filterValue]);
  
  const dataGeracao = useMemo(() => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  }, []);

  const handleGenerateReport = useCallback(async () => {
    setIsGeneratingReport(true);
    setShowReport(true);
    // Aguarda renderização off-screen do componente
    await new Promise(r => setTimeout(r, 500));
    try {
      if (reportRef.current) {
        const filename = getReportFilename('MonitoramentoEquipe', filterMode, filterValue);
        await exportNodeToPng(reportRef.current, filename);
      }
    } catch (err) {
      console.error('Erro ao gerar relatório PNG:', err);
      alert('Erro ao gerar o relatório. Tente novamente.');
    } finally {
      setShowReport(false);
      setIsGeneratingReport(false);
    }
  }, [filterMode, filterValue]);

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-primary font-headline tracking-tight">
            Monitoramento da Equipe
          </h1>
          <p className="text-slate-500 text-lg leading-relaxed mt-2">
            Monitoramento detalhado de performance, equipamentos limpos e testados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col sm:flex-row gap-4 bg-surface-container-low p-2 rounded-xl shadow-sm border border-outline-variant/10">
            <DateFilter 
               mode={filterMode} 
               value={filterValue} 
               onChange={(m, v) => { setFilterMode(m); setFilterValue(v); }} 
            />
            
            <div className="flex items-center gap-3 px-3 py-1.5 focus-within:ring-2 ring-primary/20 rounded-lg bg-surface-container-lowest">
              <Filter className="w-4 h-4 text-primary" />
              <select
                value={selectedFuncionario}
                onChange={(e) => setSelectedFuncionario(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="Todos">Visão Global (Todos)</option>
                {funcionarios.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerateReport}
            disabled={isGeneratingReport}
            className={cn(
              "flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-sm cursor-pointer shrink-0",
              isGeneratingReport
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98]"
            )}
          >
            {isGeneratingReport ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Gerando Relatório...</>
            ) : (
              <><Download className="w-4 h-4" /> Gerar Relatório PNG</>
            )}
          </button>
        </div>
      </header>

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        <motion.div initial={{y:-20, opacity:0}} animate={{y:0, opacity:1}} transition={{delay:0.1}} className="bg-white p-7 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-slate-100 hover:shadow-lg transition-all group overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-400 to-indigo-500" />
          <div className="flex justify-between items-start">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
               <Layers className="w-7 h-7" />
            </div>
            <span className="px-3 py-1 bg-slate-50 text-slate-500 rounded-full text-xs font-bold font-headline">Total</span>
          </div>
          <div className="mt-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Produção Geral</h3>
            <div className="text-5xl font-black text-slate-800 font-headline tracking-tighter">
              <AnimatedCounter value={kpis.total} />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{y:-20, opacity:0}} animate={{y:0, opacity:1}} transition={{delay:0.2}} className="bg-white p-7 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-slate-100 hover:shadow-lg transition-all group overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500" />
          <div className="flex justify-between items-start">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
               <Brush className="w-7 h-7" />
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold font-headline">Limpos</span>
          </div>
          <div className="mt-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Equip. Limpos</h3>
            <div className="text-5xl font-black text-slate-800 font-headline tracking-tighter">
              <AnimatedCounter value={kpis.limpos} />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{y:-20, opacity:0}} animate={{y:0, opacity:1}} transition={{delay:0.3}} className="bg-white p-7 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-slate-100 hover:shadow-lg transition-all group overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 to-orange-500" />
          <div className="flex justify-between items-start">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
               <MonitorCheck className="w-7 h-7" />
            </div>
            <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-bold font-headline">Testados</span>
          </div>
          <div className="mt-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Equip. Testados</h3>
            <div className="text-5xl font-black text-slate-800 font-headline tracking-tighter">
              <AnimatedCounter value={kpis.testados} />
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart / Area */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-[0_2px_20px_-3px_rgba(0,0,0,0.05)] border border-slate-100">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-headline tracking-tight">
                {selectedFuncionario === "Todos" ? "Produção por Funcionário" : "Histórico de Produção"}
              </h3>
              <p className="text-sm text-slate-400 font-medium mt-1">
                Comparativo entre total de equipamentos testados e limpos
              </p>
            </div>
          </div>

          <div style={{ height: selectedFuncionario === "Todos" ? Math.max(350, dataByFuncionario.length * 65) : 350, width: '100%' }}>
            {selectedFuncionario === "Todos" ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataByFuncionario} layout="vertical" margin={{ top: 10, right: 40, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.4} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={100}
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }}
                    tickFormatter={(value: string) => value.length > 14 ? value.substring(0, 12) + '…' : value}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: "#f1f5f9" }}
                    content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                            return (
                                <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl flex flex-col gap-2 border border-slate-800">
                                    <span className="text-sm font-bold text-slate-200">{label}</span>
                                    <div className="flex items-center justify-between gap-6">
                                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-emerald-400" /> <span className="text-xs text-slate-400">Limpos</span></div>
                                        <span className="font-bold">{payload[0].value}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-6">
                                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-amber-400" /> <span className="text-xs text-slate-400">Testados</span></div>
                                        <span className="font-bold">{payload[1].value}</span>
                                    </div>
                                    <div className="border-t border-slate-700/50 pt-2 mt-1 flex justify-between gap-4">
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total</span>
                                        <span className="font-black text-indigo-400">{(payload[0].value as number) + (payload[1].value as number)}</span>
                                    </div>
                                </div>
                            )
                        }
                        return null;
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }} />
                  <Bar name="Limpos" dataKey="limpos" fill="#34d399" radius={[0, 4, 4, 0]} maxBarSize={28} stackId="a">
                      <LabelList dataKey="limpos" position="insideRight" style={{ fill: '#fff', fontSize: 10, fontWeight: 800 }} formatter={(v: number) => v > 0 ? v : ''} />
                  </Bar>
                  <Bar name="Testados" dataKey="testados" fill="#fbbf24" radius={[0, 4, 4, 0]} maxBarSize={28} stackId="a">
                      <LabelList dataKey="testados" position="insideRight" style={{ fill: '#fff', fontSize: 10, fontWeight: 800 }} formatter={(v: number) => v > 0 ? v : ''} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[...historicalRecords].reverse()} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorLimpos" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#34d399" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorTestados" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.4} />
                        <XAxis dataKey="data_registro" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                        <RechartsTooltip 
                             content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl flex flex-col gap-2 border border-slate-800">
                                            <span className="text-sm font-bold text-slate-200">{label}</span>
                                            {payload.map(p => (
                                              <div key={p.name} className="flex items-center justify-between gap-6">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-3 h-3 rounded" style={{ backgroundColor: p.stroke }} /> 
                                                    <span className="text-xs text-slate-400 capitalize">{p.name}</span>
                                                </div>
                                                <span className="font-bold">{p.value}</span>
                                              </div>
                                            ))}
                                        </div>
                                    )
                                }
                                return null;
                            }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
                        <Area type="monotone" name="Limpos" dataKey="limpos" stroke="#34d399" fillOpacity={1} fill="url(#colorLimpos)" strokeWidth={3} activeDot={{ r: 6 }} />
                        <Area type="monotone" name="Testados" dataKey="testados" stroke="#fbbf24" fillOpacity={1} fill="url(#colorTestados)" strokeWidth={3} activeDot={{ r: 6 }} />
                    </AreaChart>
                </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right Side: Métricas de Fontes — Estagiários */}
        <div className="bg-white rounded-3xl shadow-[0_2px_20px_-3px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col h-full overflow-hidden">
             <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                 <div>
                   <h3 className="text-lg font-bold text-slate-800 font-headline flex items-center gap-2">
                     <Zap className="w-5 h-5 text-indigo-600" /> Métricas de Fontes — Estagiários
                   </h3>
                   <p className="text-xs text-slate-500 font-medium mt-0.5">Fontes testadas e descartadas registradas na Produção</p>
                 </div>
                 <span className="text-[10px] font-bold uppercase px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                   {internPowerSupplyMetrics.length} {internPowerSupplyMetrics.length === 1 ? 'estagiário' : 'estagiários'}
                 </span>
             </div>
             <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                 {internPowerSupplyMetrics.length === 0 ? (
                     <div className="flex flex-col items-center justify-center p-12 text-slate-400 text-center">
                         <Zap className="w-10 h-10 mb-3 opacity-30 text-indigo-400" />
                         <span className="text-sm font-bold text-slate-600">Nenhum estagiário encontrado</span>
                         <span className="text-xs mt-1 text-slate-400">Cadastre colaboradores estagiários na aba Admin ou registre testes de fontes na aba Produção.</span>
                     </div>
                 ) : (
                     internPowerSupplyMetrics.slice((internPage - 1) * INTERNS_PER_PAGE, internPage * INTERNS_PER_PAGE).map((intern, idx) => (
                        <motion.div 
                           initial={{ opacity: 0, y: 15 }}
                           animate={{ opacity: 1, y: 0 }}
                           transition={{ delay: idx * 0.04 }}
                           key={intern.id || intern.name}
                           className="flex flex-col p-5 bg-slate-50/70 hover:bg-slate-100/90 border border-slate-200/70 hover:border-indigo-300 rounded-2xl transition-all shadow-sm"
                        >
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    {intern.photoUrl ? (
                                      <img src={intern.photoUrl} alt={intern.name} className="w-10 h-10 rounded-full object-cover shadow-sm border border-slate-200 shrink-0" />
                                    ) : (
                                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-black shadow-sm shrink-0">
                                        {intern.name?.substring(0, 2).toUpperCase()}
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <h4 className="text-sm font-headline font-black text-slate-800 truncate" title={intern.name}>
                                        {intern.name}
                                      </h4>
                                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-violet-100/80 text-violet-700 rounded-md border border-violet-200/60 inline-block mt-0.5">
                                        Estagiário
                                      </span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200/60">
                                <div className="bg-white/80 border border-indigo-100 rounded-xl p-3 text-center shadow-xs">
                                    <div className="text-[9px] font-extrabold text-indigo-600 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                                      <MonitorCheck className="w-3 h-3 text-indigo-500" /> Fontes Testadas
                                    </div>
                                    <div className="text-2xl font-black text-indigo-700 font-headline">
                                      {intern.fontesTestadas.toLocaleString('pt-BR')}
                                    </div>
                                </div>
                                <div className="bg-white/80 border border-rose-100 rounded-xl p-3 text-center shadow-xs">
                                    <div className="text-[9px] font-extrabold text-rose-600 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                                      <Trash2 className="w-3 h-3 text-rose-500" /> Fontes Descartadas
                                    </div>
                                    <div className="text-2xl font-black text-rose-600 font-headline">
                                      {intern.fontesDescartadas.toLocaleString('pt-BR')}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                     ))
                 )}

                 <Pagination
                   currentPage={internPage}
                   totalItems={internPowerSupplyMetrics.length}
                   itemsPerPage={INTERNS_PER_PAGE}
                   onPageChange={setInternPage}
                   className="px-0 pt-2"
                 />
             </div>
        </div>
      </div>

      {/* FECHAMENTO MENSAL CONSOLIDADO (Formato Tabela Limpa) */}
      <section className="bg-white rounded-3xl shadow-[0_2px_20px_-3px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden mt-10">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <Trophy className="w-6 h-6 text-amber-400" />
              <div>
                  <h2 className="text-xl font-bold font-headline text-slate-800">Fechamento Mensal Consolidado</h2>
                  <p className="text-slate-500 text-xs mt-0.5">Visão consolidada do faturamento e produção mensal da base.</p>
              </div>
          </div>
          
          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-white text-slate-400 font-bold uppercase tracking-widest text-[10px] border-b border-slate-100">
                  <tr>
                    <th className="p-5 pl-8 border-r border-slate-50 w-48">Período Referência</th>
                    <th className="p-5 border-r border-slate-50">Volume (Dias Apurados)</th>
                    <th className="p-5 border-r border-slate-50 text-emerald-500">Qtd. Limpos</th>
                    <th className="p-5 border-r border-slate-50 text-amber-500">Qtd. Testados</th>
                    <th className="p-5 pr-8 text-indigo-500 font-black">Produção Global</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                   {fechamentoMensal.slice((fechamentoPage - 1) * ITEMS_PER_PAGE, fechamentoPage * ITEMS_PER_PAGE).map((f, i) => (
                     <motion.tr 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 + 0.3, duration: 0.4 }}
                        key={f.month} 
                        className="hover:bg-slate-50/50 transition-colors"
                     >
                        <td className="p-5 pl-8 font-black text-slate-700 font-headline text-base">{f.month}</td>
                        <td className="p-5 font-bold text-slate-500 bg-slate-50/30">{f.diasTrabalhados} dias</td>
                        <td className="p-5 text-emerald-600 font-black text-lg">{f.limpos.toLocaleString()}</td>
                        <td className="p-5 text-amber-500 font-black text-lg bg-slate-50/30">{f.testados.toLocaleString()}</td>
                        <td className="p-5 pr-8 text-indigo-600 font-black text-xl">{f.total.toLocaleString()}</td>
                     </motion.tr>
                   ))}
                </tbody>
              </table>
              <Pagination
                currentPage={fechamentoPage}
                totalItems={fechamentoMensal.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setFechamentoPage}
                className="px-6"
              />
              {fechamentoMensal.length === 0 && (
                 <div className="p-12 text-center text-slate-400 font-medium bg-slate-50/30">
                     Nenhum fechamento disponível para o escopo selecionado.
                 </div>
              )}
          </div>
      </section>

      {/* Off-screen report container for PNG generation */}
      {showReport && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1 }}>
          <ReportMonitoramento
            ref={reportRef}
            kpis={kpis}
            dataByFuncionario={dataByFuncionario}
            periodoLabel={periodoLabel}
            dataGeracao={dataGeracao}
          />
        </div>
      )}
    </div>
  );
}


