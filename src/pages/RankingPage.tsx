import React, { useMemo, useState } from "react";
import {
  Trophy,
  Star,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Award,
  Medal,
  Users,
  CalendarDays,
  XCircle,
  X
} from "lucide-react";
import { cn } from "../lib/utils";
import { useData } from "../context/DataContext";

export default function RankingView() {
  const { monitoringData, discrepanciesData, attendanceData, auditors } = useData();
  const [filterMonth, setFilterMonth] = useState<string>("");
  const [selectedAuditor, setSelectedAuditor] = useState<any | null>(null);

  const formatMinutes = (m: number) => {
      if (!m) return "0m";
      if (m < 60) return `${m}m`;
      const h = Math.floor(m / 60);
      const min = m % 60;
      return `${h}h ${min}m`;
  };

  const ranking = useMemo(() => {
    let targetYear = -1;
    let targetMonth = -1;
    if (filterMonth) {
        const parts = filterMonth.split("-");
        if (parts.length === 2) {
            targetYear = parseInt(parts[0], 10);
            targetMonth = parseInt(parts[1], 10) - 1;
        }
    }

    const isMatch = (rawValue: any) => {
        if (targetYear === -1) return true;
        let tempDate: Date | null = null;
        if (typeof rawValue === "number") {
             tempDate = new Date((rawValue - 25569) * 86400 * 1000);
        } else if (rawValue) {
             const partsStr = String(rawValue).substr(0, 10).split(/[-/]/);
             if (partsStr.length === 3) {
                 if (partsStr[0].length === 4) {
                     tempDate = new Date(`${partsStr[0]}-${partsStr[1]}-${partsStr[2]}T12:00:00`);
                 } else {
                     tempDate = new Date(`${partsStr[2]}-${partsStr[1]}-${partsStr[0]}T12:00:00`);
                 }
             } else {
                 tempDate = new Date(rawValue);
             }
        }
        if (!tempDate || isNaN(tempDate.getTime())) return true;
        return tempDate.getFullYear() === targetYear && tempDate.getMonth() === targetMonth;
    };

    const filteredAttendance = attendanceData.filter(r => isMatch(r.DATA_REGISTRO));
    const filteredMonitoring = monitoringData.filter(r => isMatch(r["DATA/HORA_FECHAMENTO"] || r.DATA_REGISTRO));
    const filteredDiscrepancies = discrepanciesData.filter(r => isMatch(r["DATA/HORA_FECHAMENTO"] || r.DATA_REGISTRO || (r as any).date));

    // 1. Calculate Delays
    const delayMap = new Map<string, { totalDelay: number, faltas: number }>();
    filteredAttendance.forEach(r => {
        const collabName = (r.COLABORADOR || "").toUpperCase();
        if(!delayMap.has(collabName)) delayMap.set(collabName, { totalDelay: 0, faltas: 0 });
        
        const stat = delayMap.get(collabName)!;
        const status = (r.STATUS || "").toUpperCase();
        if (status === "FALTA") {
            stat.faltas += 1;
        }

        const isJustified = (r.OBERVAÇÃO && r.OBERVAÇÃO.toUpperCase() !== "OK" && r.OBERVAÇÃO.toUpperCase() !== "SEM JUSTIFICATIVA");
        const auditorConfig = auditors.find(a => a.name.toUpperCase() === collabName);
        
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

    // 2. Count Monitoring / O.S
    const osMap = new Map<string, number>();
    filteredMonitoring.forEach(r => {
        const aud = (r.AUDITOR || "").toUpperCase();
        osMap.set(aud, (osMap.get(aud) || 0) + 1);
    });

    // 3. Count Discrepancies
    const discMap = new Map<string, number>();
    filteredDiscrepancies.forEach(r => {
        const aud = (r.AUDITOR || "").toUpperCase();
        discMap.set(aud, (discMap.get(aud) || 0) + 1);
    });

    // 4. Calculate Final Score for all ACTIVE Auditors
    const leadersList = auditors.filter(a => a.status === "Ativo").map((a) => {
        const nameUpper = a.name.toUpperCase();
        const delayData = delayMap.get(nameUpper) || { totalDelay: 0, faltas: 0 };
        const osCount = osMap.get(nameUpper) || 0;
        const discCount = discMap.get(nameUpper) || 0;

        const baseScore = 1000;
        const osPoints = osCount * 2; // +2 por O.S
        const discPoints = discCount * 5; // +5 por erro achado
        const delayPenalties = delayData.totalDelay * 1; // -1 pt por min
        const faltaPenalties = delayData.faltas * 50; // -50 pt por falta
        
        let finalScore = baseScore + osPoints + discPoints - delayPenalties - faltaPenalties;
        if(finalScore < 0) finalScore = 0;

        return {
            id: a.id,
            name: a.name,
            score: finalScore,
            trend: (osPoints + discPoints) > (delayPenalties + faltaPenalties) ? "+ Alta Perf." : "- Atenção",
            level: finalScore > 1500 ? "Senior Lead" : finalScore > 1100 ? "Auditor Especialista" : finalScore > 900 ? "Auditor Pleno" : "Auditor Júnior",
            avatar: `https://picsum.photos/seed/${a.name.replace(/\s/g, '')}/100/100`,
            metrics: { osCount, discCount, delayData }
        };
    });

    leadersList.sort((a, b) => b.score - a.score);
    // Add Rank
    return leadersList.map((L, i) => ({ ...L, rank: i + 1 }));
  }, [monitoringData, discrepanciesData, attendanceData, auditors, filterMonth]);

  const displayAuditor = (ranking && ranking.length > 0) 
     ? (selectedAuditor ? ranking.find((l: any) => l.id === selectedAuditor.id) || ranking[0] : ranking[0]) 
     : null;

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400 font-headline tracking-tight mb-3">
            Ranking Geral de Auditores
          </h2>
          <p className="text-slate-500 text-lg leading-relaxed">
            Métricas unificadas formam a pontuação de excelência. Auditores são premiados pela assertividade analítica e penalizados por infrações de jornada.
          </p>
        </div>
        <div className="bg-white p-2.5 pr-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md hover:border-slate-200 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-indigo-50/80 text-indigo-500 flex items-center justify-center shadow-inner group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300">
                <CalendarDays className="w-6 h-6" />
            </div>
            <div className="flex flex-col relative">
                <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-0.5">Competência</span>
                <div className="flex items-center gap-3">
                    <input 
                        type="month" 
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                        className="bg-transparent border-none p-0 text-sm font-black text-slate-800 outline-none cursor-pointer focus:ring-0 uppercase font-headline"
                    />
                    {filterMonth && (
                        <button 
                          onClick={() => setFilterMonth("")} 
                          className="text-slate-300 hover:text-rose-500 transition-colors bg-slate-50 hover:bg-rose-50 rounded-full p-1 -mr-2"
                          title="Remover filtro"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
      </div>

      {!ranking || ranking.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center space-y-6">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200 shadow-inner">
               <Users className="w-10 h-10 text-slate-300" />
            </div>
            <div className="max-w-md">
              <h2 className="text-2xl font-headline font-bold text-slate-700 mb-2">Sem Auditores Ativos</h2>
              <p className="text-slate-500 font-medium">Você precisa configurar a Escala de Auditores no painel de Configurações Globais.</p>
            </div>
          </div>
      ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 bg-gradient-to-br from-[#0f172a] to-[#1e1b4b] p-8 rounded-3xl shadow-2xl shadow-indigo-900/20 text-white relative overflow-hidden border border-indigo-500/20">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                <Trophy className="absolute -bottom-4 -right-4 w-40 h-40 text-white/5 -rotate-12" />
                <div className="relative z-10 space-y-6">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                    <img src={displayAuditor.avatar} alt="Avatar" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                    </div>
                    <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#FFDF00]">
                        Posição #{displayAuditor.rank} — {displayAuditor.rank === 1 ? "SOVEREIGN" : displayAuditor.level}
                    </p>
                    <h3 className="text-2xl font-bold font-headline mt-1 uppercase text-[#ffffff]">
                        {displayAuditor.name}
                    </h3>
                    <p className="text-sm text-[#ffffff]/80 font-medium">{displayAuditor.score} pontos consolidados</p>
                    <div className="mt-6 p-4 bg-white/5 rounded-2xl space-y-2.5 backdrop-blur-md border border-white/5">
                        <p className="flex justify-between text-[11px] font-bold text-[#ffffff]/90">
                           <span>O.S Auditadas</span> <span>{displayAuditor.metrics.osCount}</span>
                        </p>
                        <p className="flex justify-between text-[11px] font-bold text-[#ffffff]/90">
                           <span>Erros Pegos</span> <span>{displayAuditor.metrics.discCount}</span>
                        </p>
                        <hr className="border-white/10 my-1" />
                        <p className="flex justify-between text-[11px] font-bold text-[#ffffff]/90">
                           <span>Atrasos</span> <span>{formatMinutes(displayAuditor.metrics.delayData?.totalDelay || 0)}</span>
                        </p>
                        <p className="flex justify-between text-[11px] font-bold text-[#ffffff]/90">
                           <span>Faltas</span> <span>{displayAuditor.metrics.delayData?.faltas || 0}</span>
                        </p>
                    </div>
                    </div>
                </div>
                </div>

                <div className="md:col-span-2 bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col max-h-[500px]">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-primary font-headline">
                    Placar de Auditores
                    </h3>
                </div>

                <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                    {ranking.map((leader) => {
                        const isSelected = displayAuditor && leader.id === displayAuditor.id;
                        return (
                        <div
                            key={leader.id}
                            onClick={() => setSelectedAuditor(leader)}
                            className={cn(
                                "flex items-center justify-between p-4 rounded-2xl transition-all duration-300 group bg-white relative overflow-hidden cursor-pointer border",
                                isSelected 
                                   ? "border-indigo-500 shadow-md shadow-indigo-500/10 bg-indigo-50/40 ring-1 ring-indigo-500 z-10" 
                                   : "border-slate-100 hover:border-indigo-200 hover:shadow-sm"
                            )}
                        >
                        <div className="flex items-center gap-4">
                        <div
                            className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 shadow-sm",
                            leader.rank === 1
                                ? "bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-amber-500/30"
                                : leader.rank === 2
                                ? "bg-slate-300 text-white"
                                : leader.rank === 3
                                    ? "bg-amber-700/60 text-white"
                                    : "bg-slate-100 text-slate-500",
                            )}
                        >
                            #{leader.rank}
                        </div>
                        <img
                            src={leader.avatar}
                            alt={leader.name}
                            className="w-10 h-10 rounded-full object-cover shadow-sm bg-slate-100 shrink-0"
                        />
                        <div className="min-w-0 pr-4">
                            <p className="text-sm font-bold text-slate-900 uppercase truncate">
                            {leader.name}
                            </p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest truncate">
                            {leader.level}
                            </p>
                        </div>
                        </div>
                        <div className="flex items-center gap-6 shrink-0">
                        <div className="text-right">
                            <p className="text-base font-black text-primary dark:text-[#a5b4fc] font-headline leading-none mb-1">
                            {leader.score}
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-300 ml-1">PTS</span>
                            </p>
                            <p
                            className={cn(
                                "text-[9px] font-bold uppercase tracking-widest flex items-center justify-end gap-1",
                                leader.trend.includes("+")
                                ? "text-emerald-500 dark:text-emerald-400"
                                : "text-error dark:text-rose-400",
                            )}
                            >
                            {leader.trend.includes("+") ? (
                                <TrendingUp className="w-2.5 h-2.5" />
                            ) : (
                                <TrendingDown className="w-2.5 h-2.5" />
                            )}
                            {leader.trend}
                            </p>
                        </div>
                        </div>
                    </div>
                    )})}
                </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
                <h3 className="text-xl font-bold text-primary font-headline mb-6 flex items-center gap-2">
                    <Medal className="w-6 h-6 text-primary" /> Regras de Pontuação
                </h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                        <span className="text-sm font-bold text-slate-700">Base</span>
                    </div>
                    <span className="text-sm font-black text-slate-500">1000 pts</span>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                        <span className="text-sm font-bold text-indigo-900">
                        Total Auditado (O.S)
                        </span>
                    </div>
                    <span className="text-sm font-black text-indigo-600">+2 pts / UN</span>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-sm font-bold text-emerald-900">
                        Erros Capturados (Divergência)
                        </span>
                    </div>
                    <span className="text-sm font-black text-emerald-600">+5 pts / UN</span>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 border border-amber-100">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        <span className="text-sm font-bold text-amber-900">
                        Minuto de Atraso
                        </span>
                    </div>
                    <span className="text-sm font-black text-amber-600">-1 pt / MIN</span>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-rose-50 border border-rose-100">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                        <span className="text-sm font-bold text-rose-900">
                        Falta Injustificada
                        </span>
                    </div>
                    <span className="text-sm font-black text-rose-600">-50 pts / DIA</span>
                    </div>
                </div>
                </div>

                <div className="bg-slate-50 relative overflow-hidden p-8 rounded-3xl border border-slate-200 flex flex-col items-center justify-center text-center space-y-6 shadow-inner">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                <div className="w-20 h-20 bg-gradient-to-br from-primary to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-primary/30 -rotate-3 group hover:rotate-0 transition-transform duration-500">
                    <Star className="w-10 h-10 text-white" fill="currentColor" />
                </div>
                <h3 className="text-2xl font-black text-primary font-headline tracking-tight">
                    Níveis Operacionais
                </h3>
                <p className="text-sm text-slate-600 font-medium max-w-sm leading-relaxed">
                    A pontuação consolidada reflete não só a volumetria analisada, mas a precisão do auditor nas análises da O.S e seu compliance na jornada.
                </p>
                </div>
            </div>
          </>
      )}
    </div>
  );
}
