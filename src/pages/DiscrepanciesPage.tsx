import React, { useMemo, useState } from "react";
import {
  Search,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  PieChart,
  ShieldCheck,
  FileX2,
  X,
  ListOrdered
} from "lucide-react";
import { cn } from "../lib/utils";
import { useData } from "../context/DataContext";

type TimeFilter = "dia" | "semana" | "mes" | "ano" | "custom";
type RankingType = "infratores" | "melhores" | "auditores" | null;

export default function DiscrepanciesView() {
  const { discrepanciesData, technicians: registeredTechnicians } = useData();
  const [techFilter, setTechFilter] = useState("");
  const [selectedTech, setSelectedTech] = useState<string | null>(null);
  
  const [period, setPeriod] = useState<TimeFilter>("mes");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [rankingModalOpen, setRankingModalOpen] = useState<RankingType>(null);
  
  const [timelineSearch, setTimelineSearch] = useState("");
  const [timelineAuditorFilter, setTimelineAuditorFilter] = useState("all");
  const [timelineSeverityFilter, setTimelineSeverityFilter] = useState("all");

  const stats = useMemo(() => {
    if (!discrepanciesData || discrepanciesData.length === 0) return null;

    let startD: Date | undefined = customStart ? new Date(customStart + "T00:00:00") : undefined;
    let endD: Date | undefined = customEnd ? new Date(customEnd + "T23:59:59") : undefined;
    if (startD && !endD) endD = new Date(startD.getTime() + 86400000 - 1);

    const now = new Date();
    if (period !== "custom") {
        if (period === "dia") {
            startD = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endD = new Date(startD.getTime() + 86400000 - 1);
        } else if (period === "semana") {
            const day = now.getDay() || 7; 
            if (day !== 1) now.setHours(-24 * (day - 1)); 
            startD = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endD = new Date(startD.getTime() + 7 * 86400000 - 1);
        } else if (period === "mes") {
            startD = new Date(now.getFullYear(), now.getMonth(), 1);
            endD = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        } else if (period === "ano") {
            startD = new Date(now.getFullYear(), 0, 1);
            endD = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        }
    }

    const records = techFilter 
      ? discrepanciesData.filter(r => {
          const tech = r.TECNICO || r.CLIENTE || "Técnico Desconhecido";
          return tech.toLowerCase().includes(techFilter.toLowerCase());
        })
      : discrepanciesData;

    const dateFilteredRecords = records.filter(r => {
        let tempDate: Date | null = null;
        if (typeof r["DATA/HORA_FECHAMENTO"] === "number") {
             tempDate = new Date((r["DATA/HORA_FECHAMENTO"] - 25569) * 86400 * 1000);
        } else if (r["DATA/HORA_FECHAMENTO"]) {
             const parts = String(r["DATA/HORA_FECHAMENTO"]).substr(0, 10).split('/');
             if (parts.length === 3) tempDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`);
        }
        
        if (!tempDate) return true;
        if (startD && tempDate < startD) return false;
        if (endD && tempDate > endD) return false;
        
        return true;
    });

    const techMap = new Map<string, number>();
    const audMap = new Map<string, number>();
    const diagMap = new Map<string, number>();
    const serviceMap = new Map<string, number>();

    if (registeredTechnicians) {
        registeredTechnicians.forEach(t => {
            if (t.status === "Ativo") {
                techMap.set(t.name.toUpperCase(), 0);
            }
        });
    }

    dateFilteredRecords.forEach(r => {
       const techRaw = r.TECNICO || r.CLIENTE || "Técnico Desconhecido";
       const tech = techRaw.toUpperCase();
       techMap.set(techRaw, (techMap.get(techRaw) || techMap.get(tech) || 0) + 1);

       const aud = r.AUDITOR || "Auditor Não Informado";
       audMap.set(aud, (audMap.get(aud) || 0) + 1);

       const diag = r.DIAGNOSTICO_MENSAGEM_OS || "Não Informado";
       diagMap.set(diag, (diagMap.get(diag) || 0) + 1);
       
       const service = r.ASSUNTO_SERVIÇO_REALIZADO || "Não Informado";
       serviceMap.set(service, (serviceMap.get(service) || 0) + 1);
    });

    const allTechniciansDesc = Array.from(techMap.entries())
      .map(([name, count]) => ({ name, count, percentage: 0 }))
      .sort((a, b) => b.count - a.count);
      
    if (allTechniciansDesc.length > 0) {
      const maxTech = allTechniciansDesc[0].count;
      allTechniciansDesc.forEach(t => t.percentage = (t.count / maxTech) * 100);
    }
    const technicians = allTechniciansDesc.slice(0, 5);

    const allTechniciansAsc = [...allTechniciansDesc].sort((a, b) => a.count - b.count);
    if (allTechniciansAsc.length > 0) {
      const maxBest = allTechniciansAsc[allTechniciansAsc.length - 1].count;
      allTechniciansAsc.forEach(t => t.percentage = (t.count / maxBest) * 100);
    }
    const bestTechnicians = allTechniciansAsc.slice(0, 5);

    const allAuditors = Array.from(audMap.entries())
      .map(([name, count]) => ({ name, count, percentage: 0 }))
      .sort((a, b) => b.count - a.count);
    if (allAuditors.length > 0) {
      const maxAud = allAuditors[0].count;
      allAuditors.forEach(a => a.percentage = (a.count / maxAud) * 100);
    }
    const auditors = allAuditors.slice(0, 5);

    const diagnostics = Array.from(diagMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4); 
      
    const services = Array.from(serviceMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4); 
    
    const totalDiags = dateFilteredRecords.length;
    const colors = ["bg-primary", "bg-indigo-400", "bg-purple-400", "bg-rose-400"];

    const cardsRaw = [...dateFilteredRecords].reverse().map((r, i) => {
        let dateStr = String(r["DATA/HORA_FECHAMENTO"] || "");
        if (typeof r["DATA/HORA_FECHAMENTO"] === "number") {
             const tempDate = new Date((r["DATA/HORA_FECHAMENTO"] - 25569) * 86400 * 1000);
             dateStr = tempDate.toLocaleDateString('pt-BR');
        } else if (dateStr.length > 10) {
             dateStr = dateStr.substring(0, 10);
        }

        const msgString = r.DIAGNOSTICO_MENSAGEM_OS || r.MENSAGEM_OS || "Detalhe da divergência omitido no apontamento.";
        const isCritical = msgString.toLowerCase().includes("crítico") || msgString.toLowerCase().includes("vza");

        return {
           id: String(i),
           title: r.ASSUNTO_OS || r.ASSUNTO_SERVIÇO_REALIZADO || "O.S Com Divergência",
           date: dateStr,
           description: msgString,
           auditor: r.AUDITOR || "Desconhecido",
           technician: r.TECNICO || r.CLIENTE || "Desconhecido",
           severity: isCritical ? "high" : "medium"
        };
    });

    return { 
        technicians, allTechniciansDesc, 
        bestTechnicians, allTechniciansAsc, 
        auditors, allAuditors, 
        diagnostics, services, 
        totalDiags, cardsRaw, colors,
        dateFilteredRecords
    };
  }, [discrepanciesData, registeredTechnicians, techFilter, period, customStart, customEnd]);

  const cardsRaw = stats?.cardsRaw || [];

  const { filteredCards, availableAuditors } = useMemo(() => {
    if (!cardsRaw || cardsRaw.length === 0) return { filteredCards: [], availableAuditors: [] };
    
    const availableAuditors = Array.from(new Set(cardsRaw.map((c: any) => c.auditor))).sort() as string[];
    
    const filtered = cardsRaw.filter((c: any) => {
       const searchLower = timelineSearch.toLowerCase();
       if (timelineSearch && !c.title.toLowerCase().includes(searchLower) && !c.description.toLowerCase().includes(searchLower) && !c.technician.toLowerCase().includes(searchLower)) return false;
       if (timelineAuditorFilter !== "all" && c.auditor !== timelineAuditorFilter) return false;
       if (timelineSeverityFilter !== "all" && c.severity !== timelineSeverityFilter) return false;
       return true;
    }).slice(0, 50);

    return { filteredCards: filtered, availableAuditors };
  }, [cardsRaw, timelineSearch, timelineAuditorFilter, timelineSeverityFilter]);

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200 shadow-inner">
           <FileX2 className="w-10 h-10 text-slate-300" />
        </div>
        <div className="max-w-md">
          <h2 className="text-2xl font-headline font-bold text-slate-700 mb-2">Base de Divergências Vazia</h2>
          <p className="text-slate-500 font-medium">Você precisa importar o arquivo de Divergências dos Técnicos na aba "Importação" para popular esse painel.</p>
        </div>
      </div>
    );
  }

  const { 
    technicians, allTechniciansDesc, 
    bestTechnicians, allTechniciansAsc, 
    auditors, allAuditors, 
    diagnostics, services, 
    totalDiags, colors,
    dateFilteredRecords
  } = stats;

  const currentRankingList = 
    rankingModalOpen === 'infratores' ? allTechniciansDesc :
    rankingModalOpen === 'melhores' ? allTechniciansAsc :
    rankingModalOpen === 'auditores' ? allAuditors : [];

  return (
    <>
      <div className="space-y-10 animate-in fade-in duration-500">
        <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-8">
            <div className="max-w-2xl">
                <h2 className="text-4xl font-extrabold text-primary font-headline tracking-tight mb-3">
                    Divergências Técnicas
                </h2>
                <p className="text-slate-500 text-lg leading-relaxed">
                    Monitoramento de erros e retrabalhos identificados pelos Auditores em campo.
                </p>
            </div>
            <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-3 bg-surface-container-low p-1.5 rounded-xl ml-auto">
                    <button
                        onClick={() => setPeriod("dia")}
                        className={cn("px-5 py-2 text-sm font-semibold rounded-lg transition-colors", period === "dia" ? "bg-surface-container-lowest text-primary shadow-sm" : "text-slate-500 hover:text-primary")}
                    >Dia</button>
                    <button
                        onClick={() => setPeriod("semana")}
                        className={cn("px-5 py-2 text-sm font-semibold rounded-lg transition-colors", period === "semana" ? "bg-surface-container-lowest text-primary shadow-sm" : "text-slate-500 hover:text-primary")}
                    >Semanal</button>
                    <button
                        onClick={() => setPeriod("mes")}
                        className={cn("px-5 py-2 text-sm font-semibold rounded-lg transition-colors", period === "mes" ? "bg-surface-container-lowest text-primary shadow-sm" : "text-slate-500 hover:text-primary")}
                    >Mensal</button>
                    <button
                        onClick={() => setPeriod("ano")}
                        className={cn("px-5 py-2 text-sm font-semibold rounded-lg transition-colors", period === "ano" ? "bg-surface-container-lowest text-primary shadow-sm" : "text-slate-500 hover:text-primary")}
                    >Anual</button>
                    <div className="w-px h-4 bg-outline-variant/30 mx-1"></div>
                    <div className={cn("flex flex-col sm:flex-row items-center gap-2 px-2 py-1 rounded-lg transition-colors", period === "custom" ? "bg-surface-container-lowest shadow-sm" : "")}>
                        <button
                        onClick={() => setPeriod("custom")}
                        className={cn("px-3 py-1.5 text-sm font-semibold rounded-md transition-colors", period === "custom" ? "text-primary" : "text-slate-500 hover:text-primary")}
                        >Personalizado</button>
                        {period === "custom" && (
                        <div className="flex items-center gap-2 text-sm">
                            <input
                            type="date"
                            value={customStart}
                            onChange={(e) => setCustomStart(e.target.value)}
                            className="bg-transparent border border-outline-variant/30 rounded px-2 py-1 text-slate-700 outline-none focus:border-primary"
                            />
                            <span className="text-slate-400">até</span>
                            <input
                            type="date"
                            value={customEnd}
                            onChange={(e) => setCustomEnd(e.target.value)}
                            className="bg-transparent border border-outline-variant/30 rounded px-2 py-1 text-slate-700 outline-none focus:border-primary"
                            />
                        </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-end md:items-center gap-3 justify-end">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                        type="text"
                        placeholder="Buscar por técnico..."
                        value={techFilter}
                        onChange={(e) => setTechFilter(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-w-[260px] text-sm text-slate-700"
                        />
                    </div>
                    <div className="bg-white px-5 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Casos no Período</p>
                            <p className="text-base font-black text-slate-700 leading-none mt-1">{totalDiags}</p>
                        </div>
                    </div>
                </div>
            </div>
        </header>

        {/* Linha 1: Rankings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/10 flex flex-col overflow-hidden">
                <div className="p-6 pb-2">
                    <h3 className="text-base font-bold text-error font-headline flex items-center gap-2 mb-6">
                        <AlertCircle className="w-5 h-5 text-error" /> Top 5 Infratores
                    </h3>
                    <div className="space-y-5">
                        {technicians.map((tech, i) => (
                        <div key={i} className="cursor-pointer group" onClick={() => setSelectedTech(tech.name)}>
                            <div className="flex justify-between text-[11px] font-bold mb-1">
                            <span className="text-slate-700 uppercase group-hover:text-primary transition-colors">{tech.name}</span>
                            <span className="text-error">{tech.count} Falhas</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-error h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${tech.percentage}%` }}></div>
                            </div>
                        </div>
                        ))}
                    </div>
                </div>
                <button onClick={() => setRankingModalOpen('infratores')} className="mt-auto px-6 py-3 bg-slate-50/50 border-t border-slate-100 text-xs font-bold text-slate-500 hover:text-primary transition-colors flex items-center justify-center gap-2">
                    <ListOrdered className="w-4 h-4" /> VER RANKING COMPLETO
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/10 flex flex-col overflow-hidden">
                <div className="p-6 pb-2">
                    <h3 className="text-base font-bold text-emerald-500 font-headline flex items-center gap-2 mb-6">
                        <ShieldCheck className="w-5 h-5 text-emerald-500" /> Menos Divergência
                    </h3>
                    <div className="space-y-5">
                        {bestTechnicians.map((tech, i) => (
                        <div key={i} className="cursor-pointer group" onClick={() => setSelectedTech(tech.name)}>
                            <div className="flex justify-between text-[11px] font-bold mb-1">
                            <span className="text-slate-700 uppercase group-hover:text-primary transition-colors">{tech.name}</span>
                            <span className="text-emerald-500">{tech.count} Falhas</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${tech.percentage}%` }}></div>
                            </div>
                        </div>
                        ))}
                    </div>
                </div>
                <button onClick={() => setRankingModalOpen('melhores')} className="mt-auto px-6 py-3 bg-slate-50/50 border-t border-slate-100 text-xs font-bold text-slate-500 hover:text-primary transition-colors flex items-center justify-center gap-2">
                    <ListOrdered className="w-4 h-4" /> VER RANKING COMPLETO
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/10 flex flex-col overflow-hidden">
                <div className="p-6 pb-2">
                    <h3 className="text-base font-bold text-tertiary font-headline flex items-center gap-2 mb-6">
                        <CheckCircle2 className="w-5 h-5 text-tertiary" /> Reporte Diário (Auditores)
                    </h3>
                    <div className="space-y-5">
                        {auditors.map((auditor, i) => (
                        <div key={i}>
                            <div className="flex justify-between text-[11px] font-bold mb-1">
                            <span className="text-slate-700 uppercase">{auditor.name}</span>
                            <span className="text-tertiary">{auditor.count} Reportes</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-tertiary h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${auditor.percentage}%` }}></div>
                            </div>
                        </div>
                        ))}
                    </div>
                </div>
                <button onClick={() => setRankingModalOpen('auditores')} className="mt-auto px-6 py-3 bg-slate-50/50 border-t border-slate-100 text-xs font-bold text-slate-500 hover:text-primary transition-colors flex items-center justify-center gap-2">
                    <ListOrdered className="w-4 h-4" /> VER RANKING COMPLETO
                </button>
            </div>
        </div>

        {/* Linha 2: Graficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-outline-variant/10 flex flex-col">
                <h3 className="text-base font-bold text-primary font-headline flex items-center gap-2 mb-4">
                    <PieChart className="w-5 h-5 text-primary" /> Top Motivos (Diagnósticos)
                </h3>
                <div className="flex-1 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-slate-100/50 pt-6">
                    <div className="relative w-32 h-32 shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="4"></circle>
                        {diagnostics[0] && (
                        <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#1a237e" strokeWidth="4" strokeDasharray={`${(diagnostics[0].count / totalDiags) * 100} 100`}></circle>
                        )}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-2xl font-black text-primary font-headline leading-none">
                        {diagnostics[0] ? Math.round((diagnostics[0].count / totalDiags) * 100) : 0}%
                        </span>
                    </div>
                    </div>
                    <div className="flex-1 space-y-4 w-full">
                    {diagnostics.map((diag, i) => (
                        <div key={i} className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors[i] || 'bg-slate-300'}`}></div>
                                <span className="text-xs font-bold text-slate-700 truncate uppercase" title={diag.name}>{diag.name}</span>
                            </div>
                            <span className="text-[10px] font-black text-slate-400 ml-4.5">{diag.count} Casos</span>
                        </div>
                    ))}
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-outline-variant/10 flex flex-col">
                <h3 className="text-base font-bold text-indigo-500 font-headline flex items-center gap-2 mb-4">
                    <PieChart className="w-5 h-5 text-indigo-500" /> Top Tipos de Serviços
                </h3>
                <div className="flex-1 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-slate-100/50 pt-6">
                    <div className="relative w-32 h-32 shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="4"></circle>
                        {services[0] && (
                        <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#6366f1" strokeWidth="4" strokeDasharray={`${(services[0].count / totalDiags) * 100} 100`}></circle>
                        )}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-2xl font-black text-indigo-500 font-headline leading-none">
                        {services[0] ? Math.round((services[0].count / totalDiags) * 100) : 0}%
                        </span>
                    </div>
                    </div>
                    <div className="flex-1 space-y-4 w-full">
                    {services.map((svc, i) => (
                        <div key={i} className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors[i] || 'bg-slate-300'}`}></div>
                                <span className="text-xs font-bold text-slate-700 truncate uppercase" title={svc.name}>{svc.name}</span>
                            </div>
                            <span className="text-[10px] font-black text-slate-400 ml-4.5">{svc.count} Casos</span>
                        </div>
                    ))}
                    </div>
                </div>
            </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <h3 className="text-xl font-bold font-headline text-slate-800">Timeline de Divergências <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full ml-2">50 mais recentes</span></h3>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <div className="relative w-full sm:w-auto">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar na timeline..."
                        value={timelineSearch}
                        onChange={(e) => setTimelineSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-full sm:w-[220px] text-sm text-slate-700"
                    />
                </div>
                
                <div className="relative w-full sm:w-auto">
                    <select
                        value={timelineAuditorFilter}
                        onChange={(e) => setTimelineAuditorFilter(e.target.value)}
                        className="py-2 pl-3 pr-8 bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm text-slate-700 w-full appearance-none"
                    >
                        <option value="all">Todos os Auditores</option>
                        {availableAuditors.map((aud: string) => (
                            <option key={aud} value={aud}>{aud}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>

                <div className="relative w-full sm:w-auto">
                    <select
                        value={timelineSeverityFilter}
                        onChange={(e) => setTimelineSeverityFilter(e.target.value)}
                        className="py-2 pl-3 pr-8 bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm text-slate-700 w-full appearance-none"
                    >
                        <option value="all">Todas Severidades</option>
                        <option value="high">Crítico</option>
                        <option value="medium">Médio/Normal</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {filteredCards.length === 0 ? (
                <div className="col-span-1 xl:col-span-2 py-10 flex flex-col items-center justify-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <Search className="w-8 h-8 text-slate-400 mb-2" />
                    <p className="font-semibold">Nenhuma divergência encontrada com estes filtros.</p>
                </div>
            ) : filteredCards.map((card: any) => (
            <div key={card.id} className="bg-white p-8 rounded-xl shadow-sm border border-transparent hover:border-slate-200 hover:shadow-md transition-all flex flex-col group relative overflow-hidden">
                <div className={cn("absolute top-0 left-0 w-1.5 h-full", card.severity === "high" ? "bg-error" : "bg-amber-400")}></div>
                <div className="flex justify-between items-start mb-6 gap-4">
                <h3 className="text-xl font-black text-slate-800 font-headline leading-tight">{card.title}</h3>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-100 shrink-0">{card.date}</span>
                </div>
                <div className="text-slate-600 text-sm mb-8 leading-relaxed bg-slate-50/50 p-4 rounded-lg border border-slate-100 italic break-words">
                "{card.description}"
                </div>
                <div className="grid grid-cols-2 gap-6 mt-auto">
                <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Auditor (Correção)</p>
                    <div className="flex items-center gap-2"><span className="text-xs font-black text-slate-700 uppercase">{card.auditor}</span></div>
                </div>
                <div>
                    <p className="text-[9px] font-bold text-error/60 uppercase tracking-widest mb-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Reprovado Por (Técnico)</p>
                    <div className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors" onClick={() => setSelectedTech(card.technician)}>
                        <span className="text-xs font-black text-slate-700 uppercase">{card.technician}</span>
                    </div>
                </div>
                </div>
            </div>
            ))}
        </div>
      </div>

      {/* MODAL DETALHAMENTO DO TÉCNICO */}
      {selectedTech && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-black font-headline text-slate-800 uppercase flex items-center gap-2">
                  <Search className="w-5 h-5 text-primary" />
                  {selectedTech}
                </h3>
                <p className="text-sm font-medium text-slate-500 mt-1">Mensagens de Diagnóstico Registradas no Período</p>
              </div>
              <button 
                onClick={() => setSelectedTech(null)} 
                className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-3 bg-slate-50/50">
              {dateFilteredRecords
                ?.filter((r: any) => {
                    const tech = r.TECNICO || r.CLIENTE || "Técnico Desconhecido";
                    return tech === selectedTech;
                })
                .map((r: any, i: number) => {
                    const diag = r.DIAGNOSTICO_MENSAGEM_OS || r.MENSAGEM_OS || "Não Informado";
                    const assunto = r.ASSUNTO_SERVIÇO_REALIZADO || r.ASSUNTO_OS || "O.S";
                    return (
                      <div key={i} className="p-4 bg-white border border-slate-200 rounded-xl relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-300 group-hover:bg-primary transition-colors"></div>
                        <div className="ml-2 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{assunto}</p>
                                <p className="text-sm font-semibold text-slate-700 leading-relaxed">"{diag}"</p>
                            </div>
                            {r.ID_CLIENTE && (
                                <div className="shrink-0 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-right flex flex-col items-end justify-center">
                                    <p className="text-[8px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">Cód. Cliente</p>
                                    <p className="text-xs font-black text-indigo-500 font-headline">{r.ID_CLIENTE}</p>
                                </div>
                            )}
                        </div>
                      </div>
                    );
                })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL RANKING UNIFICADO */}
      {rankingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="text-xl font-black font-headline text-slate-800 uppercase flex items-center gap-2">
                            <ListOrdered className="w-5 h-5 text-primary" />
                            {rankingModalOpen === 'infratores' ? 'Ranking Completo de Infratores' : 
                             rankingModalOpen === 'melhores' ? 'Ranking Completo de Qualidade' : 
                             'Ranking Completo de Auditores'}
                        </h3>
                        <p className="text-sm font-medium text-slate-500 mt-1">Lista expandida com todos os registros do período</p>
                    </div>
                    <button 
                        onClick={() => setRankingModalOpen(null)} 
                        className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto flex-1 space-y-2 bg-slate-50/50">
                    {currentRankingList.map((item, i) => (
                        <div 
                            key={i} 
                            onClick={() => {
                                if(rankingModalOpen !== 'auditores') {
                                    setSelectedTech(item.name);
                                }
                            }}
                            className={cn(
                                "flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl relative overflow-hidden group shadow-sm transition-all",
                                rankingModalOpen !== 'auditores' ? "cursor-pointer hover:shadow-md hover:border-slate-300" : ""
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-lg text-sm font-bold text-slate-500">
                                    #{i + 1}
                                </div>
                                <span className={cn(
                                    "text-sm font-bold uppercase",
                                    rankingModalOpen !== 'auditores' ? "group-hover:text-primary transition-colors text-slate-700" : "text-slate-700"
                                )}>
                                    {item.name}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-right">
                                <div className={cn(
                                    "text-sm font-black",
                                    rankingModalOpen === 'infratores' ? "text-error" : 
                                    rankingModalOpen === 'melhores' ? "text-emerald-500" : "text-tertiary"
                                )}>
                                    {item.count} <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{rankingModalOpen === 'auditores' ? 'Reportes' : 'Falhas'}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}
    </>
  );
}
