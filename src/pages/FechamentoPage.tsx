import React, { useMemo, useState } from "react";
import { useData } from "../context/DataContext";
import { motion } from "motion/react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LabelList, Cell } from "recharts";
import { Box, CheckCircle, TrendingUp, Calendar, ArrowRightLeft, Activity, Filter, BarChart2, List } from "lucide-react";
import { cn } from "../lib/utils";
import DateFilter from "../components/DateFilter";
import { DateFilterMode, isDateMatch, normalizeDateToISO, formatToBR } from "../lib/dateUtils";

export default function FechamentoPage() {
  const { fechamentoData } = useData();
  const [filterMode, setFilterMode] = useState<DateFilterMode>("Todas");
  const [filterValue, setFilterValue] = useState("");
  const [filterEquipamento, setFilterEquipamento] = useState("");
  const [viewMode, setViewMode] = useState<"grafico" | "lista">("grafico");

  // Filtro Global da Aba
  const filteredData = useMemo(() => {
     let base = fechamentoData;
     if (filterMode !== "Todas" && filterValue.trim() !== "") {
        base = base.filter(d => isDateMatch(normalizeDateToISO(d.data_criacao) || "", filterMode, filterValue));
     }
     return base;
  }, [fechamentoData, filterMode, filterValue]);

  const kpis = useMemo(() => {
     if (!filteredData || filteredData.length === 0) return { total: 0, comodato: 0, taxa: 0 };
     const total = filteredData.length;
     const comodato = filteredData.filter(d => d.situacao?.toUpperCase().includes('COMODATO')).length;
     const taxa = (comodato / total) * 100;
     return { total, comodato, taxa };
  }, [fechamentoData]);

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

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ y:-20, opacity:0 }} animate={{ y:0, opacity:1 }} transition={{ delay:0.1 }} className="bg-white p-7 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group hover:border-indigo-200 hover:shadow-indigo-500/10 transition-all">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-100 group-hover:text-indigo-600 transition-all translate-x-4 -translate-y-4">
             <ArrowRightLeft className="w-32 h-32" />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center text-indigo-600 transition-colors shadow-inner">
               <Box className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Total Movimentado</h3>
          </div>
          <div className="text-5xl font-black text-slate-800 font-headline tracking-tighter">
            {kpis.total.toLocaleString()}
          </div>
        </motion.div>

        <motion.div initial={{ y:-20, opacity:0 }} animate={{ y:0, opacity:1 }} transition={{ delay:0.2 }} className="bg-white p-7 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group hover:border-emerald-200 hover:shadow-emerald-500/10 transition-all">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-100 group-hover:text-emerald-500 transition-all translate-x-4 -translate-y-4">
             <CheckCircle className="w-32 h-32" />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center text-emerald-600 transition-colors shadow-inner">
               <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Aprovados (Comodato)</h3>
          </div>
          <div className="text-5xl font-black text-slate-800 font-headline tracking-tighter">
            {kpis.comodato.toLocaleString()}
          </div>
        </motion.div>

        <motion.div initial={{ y:-20, opacity:0 }} animate={{ y:0, opacity:1 }} transition={{ delay:0.3 }} className="bg-gradient-to-br from-[#0f172a] to-indigo-900 p-7 rounded-3xl shadow-xl relative overflow-hidden group text-white border border-indigo-500/20">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity translate-x-4 -translate-y-4">
             <TrendingUp className="w-32 h-32" />
          </div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
          
          <div className="relative flex items-center gap-4 mb-4 z-10">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400 backdrop-blur-md border border-white/10 shadow-inner">
               <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-indigo-100 uppercase tracking-widest">Taxa de Conversão</h3>
          </div>
          <div className="relative text-5xl font-black font-headline tracking-tighter z-10 text-emerald-400 drop-shadow-md">
            {kpis.taxa.toFixed(1)}%
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
    </div>
  );
}
