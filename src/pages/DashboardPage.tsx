import React, { useState, useMemo } from "react";
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
  FileText
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

export default function DashboardPage() {
  const { monitoringData } = useData();
  const [selectedFuncionario, setSelectedFuncionario] = useState<string>("Todos");
  const [filterMode, setFilterMode] = useState<"Todas" | "Ano" | "Mes" | "Dia">("Todas");
  const [filterValue, setFilterValue] = useState("");
  const [selectedDayRecord, setSelectedDayRecord] = useState<any | null>(null);

  // Derivar dados únicos
  const funcionarios = useMemo(() => {
    if (!monitoringData) return [];
    const nomes = new Set(monitoringData.map(d => d.funcionario).filter(Boolean));
    return Array.from(nomes).sort();
  }, [monitoringData]);

  // Filtragem
  const filteredData = useMemo(() => {
    let base = monitoringData || [];
    
    // Filtro por Data
    if (filterMode !== "Todas" && filterValue.trim()) {
      const fv = filterValue.trim();
      base = base.filter(d => {
        if (!d.data_registro) return false;
        let dt = String(d.data_registro).trim();
        
        // Normalizador agressivo Universal (Transforma qualquer 3/16/26 ou 03/16/2026 em 16/03/2026 BR)
        const dateMatch = dt.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
        if (dateMatch) {
            let p1 = dateMatch[1].padStart(2, '0');
            let p2 = dateMatch[2].padStart(2, '0');
            let p3 = dateMatch[3];
            if (p3.length === 2) p3 = "20" + p3; // Pad ano
            
            // Auto-detectar padrão US (M/D/YY) se o meio for > 12
            if (Number(p2) > 12) {
               dt = `${p2}/${p1}/${p3}`; // inverte para D/M/Y
            } else {
               dt = `${p1}/${p2}/${p3}`; // assume normal
            }
        }
        
        return dt.includes(fv);
      });
    }

    // Filtro por Funcionário
    if (selectedFuncionario !== "Todos") {
      base = base.filter(d => d.funcionario === selectedFuncionario);
    }
    
    return base;
  }, [monitoringData, selectedFuncionario, filterMode, filterValue]);

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

  // Evolução Mensal / Componente de Fechamento (Agrupado por YYYY-MM)
  const fechamentoMensal = useMemo(() => {
    const map = new Map<string, { limpos: number, testados: number, total: number, diasTrab: Set<string> }>();
    monitoringData.forEach(d => {
      if (!d.data_registro) return;
      // Extraindo YYYY-MM caso consiga (supondo padrão brasileiro DD/MM/YYYY ou ISO)
      // Se for YYYY-MM-DD
      let monthKey = "Indefinido";
      try {
        let dateObj = new Date(d.data_registro);
        // Se a data vier "DD/MM/YYYY", o parse do Date nativo pode falhar, vamos fazer um regex simples
        const dtStr = String(d.data_registro);
        if (dtStr.includes("/")) {
           const parts = dtStr.split(' ')[0].split('/'); // pega só a data
           if (parts.length === 3) {
             monthKey = `${parts[2]}-${parts[1].padStart(2, '0')}`; // YYYY-MM
           }
        } else {
           monthKey = dateObj.toISOString().slice(0, 7);
        }
      } catch (e) {
         // ignora e usa padrão
      }

      const atual = map.get(monthKey) || { limpos: 0, testados: 0, total: 0, diasTrab: new Set() };
      atual.limpos += Number(d.limpos) || 0;
      atual.testados += Number(d.testados) || 0;
      atual.total += (Number(d.limpos) || 0) + (Number(d.testados) || 0);
      atual.diasTrab.add(d.data_registro);
      map.set(monthKey, atual);
    });
    return Array.from(map.entries())
      .map(([k, v]) => ({ month: k, ...v, diasTrabalhados: v.diasTrab.size }))
      .sort((a, b) => b.month.localeCompare(a.month)); // Mais recente 1º
  }, [monitoringData]);

  // Lista dos registros brutos do filtro (para o histórico e tooltips)
  const historicalRecords = useMemo(() => {
    return [...filteredData].sort((a, b) => {
       // Ordenação simples string
       return String(b.data_registro).localeCompare(String(a.data_registro));
    });
  }, [filteredData]);


  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-primary font-headline tracking-tight">
            Monitoramento da Equipe
          </h1>
          <p className="text-slate-500 text-lg leading-relaxed mt-2">
            Monitoramento detalhado de performance, equipamentos limpos e testados.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 bg-surface-container-low p-2 rounded-xl shadow-sm border border-outline-variant/10">
          
          <div className="flex items-center gap-2 px-3 py-1.5 focus-within:ring-2 ring-primary/20 rounded-lg bg-surface-container-lowest">
            <Calendar className="w-4 h-4 text-primary" />
            <select
              value={filterMode}
              onChange={(e) => {
                  setFilterMode(e.target.value as any);
                  setFilterValue("");
              }}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="Todas">Todo o Período</option>
              <option value="Ano">Por Ano</option>
              <option value="Mes">Por Mês/Ano</option>
              <option value="Dia">Data Exata</option>
            </select>
            {filterMode === "Ano" && (
                <input type="text" placeholder="Ex: 2026" value={filterValue} onChange={e => setFilterValue(e.target.value)} className="bg-transparent text-sm font-bold text-slate-700 outline-none w-24 px-2 border-l border-slate-200" />
            )}
            {filterMode === "Mes" && (
                <input type="text" placeholder="Ex: 03/2026" value={filterValue} onChange={e => setFilterValue(e.target.value)} className="bg-transparent text-sm font-bold text-slate-700 outline-none w-28 px-2 border-l border-slate-200" />
            )}
            {filterMode === "Dia" && (
                <input type="text" placeholder="Ex: 02/03/2026" value={filterValue} onChange={e => setFilterValue(e.target.value)} className="bg-transparent text-sm font-bold text-slate-700 outline-none w-32 px-2 border-l border-slate-200" />
            )}
          </div>

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
      </header>

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              {kpis.total.toLocaleString()}
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
              {kpis.limpos.toLocaleString()}
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
              {kpis.testados.toLocaleString()}
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

          <div className="h-[350px] w-full">
            {selectedFuncionario === "Todos" ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataByFuncionario} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.4} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
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
                  <Bar name="Limpos" dataKey="limpos" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={45}>
                      <LabelList dataKey="limpos" position="top" style={{ fill: '#34d399', fontSize: 11, fontWeight: 800 }} />
                  </Bar>
                  <Bar name="Testados" dataKey="testados" fill="#fbbf24" radius={[4, 4, 0, 0]} maxBarSize={45}>
                      <LabelList dataKey="testados" position="top" style={{ fill: '#fbbf24', fontSize: 11, fontWeight: 800 }} />
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

        {/* Right Side: Histórico Diário & Observações Tooltip list */}
        <div className="bg-white rounded-3xl shadow-[0_2px_20px_-3px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col h-full overflow-hidden">
             <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                 <h3 className="text-lg font-bold text-slate-800 font-headline">Histórico Diário</h3>
                 <p className="text-xs text-slate-500 font-medium">Clique no registro para ler as observações</p>
             </div>
             <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3">
                 {historicalRecords.length === 0 ? (
                     <div className="flex flex-col items-center justify-center p-10 text-slate-400">
                         <Calendar className="w-10 h-10 mb-3 opacity-30" />
                         <span className="text-sm font-medium">Nenhum registro encontrado</span>
                     </div>
                 ) : (
                    historicalRecords.map((record, idx) => (
                        <motion.div 
                           initial={{ opacity: 0, y: 15 }}
                           animate={{ opacity: 1, y: 0 }}
                           transition={{ delay: idx * 0.05 }}
                           key={idx}
                           onClick={() => setSelectedDayRecord(record)}
                           className="group flex flex-col p-4 bg-slate-50 hover:bg-slate-100/80 border border-slate-100 hover:border-primary/20 rounded-2xl cursor-pointer transition-all"
                        >
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded">
                                    {record.data_registro}
                                </span>
                                {record.observacao && (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full ring-1 ring-amber-200">
                                       <Info className="w-3 h-3" /> Contém Notas
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-[10px] font-bold">
                                    {record.funcionario?.substring(0, 2).toUpperCase()}
                                </div>
                                <span className="text-sm font-headline font-bold text-slate-700 truncate">{record.funcionario}</span>
                            </div>
                            <div className="flex items-center justify-between border-t border-slate-200/60 pt-3 mt-1">
                                <div className="text-center flex-1 border-r border-slate-200/60">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Limpos</div>
                                    <div className="font-black text-emerald-500">{record.limpos}</div>
                                </div>
                                <div className="text-center flex-1 border-r border-slate-200/60">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Testados</div>
                                    <div className="font-black text-amber-500">{record.testados}</div>
                                </div>
                                <div className="text-center flex-1">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total</div>
                                    <div className="font-black text-indigo-500">{Number(record.limpos) + Number(record.testados)}</div>
                                </div>
                            </div>
                        </motion.div>
                    ))
                 )}
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
                   {fechamentoMensal.map((f, i) => (
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
              {fechamentoMensal.length === 0 && (
                 <div className="p-12 text-center text-slate-400 font-medium bg-slate-50/30">
                     Nenhum fechamento disponível para o escopo selecionado.
                 </div>
              )}
          </div>
      </section>

      {/* Tooltip / Modal para Observações */}
      <AnimatePresence>
          {selectedDayRecord && (
              <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
                 onClick={() => setSelectedDayRecord(null)}
              >
                  <motion.div 
                     initial={{ scale: 0.95, opacity: 0, y: 20 }}
                     animate={{ scale: 1, opacity: 1, y: 0 }}
                     exit={{ scale: 0.95, opacity: 0, y: 20 }}
                     onClick={(e) => e.stopPropagation()}
                     className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden"
                  >
                     <div className="bg-indigo-600 p-6 text-white flex justify-between items-start">
                         <div>
                             <span className="bg-white/20 text-white px-2.5 py-1 text-[10px] uppercase tracking-widest font-bold rounded mb-3 inline-block">
                                 {selectedDayRecord.data_registro} • {selectedDayRecord.dia_da_semana}
                             </span>
                             <h3 className="text-2xl font-headline font-black">{selectedDayRecord.funcionario}</h3>
                         </div>
                         <button onClick={() => setSelectedDayRecord(null)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
                             <X className="w-4 h-4" />
                         </button>
                     </div>
                     <div className="p-8">
                         <div className="flex gap-6 mb-8 border-b border-slate-100 pb-6">
                             <div className="flex-1 text-center bg-emerald-50 rounded-2xl py-4 border border-emerald-100">
                                 <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Limpos</div>
                                 <div className="text-3xl font-black text-emerald-500">{selectedDayRecord.limpos}</div>
                             </div>
                             <div className="flex-1 text-center bg-amber-50 rounded-2xl py-4 border border-amber-100">
                                 <div className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Testados</div>
                                 <div className="text-3xl font-black text-amber-500">{selectedDayRecord.testados}</div>
                             </div>
                         </div>
                         
                         <div>
                             <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-3">
                                 <FileText className="w-4 h-4 text-primary" /> Observações do Dia
                             </h4>
                             <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm text-slate-600 leading-relaxed min-h-[100px]">
                                 {selectedDayRecord.observacao ? (
                                     <p>{selectedDayRecord.observacao}</p>
                                 ) : (
                                     <p className="text-slate-400 italic text-center py-4">Nenhuma observação registrada nas tarefas não contabilizadas deste dia.</p>
                                 )}
                             </div>
                         </div>
                     </div>
                  </motion.div>
              </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
}
