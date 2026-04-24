import React, { useMemo, useState } from "react";
import {
  Trophy,
  Star,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  XCircle,
  Users,
  Medal,
  Award,
  Zap,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { useData } from "../context/DataContext";
import DateFilter from "../components/DateFilter";
import { DateFilterMode, isDateMatch, normalizeDateToISO } from "../lib/dateUtils";

export default function RankingPage() {
  const { monitoringData, attendanceData, auditors } = useData();
  const [filterMode, setFilterMode] = useState<DateFilterMode>("Todas");
  const [filterValue, setFilterValue] = useState("");
  const [filterFuncionario, setFilterFuncionario] = useState("Todos");
  const [selectedCollab, setSelectedCollab] = useState<any | null>(null);

  const formatMinutes = (m: number) => {
      if (!m) return "0m";
      if (m < 60) return `${m}m`;
      const h = Math.floor(m / 60);
      const min = m % 60;
      return `${h}h ${min}m`;
  };

  const ranking = useMemo(() => {
    const isMatchDate = (rawValue: any) => {
        const normDate = normalizeDateToISO(rawValue);
        return isDateMatch(normDate || "", filterMode, filterValue);
    };

    const filteredAttendance = attendanceData.filter(r => isMatchDate(r.DATA_REGISTRO));
    const filteredMonitoring = monitoringData.filter(r => isMatchDate(r.data_registro));

    // 1. Calculate Delays
    const delayMap = new Map<string, { totalDelay: number, faltas: number }>();
    filteredAttendance.forEach(r => {
        const collabName = (r.COLABORADOR || "").toUpperCase().trim();
        if(!delayMap.has(collabName)) delayMap.set(collabName, { totalDelay: 0, faltas: 0 });
        
        const stat = delayMap.get(collabName)!;
        const status = (r.STATUS || "").toUpperCase().trim();
        if (status === "FALTA") {
            stat.faltas += 1;
        }

        const isJustified = (r.OBERVAÇÃO && r.OBERVAÇÃO.toUpperCase().trim() !== "OK" && r.OBERVAÇÃO.toUpperCase().trim() !== "SEM JUSTIFICATIVA");
        const auditorConfig = auditors.find(a => a.name.toUpperCase().trim() === collabName);
        
        if (auditorConfig && !isJustified && status !== "FALTA") {
            let escalaDia: any = auditorConfig.escala; // Fallback

            let regDate: Date;
            if (typeof r.DATA_REGISTRO === 'number') {
                regDate = new Date((r.DATA_REGISTRO - 25569) * 86400 * 1000);
            } else {
                const parts = String(r.DATA_REGISTRO).split("-");
                if (parts.length === 3) {
                    regDate = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
                } else {
                    regDate = new Date(r.DATA_REGISTRO);
                }
            }
            const regDay = regDate.getDay();

            if (auditorConfig.tipoEscala === "ALTERNADA" && auditorConfig.escalaAlternada) {
                const alt = auditorConfig.escalaAlternada;
                const refParts = alt.dataReferenciaSabadoTrabalhado.split("-");
                const refDate = new Date(parseInt(refParts[0]), parseInt(refParts[1])-1, parseInt(refParts[2]));
                
                const refWeekStart = new Date(refDate);
                refWeekStart.setDate(refDate.getDate() - refDate.getDay());
                
                const regWeekStart = new Date(regDate);
                regWeekStart.setDate(regDate.getDate() - regDate.getDay());
                
                const diffTime = regWeekStart.getTime() - refWeekStart.getTime();
                const diffWeeks = Math.floor(Math.abs(diffTime) / (1000 * 60 * 60 * 24 * 7));

                const isWeekWithSabado = diffWeeks % 2 === 0;

                escalaDia = null;

                if (isWeekWithSabado) {
                    if (regDay === 6) escalaDia = alt.semanaComSabado.sabado;
                    else if (regDay >= 1 && regDay <= 5) escalaDia = alt.semanaComSabado.segSex;
                } else {
                    if (regDay >= 1 && regDay <= 5) escalaDia = alt.semanaSemSabado.segSex;
                }
            }

            if (escalaDia) {
                const parseTime = (timeStr?: string) => {
                    if (!timeStr) return null;
                    const p = timeStr.split(":");
                    return parseInt(p[0]) * 60 + parseInt(p[1]);
                };

                const escE = parseTime(escalaDia.entrada);
                const recE = parseTime(r.ENTRADA);
                if (recE && escE && recE > escE) stat.totalDelay += (recE - escE);

                const escVA = parseTime(escalaDia.saidaAlmoco);
                const recVA = parseTime(r.SAIDA_ALMOÇO);
                if (recVA && escVA && recVA > escVA) stat.totalDelay += (recVA - escVA);
            }
        }
    });

    // 2. Count Monitoring Productivity (Equipamentos Testados + Limpos)
    const productionMap = new Map<string, { limpos: number, testados: number }>();
    filteredMonitoring.forEach(r => {
        const aud = (r.funcionario || "").toUpperCase().trim();
        if (!productionMap.has(aud)) productionMap.set(aud, { limpos: 0, testados: 0 });
        const stat = productionMap.get(aud)!;
        stat.limpos += (Number(r.limpos) || 0);
        stat.testados += (Number(r.testados) || 0);
    });

    // 3. Calculate Final Score for all evaluated Collaborators from Monitoring
    const activeNamesFromMonitoring = Array.from(productionMap.keys());
    
    const leadersList = activeNamesFromMonitoring.map((nameUpper) => {
        const isConfiguredAuditor = auditors.find(a => a.name.toUpperCase().trim() === nameUpper);
        
        const delayData = delayMap.get(nameUpper) || { totalDelay: 0, faltas: 0 };
        const prodData = productionMap.get(nameUpper) || { limpos: 0, testados: 0 };

        const baseScore = 500;
        const productionPoints = (prodData.limpos * 3) + (prodData.testados * 1);
        const delayPenalties = delayData.totalDelay * 1; // -1 pt por min
        const faltaPenalties = delayData.faltas * 5; // -5 pt por falta
        
        let finalScore = baseScore + productionPoints - delayPenalties - faltaPenalties;
        if(finalScore < 0) finalScore = 0;
        
        const possiblePoints = baseScore + productionPoints;
        const efficiency = possiblePoints > 0 ? ((finalScore / possiblePoints) * 100).toFixed(1) : "0.0";

        const displayName = isConfiguredAuditor ? isConfiguredAuditor.name : nameUpper;
        const id = isConfiguredAuditor ? isConfiguredAuditor.id : `collab-${nameUpper}`;

        return {
            id,
            name: displayName,
            score: finalScore,
            efficiency: Number(efficiency),
            trend: (productionPoints) > (delayPenalties + faltaPenalties) ? "+ Alta Perf." : "- Atenção",
            level: finalScore > 1500 ? "Senior Lead" : finalScore > 1000 ? "Especialista" : finalScore > 600 ? "Pleno" : "Colaborador",
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&color=fff&size=128`,
            metrics: { prodData, delayData }
        };
    });

    let finalArray = leadersList.sort((a, b) => b.score - a.score);
    if (filterFuncionario !== "Todos") {
        finalArray = finalArray.filter(l => l.name.toUpperCase() === filterFuncionario);
    }
    
    return finalArray.map((L, i) => ({ ...L, rank: i + 1 }));
  }, [monitoringData, attendanceData, auditors, filterMode, filterValue, filterFuncionario]);

  const top3 = ranking.slice(0, 3);
  const restOfRanking = ranking.slice(3);

  // Reorder top 3 for podium visualization: 2nd, 1st, 3rd
  const podiumOrder = top3.length === 3 ? [top3[1], top3[0], top3[2]] : 
                      top3.length === 2 ? [top3[1], top3[0]] : 
                      top3.length === 1 ? [top3[0]] : [];

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-12">
      {/* HEADER E FILTROS */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-950 via-indigo-800 to-indigo-500 font-headline tracking-tighter mb-4 pt-2 pb-2 leading-snug">
            Ranking de Excelência
          </h1>
          <p className="text-slate-500 text-lg leading-relaxed font-medium">
            Métricas de produtividade, assiduidade e entregas unificadas. O pódio reflete os profissionais que elevaram o padrão no laboratório de testes.
          </p>
        </div>
        
        {/* Filtros */}
        <div className="flex flex-col gap-3">
          <DateFilter 
            mode={filterMode} 
            value={filterValue} 
            onChange={(m, v) => { setFilterMode(m); setFilterValue(v); }} 
            className="bg-white/80 backdrop-blur"
          />
          <div className="flex items-center gap-2 px-4 py-2 focus-within:ring-2 ring-indigo-500/20 rounded-xl bg-white border border-outline-variant/10 shadow-sm w-full">
             <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Auditor</span>
             <select
                value={filterFuncionario}
                onChange={(e) => setFilterFuncionario(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer w-full"
             >
                <option value="Todos">Visão Universal</option>
                {auditors.map(a => (
                    <option key={a.id} value={a.name.toUpperCase()}>{a.name}</option>
                ))}
             </select>
          </div>
        </div>
      </div>

      {!ranking || ranking.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center space-y-6">
            <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 shadow-inner">
               <Users className="w-12 h-12 text-slate-300" />
            </div>
            <div className="max-w-md">
              <h2 className="text-2xl font-headline font-bold text-slate-700 mb-2">Sem Colaboradores Avaliados</h2>
              <p className="text-slate-500 font-medium">Não há colaboradores ativos no momento para exibição.</p>
            </div>
          </div>
      ) : (
          <div className="flex flex-col xl:flex-row gap-10 items-start">
            
            {/* ÁREA DO PÓDIO (TOP 3) - Ocupa grande parte visual na esq */}
            <div className="w-full xl:w-7/12 rounded-3xl bg-gradient-to-b from-indigo-950 to-slate-900 border border-slate-800 shadow-2xl shadow-indigo-900/30 overflow-hidden relative min-h-[650px] flex flex-col justify-end p-10 pt-40">
                {/* Efeitos de Fundo do Pódio */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none translate-x-1/3 -translate-y-1/3"></div>
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none -translate-x-1/2 translate-y-1/2"></div>
                <div className="absolute inset-0 bg-[url('https://meshgradient.com/gallery/1.png')] opacity-5 mix-blend-overlay"></div>
                
                {/* Título interno do Pódio */}
                <div className="absolute top-10 left-10 flex items-center gap-3 z-10">
                    <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-lg">
                        <Trophy className="w-5 h-5 text-amber-400" />
                    </div>
                    <h2 className="text-white font-black font-headline text-2xl tracking-tight drop-shadow-md">Top Performers</h2>
                </div>

                {/* Estrutura do Pódio Flex */}
                <div className="flex items-end justify-center gap-4 sm:gap-6 md:gap-8 w-full z-10 mx-auto max-w-2xl h-full mt-24">
                    {podiumOrder.map((collab, idx) => {
                        // idx mapeado do array podiumOrder que está em: [2º, 1º, 3º] (ou seja: pos0=2º, pos1=1º, pos2=3º)
                        const isFirst = collab.rank === 1;
                        const isSecond = collab.rank === 2;
                        const isThird = collab.rank === 3;
                        
                        const heightClass = isFirst ? "h-[220px]" : isSecond ? "h-[160px]" : "h-[120px]";
                        const medalColor = isFirst ? "text-amber-400" : isSecond ? "text-slate-300" : "text-amber-700";
                        const gradientBg = isFirst 
                                ? "bg-gradient-to-t from-amber-500/20 to-white/5 border-amber-500/30" 
                                : isSecond 
                                ? "bg-gradient-to-t from-slate-400/20 to-white/5 border-slate-400/30" 
                                : "bg-gradient-to-t from-amber-800/20 to-white/5 border-amber-800/30";

                        const avatarBorder = isFirst ? "ring-amber-400" : isSecond ? "ring-slate-300" : "ring-amber-700";

                        return (
                            <motion.div 
                                initial={{ y: 50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: idx * 0.15, duration: 0.6, type: "spring", bounce: 0.4 }}
                                key={collab.id} 
                                onClick={() => setSelectedCollab(collab)}
                                className="flex flex-col items-center justify-end relative group w-1/3 h-full cursor-pointer"
                            >
                                {/* Posição Avatar e Nome Flutuante (agora empilhado no fluxo normal via relacao de tamanho) */}
                                <div className={cn("flex flex-col items-center w-full transition-transform duration-500 group-hover:-translate-y-2 z-20 absolute bottom-full pb-3")}>
                                    
                                    {isFirst && <Star className="w-8 h-8 text-amber-400 fill-amber-400 mb-2 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)] animate-pulse" />}
                                    
                                    <div className={cn("relative rounded-full p-1 ring-2 shadow-xl bg-slate-900/50 backdrop-blur-md mb-3", avatarBorder, isFirst ? "w-24 h-24 ring-4 ring-offset-4 ring-offset-slate-900" : "w-16 h-16")}>
                                        <img src={collab.avatar} alt={collab.name} className="w-full h-full rounded-full object-cover" />
                                        <div className="absolute -bottom-3 -right-2 bg-slate-900 border border-slate-700 px-2.5 py-0.5 rounded-lg text-white font-black text-sm tabular-nums shadow-lg">#{collab.rank}</div>
                                    </div>
                                    
                                    <p className="text-white font-bold text-center truncate w-[130%] text-sm drop-shadow-md px-2 max-w-[120px] mx-auto leading-tight">{collab.name}</p>
                                    <div className={cn("mt-2 text-center", medalColor)}>
                                        <p className="text-2xl sm:text-3xl font-black tabular-nums drop-shadow-[0_0_10px_currentColor] leading-none mb-0.5">
                                            {collab.score}
                                        </p>
                                        <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-80 decoration-slate-400">PTS</p>
                                    </div>
                                </div>
                                
                                {/* O Bloco do Pódio Físico */}
                                <div className={cn("w-full rounded-t-2xl border-t border-l border-r flex flex-col justify-end p-4 backdrop-blur-md relative overflow-hidden mt-auto shrink-0", heightClass, gradientBg)}>
                                    <div className="absolute inset-0 bg-white opacity-[0.02] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat"></div>
                                    <div className="relative z-10 flex flex-col items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                        <div className="flex flex-col items-center">
                                            <Zap className={cn("w-3.5 h-3.5 mb-1", medalColor)} />
                                            <span className="text-[10px] text-white/70 font-bold text-center leading-tight">
                                                {collab.metrics.prodData.limpos} Limpos<br/>
                                                {collab.metrics.prodData.testados} Testados
                                            </span>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <Clock className={cn("w-3.5 h-3.5 mb-1 text-white/40")} />
                                            <span className="text-[10px] text-white/50 font-bold">{formatMinutes(collab.metrics.delayData.totalDelay)}</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            </div>

            {/* LISTA GERAL (Demais Resultados / Placar Completo) */}
            <div className="w-full xl:w-5/12 flex flex-col gap-6">
                
                {/* Stats de Pontuação Guia */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between group hover:border-emerald-200 transition-colors">
                        <div>
                            <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Equip. Limpos</p>
                            <p className="text-xl font-black text-emerald-600 mt-1 font-headline">+3 pts <span className="text-[10px] text-slate-500 font-semibold">/unid</span></p>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between group hover:border-indigo-200 transition-colors">
                        <div>
                            <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Equip. Testados</p>
                            <p className="text-xl font-black text-indigo-900 mt-1 font-headline">+1 pt <span className="text-[10px] text-slate-500 font-semibold">/unid</span></p>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between group hover:border-rose-200 transition-colors">
                        <div>
                            <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Atraso / Falta</p>
                            <p className="text-xl font-black text-rose-600 mt-1 font-headline">-1 pt <span className="text-[10px] text-slate-500 font-semibold">/min</span></p>
                            <p className="text-xs font-bold text-rose-400 mt-0.5">-5 pts/falta</p>
                        </div>
                    </div>
                </div>

                {/* Tabela de Posições (Lista Secundária) */}
                <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex-1 min-h-[400px]">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-black text-slate-800 font-headline">Placar Geral</h3>
                        <div className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 uppercase tracking-wider">
                            {ranking.length} Avaliados
                        </div>
                    </div>

                    <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                        {ranking.map((leader, i) => (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                key={leader.id}
                                onClick={() => setSelectedCollab(leader)}
                                className={cn(
                                    "flex items-center justify-between p-3.5 rounded-2xl transition-all duration-300 border bg-white group hover:shadow-md hover:-translate-y-0.5 cursor-pointer",
                                    leader.rank <= 3 
                                        ? "border-amber-200/50 hover:border-amber-300 bg-amber-50/10" 
                                        : "border-slate-100 hover:border-indigo-200"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className={cn(
                                            "w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0 shadow-sm border",
                                            leader.rank === 1 ? "bg-gradient-to-br from-amber-300 to-amber-500 text-white border-amber-600 shadow-amber-500/30"
                                            : leader.rank === 2 ? "bg-gradient-to-br from-slate-200 to-slate-400 text-white border-slate-500 shadow-slate-400/30"
                                            : leader.rank === 3 ? "bg-gradient-to-br from-amber-600 to-amber-800 text-white border-amber-900 shadow-amber-800/30"
                                            : "bg-slate-50 text-slate-600 border-slate-200"
                                        )}
                                    >   
                                        #{leader.rank}
                                    </div>
                                    
                                    <div className="relative">
                                        <img src={leader.avatar} alt={leader.name} className="w-10 h-10 rounded-full object-cover shadow-sm bg-slate-100 shrink-0" />
                                        {leader.rank <= 3 && (
                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center p-0.5 py-1">
                                                <Star className={cn("w-3 h-3 fill-current", leader.rank === 1 ? "text-amber-500" : leader.rank === 2 ? "text-slate-400" : "text-amber-700")} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-800 truncate leading-snug group-hover:text-indigo-900 transition-colors">
                                            {leader.name}
                                        </p>
                                        <p className="text-[10px] text-slate-400 uppercase tracking-widest truncate font-semibold">
                                            {leader.level}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-6 shrink-0 text-right pr-2">
                                    <div className="hidden sm:block text-left mr-2">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Eficiência</p>
                                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(leader.efficiency, 100)}%` }}></div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col items-end">
                                        <p className="text-lg font-black text-slate-800 font-headline leading-none tabular-nums">
                                            {leader.score} <span className="text-[10px] font-bold text-slate-400 ml-0.5">PTS</span>
                                        </p>
                                        <p className={cn("text-[9px] font-bold uppercase tracking-widest mt-1 flex items-center gap-1", 
                                            leader.trend.includes("+") ? "text-emerald-500" : "text-rose-500"
                                        )}>
                                            {leader.trend.includes("+") ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                                            {leader.trend}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
            
          </div>
      )}

      {/* Modal de Detalhes do Colaborador */}
      <AnimatePresence>
        {selectedCollab && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm"
                onClick={() => setSelectedCollab(null)}
            >
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Modal Header */}
                    <div className="p-8 bg-slate-50 border-b border-slate-100 relative">
                        <button onClick={() => setSelectedCollab(null)} className="absolute top-6 right-6 w-8 h-8 bg-white hover:bg-slate-200 rounded-full flex items-center justify-center transition-colors shadow-sm text-slate-500">
                            <XCircle className="w-5 h-5" />
                        </button>
                        
                        <div className="flex items-center gap-5">
                            <div className="relative">
                                <img src={selectedCollab.avatar} alt={selectedCollab.name} className="w-16 h-16 rounded-full object-cover shadow-md border-2 border-white ring-4 ring-slate-100" />
                                <div className="absolute -bottom-2 -right-2 bg-indigo-600 border-2 border-white px-2 py-0.5 rounded-full text-white font-black text-xs shadow-sm">
                                    #{selectedCollab.rank}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-2xl font-black font-headline text-slate-800 tracking-tight leading-none mb-1">
                                    {selectedCollab.name}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                                        {selectedCollab.level}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-400">• Eficiência {selectedCollab.efficiency}%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Modal Body / Stats */}
                    <div className="p-8 overflow-y-auto custom-scrollbar flex flex-col gap-8">
                        
                        {/* Pontuação Final Em Destaque */}
                        <div className="flex bg-indigo-600 rounded-3xl p-6 shadow-lg shadow-indigo-600/20 text-white items-center justify-between">
                            <div>
                                <p className="text-indigo-200 font-bold text-sm tracking-wider uppercase mb-1">Pontuação Final Contabilizada</p>
                                <p className="text-4xl sm:text-5xl font-black font-headline drop-shadow-md">
                                    {selectedCollab.score} <span className="text-lg text-indigo-300">PTS</span>
                                </p>
                            </div>
                            <Award className="w-16 h-16 text-indigo-400 opacity-50" />
                        </div>

                        {/* Duas Colunas - Ganhos e Perdas */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            
                            {/* Bloco Positivo */}
                            <div className="flex flex-col gap-4">
                                <h4 className="flex items-center gap-2 text-sm font-black text-slate-800 border-b border-slate-100 pb-2">
                                    <TrendingUp className="w-4 h-4 text-emerald-500" /> Rendimentos Base
                                </h4>
                                
                                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex flex-col gap-3">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest mb-0.5">Equip. Limpos (+3pts)</p>
                                            <p className="text-2xl font-black text-emerald-600 leading-none">{selectedCollab.metrics.prodData.limpos}</p>
                                        </div>
                                        <p className="text-sm font-bold text-emerald-500 bg-emerald-100/50 px-2 rounded">
                                            +{selectedCollab.metrics.prodData.limpos * 3} pts
                                        </p>
                                    </div>
                                    <div className="w-full h-px bg-emerald-200/50"></div>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest mb-0.5">Equip. Testados (+1pt)</p>
                                            <p className="text-2xl font-black text-emerald-600 leading-none">{selectedCollab.metrics.prodData.testados}</p>
                                        </div>
                                        <p className="text-sm font-bold text-emerald-500 bg-emerald-100/50 px-2 rounded">
                                            +{selectedCollab.metrics.prodData.testados * 1} pts
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Bloco Negativo (Penalidades) */}
                            <div className="flex flex-col gap-4">
                                <h4 className="flex items-center gap-2 text-sm font-black text-slate-800 border-b border-slate-100 pb-2">
                                    <TrendingDown className="w-4 h-4 text-rose-500" /> Ocorrências & Descontos
                                </h4>
                                
                                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex flex-col gap-3 h-full">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] font-bold text-rose-600/70 uppercase tracking-widest mb-0.5">Faltas Injustificadas</p>
                                            <p className="text-2xl font-black text-rose-600 leading-none">{selectedCollab.metrics.delayData.faltas}</p>
                                        </div>
                                        <p className="text-sm font-bold text-rose-500 bg-rose-100/50 px-2 rounded">
                                            -{selectedCollab.metrics.delayData.faltas * 5} pts
                                        </p>
                                    </div>
                                    <div className="w-full h-px bg-rose-200/50"></div>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] font-bold text-rose-600/70 uppercase tracking-widest mb-0.5">Atraso Total Apurado</p>
                                            <p className="text-xl font-black text-rose-600 leading-none mt-1">{formatMinutes(selectedCollab.metrics.delayData.totalDelay)}</p>
                                        </div>
                                        <p className="text-sm font-bold text-rose-500 bg-rose-100/50 px-2 rounded">
                                            -{selectedCollab.metrics.delayData.totalDelay * 1} pts
                                        </p>
                                    </div>
                                </div>
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
