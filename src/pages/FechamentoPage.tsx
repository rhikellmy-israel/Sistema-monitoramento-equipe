import React, { useMemo, useState } from "react";
import { useData } from "../context/DataContext";
import { motion } from "motion/react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LabelList, Cell, AreaChart, Area, Legend } from "recharts";
import { Box, CheckCircle, TrendingUp, Calendar, ArrowRightLeft, Activity, Filter, BarChart2, List, MonitorCheck, Trash2, Inbox, Wrench, ShieldAlert } from "lucide-react";
import { cn } from "../lib/utils";
import DateFilter from "../components/DateFilter";
import { DateFilterMode, isDateMatch, normalizeDateToISO, formatToBR } from "../lib/dateUtils";
import AnimatedCounter from "../components/AnimatedCounter";

export default function FechamentoPage() {
  const { fechamentoData, productionEntries, entradasSetorData, saidasSetorData } = useData();
  const [filterMode, setFilterMode] = useState<DateFilterMode>("Todas");
  const [filterValue, setFilterValue] = useState("");
  const [filterEquipamento, setFilterEquipamento] = useState("");
  const [viewMode, setViewMode] = useState<"grafico" | "lista">("grafico");
  const [activeSubTab, setActiveSubTab] = useState<"geral" | "avarias">("geral");


  // Filtro Global da Aba
  const filteredData = useMemo(() => {
     let base = fechamentoData;
     if (filterMode !== "Todas" && filterValue.trim() !== "") {
        base = base.filter(d => isDateMatch(normalizeDateToISO(d.data_criacao) || "", filterMode, filterValue));
     }
     return base;
  }, [fechamentoData, filterMode, filterValue]);

  // Filtro das entradas de produção
  const filteredProduction = useMemo(() => {
     let base = productionEntries;
     if (filterMode !== "Todas" && filterValue.trim() !== "") {
        base = base.filter(d => isDateMatch(normalizeDateToISO(d.date) || "", filterMode, filterValue));
     }
     return base;
  }, [productionEntries, filterMode, filterValue]);

  // Filtro das Entradas no Setor
  const filteredEntradasSetor = useMemo(() => {
     let base = entradasSetorData || [];
     if (filterMode !== "Todas" && filterValue.trim() !== "") {
        base = base.filter(d => isDateMatch(normalizeDateToISO(d.data_criacao) || "", filterMode, filterValue));
     }
     return base;
  }, [entradasSetorData, filterMode, filterValue]);

  // Filtro das Saídas do Setor
  const filteredSaidasSetor = useMemo(() => {
     let base = saidasSetorData || [];
     if (filterMode !== "Todas" && filterValue.trim() !== "") {
        base = base.filter(d => isDateMatch(normalizeDateToISO(d.data_criacao) || "", filterMode, filterValue));
     }
     return base;
  }, [saidasSetorData, filterMode, filterValue]);

  // Cálculo das Métricas de Assistência e Avarias
  const avariasKpis = useMemo(() => {
     const totalEntradas = filteredEntradasSetor.reduce((acc, curr) => acc + (Number(curr.quantidade) || 0), 0);
     const totalMovimentado = filteredData.length;

     let totalSucata = 0;
     let totalConsertoMinas = 0;
     let totalRma = 0;

     filteredSaidasSetor.forEach(s => {
        const dest = (s.almoxarifado_destino || "").toUpperCase().trim();
        const qty = Number(s.quantidade) || 0;
        if (dest.includes("SUCATA")) {
           totalSucata += qty;
        } else if (dest.includes("MINAS") || dest.includes("CONSERTO")) {
           totalConsertoMinas += qty;
        } else if (dest.includes("RMA")) {
           totalRma += qty;
        }
     });

     const pctSucata = totalEntradas > 0 ? (totalSucata / totalEntradas) * 100 : 0;
     const pctConsertoMinas = totalEntradas > 0 ? (totalConsertoMinas / totalEntradas) * 100 : 0;
     const pctRma = totalEntradas > 0 ? (totalRma / totalEntradas) * 100 : 0;
     const pctMovimentado = totalEntradas > 0 ? (totalMovimentado / totalEntradas) * 100 : 0;

     return {
        totalEntradas,
        totalMovimentado,
        movimentado: { qtd: totalMovimentado, pct: pctMovimentado },
        sucata: { qtd: totalSucata, pct: pctSucata },
        consertoMinas: { qtd: totalConsertoMinas, pct: pctConsertoMinas },
        rma: { qtd: totalRma, pct: pctRma }
     };
  }, [filteredEntradasSetor, filteredSaidasSetor, filteredData]);

  // Agrupamento temporal para gráfico de Avarias
  const avariasTemporalData = useMemo(() => {
     const dataMap = new Map<string, { dataStr: string, sucata: number, conserto: number, rma: number }>();

     filteredSaidasSetor.forEach(s => {
        const isoDate = normalizeDateToISO(s.data_criacao);
        if (!isoDate) return;
        const displayDate = formatToBR(isoDate);
        const dest = (s.almoxarifado_destino || "").toUpperCase().trim();
        const qty = Number(s.quantidade) || 0;

        const current = dataMap.get(isoDate) || { dataStr: displayDate, sucata: 0, conserto: 0, rma: 0 };
        if (dest.includes("SUCATA")) {
           current.sucata += qty;
        } else if (dest.includes("MINAS") || dest.includes("CONSERTO")) {
           current.conserto += qty;
        } else if (dest.includes("RMA")) {
           current.rma += qty;
        }
        dataMap.set(isoDate, current);
     });

     return Array.from(dataMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([_, v]) => v);
  }, [filteredSaidasSetor]);


  const kpis = useMemo(() => {
     const total = filteredData.length;
     const comodato = filteredData.filter(d => d.situacao?.toUpperCase().includes('COMODATO')).length;
     const taxa = total > 0 ? (comodato / total) * 100 : 0;

     // Acumular fontes testadas e descartadas
     let totalFontesTestadas = 0;
     let totalFontesDescartadas = 0;
     filteredProduction.forEach(e => {
        totalFontesTestadas += Number(e.fontes_aprovadas) || 0;
        totalFontesDescartadas += Number(e.fontes_descarte) || 0;
     });

     return { total, comodato, taxa, totalFontesTestadas, totalFontesDescartadas };
  }, [filteredData, filteredProduction]);

  const equipamentosPorModelo = useMemo(() => {
     const counts = new Map<string, number>();
     filteredData.forEach(d => {
         let prod = d.descricao?.trim() || "DESCONHECIDO";
         counts.set(prod, (counts.get(prod) || 0) + 1);
     });
     
     const colors = ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#ec4899", "#14b8a6", "#eab308"];
     let filteredArr = Array.from(counts.entries())
       .map(([name, count], index) => ({ name, count, fill: colors[index % colors.length] }))
       .sort((a,b) => b.count - a.count);
       
     if (filterEquipamento.trim()) {
         const searchTerms = filterEquipamento.toLowerCase().split(',').map(t => t.trim()).filter(Boolean);
         
         if (searchTerms.length > 0) {
             filteredArr = filteredArr.filter(e => {
                 const nameLower = e.name.toLowerCase();
                 return searchTerms.some(term => nameLower.includes(term));
             });
         }
     }
     
     return filteredArr;
  }, [filteredData, filterEquipamento]);

  const dailyData = useMemo(() => {
     let base = filteredData;
     
     const diasMap = new Map<string, Map<string, number>>();
     base.forEach(d => {
        const iso = normalizeDateToISO(d.data_criacao);
        const dia = iso ? formatToBR(iso) : "Sem Data";
        const prod = d.descricao?.trim() || "DESCONHECIDO";
        if (!diasMap.has(dia)) diasMap.set(dia, new Map());
        const prodMap = diasMap.get(dia)!;
        prodMap.set(prod, (prodMap.get(prod) || 0) + 1);
     });

     return Array.from(diasMap.entries()).map(([dia, prodMap]) => {
         let total = 0;
         const produtos = Array.from(prodMap.entries()).map(([nome, qtd]) => {
            total += qtd;
            return { nome, qtd };
         }).sort((a,b) => b.qtd - a.qtd);
         
         return { dia, total, produtos };
     }).sort((a,b) => {
         const aParts = a.dia.split('/');
         const bParts = b.dia.split('/');
         if (aParts.length === 3 && bParts.length === 3) {
             const compA = `${aParts[2]}-${aParts[1]}-${aParts[0]}`;
             const compB = `${bParts[2]}-${bParts[1]}-${bParts[0]}`;
             return compB.localeCompare(compA);
         }
         return b.dia.localeCompare(a.dia);
     });
  }, [filteredData]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-primary font-headline tracking-tight">
            Fechamento Setor
          </h1>
          <p className="text-slate-500 text-lg leading-relaxed mt-2 font-medium">
            Painel analítico das movimentações entre o Laboratório de Testes e Base Principal.
          </p>
        </div>
        
        <div className="flex flex-col gap-3 min-w-[320px]">
          <DateFilter 
             mode={filterMode} 
             value={filterValue} 
             onChange={(m, v) => { setFilterMode(m); setFilterValue(v); }} 
             className="bg-white/90 backdrop-blur"
          />
        </div>
      </header>

      {/* Sub-Tabs Switcher */}
      <div className="flex border-b border-slate-200/80 pb-px">
        <button
          onClick={() => setActiveSubTab("geral")}
          className={cn(
            "px-6 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeSubTab === "geral"
              ? "border-primary text-primary"
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <Activity className="w-4 h-4" /> Visão Geral
        </button>
        <button
          onClick={() => setActiveSubTab("avarias")}
          className={cn(
            "px-6 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeSubTab === "avarias"
              ? "border-primary text-primary"
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <Wrench className="w-4 h-4" /> Assistência & Avarias
        </button>
      </div>

      {activeSubTab === "geral" ? (
        <>
          {/* KPIs Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            <motion.div initial={{ y:-20, opacity:0 }} animate={{ y:0, opacity:1 }} transition={{ delay:0.1 }} className="bg-white p-7 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group hover:border-indigo-200 hover:shadow-indigo-500/10 transition-all">
              <div className="absolute bottom-0 right-0 p-4 opacity-5 group-hover:opacity-15 group-hover:text-indigo-500 transition-all translate-x-2 translate-y-2 pointer-events-none">
                 <ArrowRightLeft className="w-24 h-24" />
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center text-indigo-600 transition-colors shadow-inner">
                   <Box className="w-6 h-6" />
                </div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Total Movimentado</h3>
              </div>
              <div className="flex justify-between items-end">
                <div className="text-4xl font-black text-slate-800 font-headline tracking-tighter">
                  <AnimatedCounter value={kpis.total} />
                </div>
                {avariasKpis.totalEntradas > 0 && (
                  <div className="text-sm font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 font-headline" title={`${kpis.total} movimentados de ${avariasKpis.totalEntradas} entradas`}>
                    {avariasKpis.movimentado.pct.toFixed(1)}% das entradas
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div initial={{ y:-20, opacity:0 }} animate={{ y:0, opacity:1 }} transition={{ delay:0.2 }} className="bg-white p-7 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group hover:border-emerald-200 hover:shadow-emerald-500/10 transition-all">
              <div className="absolute bottom-0 right-0 p-4 opacity-5 group-hover:opacity-15 group-hover:text-emerald-500 transition-all translate-x-2 translate-y-2 pointer-events-none">
                 <CheckCircle className="w-24 h-24" />
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center text-emerald-600 transition-colors shadow-inner">
                   <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Aprovados (Comodato)</h3>
              </div>
              <div className="text-4xl font-black text-slate-800 font-headline tracking-tighter">
                <AnimatedCounter value={kpis.comodato} />
              </div>
            </motion.div>

            <motion.div initial={{ y:-20, opacity:0 }} animate={{ y:0, opacity:1 }} transition={{ delay:0.3 }} className="bg-gradient-to-br from-[#0f172a] to-indigo-900 p-7 rounded-3xl shadow-xl relative overflow-hidden group text-white border border-indigo-500/20">
              <div className="absolute bottom-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity translate-x-2 translate-y-2 pointer-events-none">
                 <TrendingUp className="w-24 h-24" />
              </div>
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
              
              <div className="relative flex items-center gap-4 mb-4 z-10">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400 backdrop-blur-md border border-white/10 shadow-inner">
                   <Activity className="w-6 h-6" />
                </div>
                <h3 className="text-xs font-bold text-indigo-100 uppercase tracking-widest whitespace-nowrap">Taxa de Conversão</h3>
              </div>
              <div className="relative text-4xl font-black font-headline tracking-tighter z-10 text-emerald-400 drop-shadow-md">
                <AnimatedCounter value={kpis.taxa} formatter={(v) => v.toFixed(1) + "%"} />
              </div>
            </motion.div>

            <motion.div initial={{ y:-20, opacity:0 }} animate={{ y:0, opacity:1 }} transition={{ delay:0.4 }} className="bg-white p-7 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group hover:border-indigo-200 hover:shadow-indigo-500/10 transition-all">
              <div className="absolute bottom-0 right-0 p-4 opacity-5 group-hover:opacity-15 group-hover:text-indigo-500 transition-all translate-x-2 translate-y-2 pointer-events-none">
                 <MonitorCheck className="w-24 h-24" />
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center text-indigo-600 transition-colors shadow-inner">
                   <MonitorCheck className="w-6 h-6" />
                </div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Fontes Testadas</h3>
              </div>
              <div className="text-4xl font-black text-slate-800 font-headline tracking-tighter">
                <AnimatedCounter value={kpis.totalFontesTestadas} />
              </div>
            </motion.div>

            <motion.div initial={{ y:-20, opacity:0 }} animate={{ y:0, opacity:1 }} transition={{ delay:0.5 }} className="bg-white p-7 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group hover:border-rose-200 hover:shadow-rose-500/10 transition-all">
              <div className="absolute bottom-0 right-0 p-4 opacity-5 group-hover:opacity-15 group-hover:text-rose-500 transition-all translate-x-2 translate-y-2 pointer-events-none">
                 <Trash2 className="w-24 h-24" />
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-rose-50 group-hover:bg-rose-100 flex items-center justify-center text-rose-600 transition-colors shadow-inner">
                   <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Fontes Descartadas</h3>
              </div>
              <div className="text-4xl font-black text-slate-800 font-headline tracking-tighter">
                <AnimatedCounter value={kpis.totalFontesDescartadas} />
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Bloco Analítico de Modelos Movimentados */}
            <div className="lg:col-span-2 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col overflow-hidden">
              <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 font-headline tracking-tight">Equipamentos Finalizados</h3>
                        <p className="text-sm text-slate-500 font-medium mt-1">Análise volumétrica por descrição de produto.</p>
                    </div>
                    {/* Toggles (Gráfico vs Lista) */}
                    <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                        <button 
                            onClick={() => setViewMode("grafico")}
                            className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all", viewMode === "grafico" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                        >
                            <BarChart2 className="w-4 h-4" /> Gráfico
                        </button>
                        <button 
                            onClick={() => setViewMode("lista")}
                            className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all", viewMode === "lista" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                        >
                            <List className="w-4 h-4" /> Lista
                        </button>
                    </div>
                </div>
                
                <div className="mt-6 flex items-center gap-3 px-5 py-3 bg-white border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition-all shadow-sm">
                    <Filter className="w-5 h-5 text-indigo-400 shrink-0" />
                    <input 
                        type="text" 
                        placeholder="Pesquisar categoria (Ex: Fonte, Roteador)" 
                        value={filterEquipamento} 
                        onChange={e => setFilterEquipamento(e.target.value)}
                        className="bg-transparent text-sm font-bold text-slate-700 outline-none w-full placeholder:font-medium placeholder:text-slate-400"
                    />
                </div>
              </div>
              
              <div className="flex-1 max-h-[650px] overflow-y-auto custom-scrollbar p-6 bg-white relative">
                 {equipamentosPorModelo.length > 0 ? (
                     viewMode === "grafico" ? (
                         <div style={{ height: Math.max(400, equipamentosPorModelo.length * 60), width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={equipamentosPorModelo} layout="vertical" margin={{ top: 5, right: 50, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={180} tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} />
                                    <RechartsTooltip 
                                        cursor={{fill: '#f8fafc'}} 
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700">
                                                        <p className="font-bold text-sm mb-1">{payload[0].payload.name}</p>
                                                        <p className="text-emerald-400 font-black flex items-center gap-2">
                                                            <Box className="w-4 h-4" /> {payload[0].value} unidades
                                                        </p>
                                                    </div>
                                                )
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={24}>
                                        {equipamentosPorModelo.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                        <LabelList dataKey="count" position="right" style={{ fill: '#334155', fontSize: 13, fontWeight: 900 }} formatter={(v: number) => v.toLocaleString()} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                         </div>
                     ) : (
                        <div className="space-y-3">
                         {equipamentosPorModelo.map((item, idx) => {
                             const maxVol = Math.max(...equipamentosPorModelo.map(e => e.count));
                             return (
                                 <motion.div initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} transition={{ delay:idx * 0.03 }} key={idx} className="relative p-4 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden group hover:bg-indigo-50/50 hover:border-indigo-300 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10 cursor-pointer">
                                    <div className="absolute top-0 left-0 h-full bg-indigo-100/50 group-hover:bg-indigo-200/50 transition-all duration-1000" style={{ width: `${(item.count / maxVol) * 100}%` }}></div>
                                    <div className="relative flex justify-between items-center gap-4">
                                        <span className="text-sm font-bold text-slate-700 truncate group-hover:text-indigo-900 transition-colors" title={item.name}>{item.name}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black text-indigo-700 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-indigo-100 shrink-0">
                                                {item.count.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                 </motion.div>
                             );
                         })}
                        </div>
                     )
                 ) : (
                     <div className="h-[400px] flex flex-col items-center justify-center text-slate-400 text-sm font-medium">
                         <Box className="w-12 h-12 text-slate-200 mb-3" />
                         Nenhum dado importado para exibir.
                     </div>
                 )}
              </div>
            </div>

            {/* Relatório Diário Listview */}
            <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col min-h-[600px] lg:h-auto overflow-hidden">
               <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                   <h3 className="text-xl font-bold text-slate-800 font-headline">Fluxo de Entradas Confirmadas</h3>
                   <div className="text-xs font-bold text-slate-400 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm uppercase tracking-wider">
                       {filteredData.length} Registros
                   </div>
               </div>

               <div className="flex-1 p-6 space-y-4 overflow-y-auto custom-scrollbar max-h-[650px]">
                   {dailyData.length === 0 ? (
                       <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50 pt-10">
                           <Calendar className="w-12 h-12 mb-3" />
                           <span className="text-sm font-bold">Sem movimentações</span>
                       </div>
                   ) : (
                       dailyData.map((diaInfo, i) => (
                           <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.05 }}
                              key={diaInfo.dia}
                              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-[0_2px_10px_rgb(0,0,0,0.02)] group hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-indigo-200 transition-all"
                           >
                               {/* Cabeçalho Aprimorado do Dia */}
                               <div className="bg-gradient-to-r from-slate-50 to-white px-5 py-4 border-b border-slate-100 flex flex-col gap-2">
                                   <div className="flex justify-between items-center">
                                       <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                                                 <Calendar className="w-4 h-4" />
                                            </div>
                                            <span className="text-base font-black text-slate-800 tracking-tight">
                                                {diaInfo.dia}
                                            </span>
                                       </div>
                                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm flex items-center gap-2">
                                           Total <strong className="text-indigo-600 text-sm">{diaInfo.total}</strong>
                                       </span>
                                   </div>
                               </div>
                               
                               <div className="p-3 space-y-1">
                                   {diaInfo.produtos.map((p, j) => (
                                       <div key={j} className="flex justify-between items-center text-sm p-3 rounded-xl hover:bg-slate-50 transition-colors group/item">
                                           <span className="text-slate-600 font-semibold truncate pr-4 group-hover/item:text-slate-900 transition-colors" title={p.nome}>{p.nome}</span>
                                           <span className="font-black text-indigo-700 bg-indigo-50/50 group-hover/item:bg-indigo-100 px-3 py-1 rounded-md border border-transparent group-hover/item:border-indigo-100 shrink-0 transition-all">{p.qtd}</span>
                                       </div>
                                   ))}
                               </div>
                           </motion.div>
                       ))
                   )}
               </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* New Assistência & Avarias sub-tab view */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {/* Base/Total Entradas Card */}
            <motion.div initial={{ y:-20, opacity:0 }} animate={{ y:0, opacity:1 }} transition={{ delay:0.1 }} className="bg-white p-7 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group hover:border-indigo-200 hover:shadow-indigo-500/10 transition-all">
              <div className="absolute bottom-0 right-0 p-4 opacity-5 group-hover:opacity-15 group-hover:text-indigo-500 transition-all translate-x-2 translate-y-2 pointer-events-none">
                 <Inbox className="w-24 h-24" />
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center text-indigo-600 transition-colors shadow-inner">
                   <Inbox className="w-6 h-6" />
                </div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Entradas no Setor</h3>
              </div>
              <div className="text-4xl font-black text-slate-800 font-headline tracking-tighter">
                <AnimatedCounter value={avariasKpis.totalEntradas} />
              </div>
              <p className="text-xs text-slate-400 font-medium mt-1">Base geral dos cálculos do setor</p>
            </motion.div>

            {/* Movimentados (Recuperados) Card */}
            <motion.div initial={{ y:-20, opacity:0 }} animate={{ y:0, opacity:1 }} transition={{ delay:0.15 }} className="bg-white p-7 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group hover:border-emerald-200 hover:shadow-emerald-500/10 transition-all">
              <div className="absolute bottom-0 right-0 p-4 opacity-5 group-hover:opacity-15 group-hover:text-emerald-500 transition-all translate-x-2 translate-y-2 pointer-events-none">
                 <CheckCircle className="w-24 h-24" />
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center text-emerald-600 transition-colors shadow-inner">
                   <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Movimentados (Recuperados)</h3>
              </div>
              <div className="flex justify-between items-end">
                <div className="text-4xl font-black text-slate-800 font-headline tracking-tighter">
                  <AnimatedCounter value={avariasKpis.totalMovimentado} />
                </div>
                <div className="text-2xl font-black text-emerald-600 font-headline">
                  {avariasKpis.movimentado.pct.toFixed(1)}%
                </div>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-1">Taxa de sucesso sobre entradas</p>
            </motion.div>

            {/* Sucata Card */}
            <motion.div initial={{ y:-20, opacity:0 }} animate={{ y:0, opacity:1 }} transition={{ delay:0.2 }} className="bg-white p-7 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group hover:border-rose-200 hover:shadow-rose-500/10 transition-all">
              <div className="absolute bottom-0 right-0 p-4 opacity-5 group-hover:opacity-15 group-hover:text-rose-500 transition-all translate-x-2 translate-y-2 pointer-events-none">
                 <Trash2 className="w-24 h-24" />
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-rose-50 group-hover:bg-rose-100 flex items-center justify-center text-rose-600 transition-colors shadow-inner">
                   <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Sucata</h3>
              </div>
              <div className="flex justify-between items-end">
                <div className="text-4xl font-black text-slate-800 font-headline tracking-tighter">
                  <AnimatedCounter value={avariasKpis.sucata.qtd} />
                </div>
                <div className="text-2xl font-black text-rose-600 font-headline">
                  {avariasKpis.sucata.pct.toFixed(1)}%
                </div>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-1">Proporção das movimentações</p>
            </motion.div>

            {/* Conserto Minas Card */}
            <motion.div initial={{ y:-20, opacity:0 }} animate={{ y:0, opacity:1 }} transition={{ delay:0.3 }} className="bg-white p-7 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group hover:border-sky-200 hover:shadow-sky-500/10 transition-all">
              <div className="absolute bottom-0 right-0 p-4 opacity-5 group-hover:opacity-15 group-hover:text-sky-500 transition-all translate-x-2 translate-y-2 pointer-events-none">
                 <Wrench className="w-24 h-24" />
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-sky-50 group-hover:bg-sky-100 flex items-center justify-center text-sky-600 transition-colors shadow-inner">
                   <Wrench className="w-6 h-6" />
                </div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Conserto Minas</h3>
              </div>
              <div className="flex justify-between items-end">
                <div className="text-4xl font-black text-slate-800 font-headline tracking-tighter">
                  <AnimatedCounter value={avariasKpis.consertoMinas.qtd} />
                </div>
                <div className="text-2xl font-black text-sky-600 font-headline">
                  {avariasKpis.consertoMinas.pct.toFixed(1)}%
                </div>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-1">Proporção das movimentações</p>
            </motion.div>

            {/* RMA Card */}
            <motion.div initial={{ y:-20, opacity:0 }} animate={{ y:0, opacity:1 }} transition={{ delay:0.4 }} className="bg-white p-7 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group hover:border-amber-200 hover:shadow-amber-500/10 transition-all">
              <div className="absolute bottom-0 right-0 p-4 opacity-5 group-hover:opacity-15 group-hover:text-amber-500 transition-all translate-x-2 translate-y-2 pointer-events-none">
                 <ShieldAlert className="w-24 h-24" />
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-amber-50 group-hover:bg-amber-100 flex items-center justify-center text-amber-600 transition-colors shadow-inner">
                   <ShieldAlert className="w-6 h-6" />
                </div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">RMA</h3>
              </div>
              <div className="flex justify-between items-end">
                <div className="text-4xl font-black text-slate-800 font-headline tracking-tighter">
                  <AnimatedCounter value={avariasKpis.rma.qtd} />
                </div>
                <div className="text-2xl font-black text-amber-600 font-headline">
                  {avariasKpis.rma.pct.toFixed(1)}%
                </div>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-1">Proporção das movimentações</p>
            </motion.div>
          </div>

          {/* Area Chart: RMA vs Sucata vs Conserto Minas */}
          <div className="bg-white rounded-3xl p-8 shadow-[0_2px_20px_-3px_rgba(0,0,0,0.05)] border border-slate-100">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-900 font-headline tracking-tight">RMA vs Sucata vs Conserto Minas</h3>
              <p className="text-sm text-slate-400 font-medium mt-1">Comparativo temporal de equipamentos destinados a assistência e avarias</p>
            </div>
            
            <div className="h-96 w-full">
              {avariasTemporalData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={avariasTemporalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSucata" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorConserto" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorRma" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="dataStr" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b", fontWeight: 700 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl flex flex-col gap-2 border border-slate-800 text-xs">
                              <span className="text-sm font-bold text-slate-200">{label}</span>
                              {payload.map(p => (
                                <div key={p.name} className="flex items-center justify-between gap-6">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                                    <span className="text-slate-400">{p.name}</span>
                                  </div>
                                  <span className="font-bold">{p.value} unidades</span>
                                </div>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
                    <Area type="monotone" name="Sucata" dataKey="sucata" stroke="#f43f5e" fillOpacity={1} fill="url(#colorSucata)" strokeWidth={3} />
                    <Area type="monotone" name="Conserto Minas" dataKey="conserto" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorConserto)" strokeWidth={3} />
                    <Area type="monotone" name="RMA" dataKey="rma" stroke="#f59e0b" fillOpacity={1} fill="url(#colorRma)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                  <Box className="w-12 h-12 text-slate-200 mb-3" />
                  Nenhum dado de movimentação disponível para o período selecionado.
                </div>
              )}
            </div>
          </div>

          {/* Grids de Visualização de Lançamentos de Saídas e Entradas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Saídas do Setor */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800 font-headline">Saídas do Setor (Lançamentos)</h3>
                <span className="text-xs font-bold text-slate-500 bg-white border px-3 py-1 rounded-full">{filteredSaidasSetor.length} saídas</span>
              </div>
              <div className="overflow-x-auto max-h-[450px] custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider sticky top-0 border-b border-slate-100 z-10">
                    <tr>
                      <th className="p-4 pl-6">Data</th>
                      <th className="p-4">Produto</th>
                      <th className="p-4">Almoxarifado Destino</th>
                      <th className="p-4 text-center">Quantidade</th>
                      <th className="p-4 pr-6">Técnico</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                    {filteredSaidasSetor.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">Nenhum registro de saída encontrado.</td>
                      </tr>
                    ) : (
                      filteredSaidasSetor.slice(0, 100).map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/40">
                          <td className="p-4 pl-6">{s.data_criacao ? formatToBR(normalizeDateToISO(s.data_criacao) || s.data_criacao) : "Sem Data"}</td>
                          <td className="p-4">
                            <div className="font-bold text-slate-800">{s.produto}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{s.descricao_produto}</div>
                          </td>
                          <td className="p-4">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                              s.almoxarifado_destino?.toUpperCase().includes("SUCATA") ? "bg-rose-50 text-rose-600 border border-rose-100" :
                              s.almoxarifado_destino?.toUpperCase().includes("MINAS") ? "bg-sky-50 text-sky-600 border border-sky-100" :
                              s.almoxarifado_destino?.toUpperCase().includes("RMA") ? "bg-amber-50 text-amber-600 border border-amber-100" :
                              "bg-slate-100 text-slate-500"
                            )}>
                              {s.almoxarifado_destino}
                            </span>
                          </td>
                          <td className="p-4 text-center font-bold text-slate-700">{s.quantidade}</td>
                          <td className="p-4 pr-6 truncate max-w-[100px]" title={s.nome}>{s.nome}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Entradas no Setor */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800 font-headline">Entradas no Setor (Lançamentos)</h3>
                <span className="text-xs font-bold text-slate-500 bg-white border px-3 py-1 rounded-full">{filteredEntradasSetor.length} entradas</span>
              </div>
              <div className="overflow-x-auto max-h-[450px] custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider sticky top-0 border-b border-slate-100 z-10">
                    <tr>
                      <th className="p-4 pl-6">Data</th>
                      <th className="p-4">Origem</th>
                      <th className="p-4">Produto</th>
                      <th className="p-4 text-center">Quantidade</th>
                      <th className="p-4 pr-6">Almox. Destino</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                    {filteredEntradasSetor.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">Nenhum registro de entrada encontrado.</td>
                      </tr>
                    ) : (
                      filteredEntradasSetor.slice(0, 100).map((e, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/40">
                          <td className="p-4 pl-6">{e.data_criacao ? formatToBR(normalizeDateToISO(e.data_criacao) || e.data_criacao) : "Sem Data"}</td>
                          <td className="p-4 truncate max-w-[120px]" title={e.almoxarifado_origem}>{e.almoxarifado_origem}</td>
                          <td className="p-4">
                            <div className="font-bold text-slate-800 truncate max-w-[150px]">{e.descricao_produto}</div>
                            <div className="text-[10px] text-slate-400">{e.nome}</div>
                          </td>
                          <td className="p-4 text-center font-bold text-slate-700">{e.quantidade}</td>
                          <td className="p-4 pr-6 truncate max-w-[120px]" title={e.almoxarifado_destino}>{e.almoxarifado_destino}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
