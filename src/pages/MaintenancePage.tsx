import React, { useState, useMemo } from 'react';
import { 
  PenTool, 
  ArrowRight, 
  CheckCircle2, 
  Calendar, 
  Filter, 
  Wrench, 
  Clock,
  AlertTriangle,
  XCircle,
  BarChart3,
  Users,
  Activity,
  CheckSquare,
  Box
} from 'lucide-react';
import { useData } from '../context/DataContext';
import DateFilter from '../components/DateFilter';
import { DateFilterMode, filterByDate } from '../lib/dateUtils';
import { MaintenanceRecord, SchedulingRecord } from '../types';

export default function MaintenancePage() {
  const { maintenanceInData, maintenanceOutData, schedulingData } = useData();

  // Filtros Globais
  const [dateMode, setDateMode] = useState<DateFilterMode>("Todas");
  const [dateValue, setDateValue] = useState<string>("");
  const [selectedTech, setSelectedTech] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  // ==============================
  // PROCESSAMENTO DE MANUTENÇÕES
  // ==============================
  const filteredMaintenanceIn = useMemo(() => {
    return filterByDate(maintenanceInData, dateMode, dateValue, "data_criacao");
  }, [maintenanceInData, dateMode, dateValue]);

  const filteredMaintenanceOut = useMemo(() => {
    return filterByDate(maintenanceOutData, dateMode, dateValue, "data_criacao");
  }, [maintenanceOutData, dateMode, dateValue]);

  // Cálculos de Totais
  const totalRecebido = filteredMaintenanceIn.reduce((acc, curr) => acc + (curr.quantidade || 1), 0);
  
  const exitDestinations = useMemo(() => {
    const dest = {
      ferramental: 0,
      sucata: 0,
      conserto: 0,
      rma: 0
    };
    filteredMaintenanceOut.forEach(item => {
      const id = String(item.id_almox_destino);
      if (id === "559") dest.ferramental += item.quantidade || 1;
      else if (id === "15") dest.sucata += item.quantidade || 1;
      else if (id === "335") dest.conserto += item.quantidade || 1;
      else if (id === "65") dest.rma += item.quantidade || 1;
    });
    return dest;
  }, [filteredMaintenanceOut]);

  const sucessoEstoque = exitDestinations.ferramental;
  const semConsertoOutros = exitDestinations.sucata + exitDestinations.conserto + exitDestinations.rma;
  const taxaSucesso = totalRecebido > 0 ? Math.round((sucessoEstoque / totalRecebido) * 100) : 0;

  // ==============================
  // PROCESSAMENTO DE AGENDAMENTOS (ESCADAS)
  // ==============================
  const filteredScheduling = useMemo(() => {
    let data = filterByDate(schedulingData, dateMode, dateValue, "data");
    if (selectedTech) data = data.filter(s => s.tecnico.toUpperCase() === selectedTech.toUpperCase());
    if (selectedStatus) data = data.filter(s => s.status.toUpperCase() === selectedStatus.toUpperCase());
    return data;
  }, [schedulingData, dateMode, dateValue, selectedTech, selectedStatus]);

  const schedStats = useMemo(() => {
    const stats = { realizadas: 0, reagendadas: 0, falhas: 0, total: 0 };
    filteredScheduling.forEach(item => {
      stats.total += 1;
      const st = item.status.toUpperCase();
      if (st.includes("REALIZADA")) stats.realizadas += 1;
      else if (st.includes("REAGENDADA")) stats.reagendadas += 1;
      else if (st.includes("POSSIVEL") || st.includes("POSSÍVEL")) stats.falhas += 1;
    });
    return stats;
  }, [filteredScheduling]);

  const uniqueTechs = useMemo(() => {
    const set = new Set<string>();
    schedulingData.forEach(item => set.add(item.tecnico.toUpperCase()));
    return Array.from(set).filter(Boolean).sort();
  }, [schedulingData]);

  const uniqueStatuses = useMemo(() => {
    const set = new Set<string>();
    schedulingData.forEach(item => set.add(item.status.toUpperCase()));
    return Array.from(set).filter(Boolean).sort();
  }, [schedulingData]);

  const formatBRDate = (isoString: string) => {
    if (!isoString) return "-";
    const [year, month, day] = isoString.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-primary font-headline tracking-tight flex items-center gap-4">
             <Wrench className="w-10 h-10 text-indigo-600" />
             Manutenções & Agendamentos
          </h1>
          <p className="text-slate-500 text-lg leading-relaxed mt-2 font-medium">
            Acompanhamento de fluxo de equipamentos em manutenção e controle de agendamentos.
          </p>
        </div>
      </header>

      {/* Barra de Filtros Globais */}
      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-6">
        <div className="flex-1 w-full">
           <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
             <Calendar className="w-3 h-3" /> Período
           </label>
           <DateFilter mode={dateMode} value={dateValue} onChange={(m, v) => { setDateMode(m); setDateValue(v); }} />
        </div>
        <div className="h-10 w-px bg-slate-200 hidden md:block"></div>
        <div className="flex-1 w-full flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
             <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
               <Users className="w-3 h-3" /> Técnico (Agendamentos)
             </label>
             <select 
               value={selectedTech} 
               onChange={(e) => setSelectedTech(e.target.value)}
               className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-primary/50 transition-colors uppercase"
             >
               <option value="">Todos os Técnicos</option>
               {uniqueTechs.map(t => <option key={t} value={t}>{t}</option>)}
             </select>
          </div>
          <div className="flex-1">
             <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
               <Filter className="w-3 h-3" /> Status (Agendamentos)
             </label>
             <select 
               value={selectedStatus} 
               onChange={(e) => setSelectedStatus(e.target.value)}
               className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-primary/50 transition-colors uppercase"
             >
               <option value="">Todos os Status</option>
               {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
             </select>
          </div>
        </div>
      </section>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* COLUNA ESQUERDA: Fluxo de Manutenção */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
             <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                 <Wrench className="w-5 h-5" />
             </div>
             <div>
                 <h2 className="text-xl font-headline font-black text-slate-800">Fluxo de Manutenção (632)</h2>
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Estatísticas de Recebimento e Saída</p>
             </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {/* Total Recebido */}
             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-indigo-300 transition-colors">
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                     <ArrowRight className="w-16 h-16 text-indigo-500" />
                 </div>
                 <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mb-2 block">Total Recebido</span>
                 <div className="flex items-end gap-3">
                     <span className="text-5xl font-headline font-black text-slate-800">{totalRecebido}</span>
                     <span className="text-xs font-bold text-slate-400 mb-2">equipamentos</span>
                 </div>
             </div>

             {/* Sucesso (Ferramental) */}
             <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-6 rounded-2xl shadow-lg relative overflow-hidden group hover:shadow-xl transition-all">
                 <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                     <Box className="w-16 h-16 text-white" />
                 </div>
                 <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-100 mb-2 block">Retornados ao Estoque (559)</span>
                 <div className="flex items-end gap-3">
                     <span className="text-5xl font-headline font-black text-white">{sucessoEstoque}</span>
                     <span className="text-xs font-bold text-emerald-200 mb-2">recuperados</span>
                 </div>
             </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {/* Outros / Sem Conserto */}
             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-rose-300 transition-colors">
                 <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                     <XCircle className="w-16 h-16 text-rose-500" />
                 </div>
                 <span className="text-[10px] font-bold uppercase tracking-widest text-rose-500 mb-2 flex items-center gap-1">
                     <AlertTriangle className="w-3 h-3" /> Sucata / Conserto / RMA
                 </span>
                 <div className="flex items-end gap-3">
                     <span className="text-5xl font-headline font-black text-slate-800">{semConsertoOutros}</span>
                     <span className="text-xs font-bold text-slate-400 mb-2">não resolvidos</span>
                 </div>
             </div>

             {/* Taxa de Sucesso */}
             <div className="bg-slate-800 p-6 rounded-2xl shadow-lg relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                     <Activity className="w-16 h-16 text-white" />
                 </div>
                 <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">Taxa de Recuperação</span>
                 <div className="flex items-end gap-3">
                     <span className="text-5xl font-headline font-black text-white">{taxaSucesso}%</span>
                     <span className="text-xs font-bold text-slate-400 mb-2">de sucesso</span>
                 </div>
                 <div className="w-full bg-slate-700 h-2 rounded-full mt-4 overflow-hidden">
                     <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${taxaSucesso}%` }}></div>
                 </div>
             </div>
          </div>

          {/* Destinos Específicos */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
             <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                 <BarChart3 className="w-4 h-4" /> Detalhamento de Saídas
             </h3>
             <div className="grid grid-cols-3 gap-4">
                 <div className="text-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Sucata (15)</div>
                    <div className="text-2xl font-black text-slate-700">{exitDestinations.sucata}</div>
                 </div>
                 <div className="text-center p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                    <div className="text-[10px] font-bold uppercase text-indigo-400 mb-1">Conserto (335)</div>
                    <div className="text-2xl font-black text-indigo-700">{exitDestinations.conserto}</div>
                 </div>
                 <div className="text-center p-3 bg-rose-50/50 rounded-xl border border-rose-100/50">
                    <div className="text-[10px] font-bold uppercase text-rose-400 mb-1">RMA (65)</div>
                    <div className="text-2xl font-black text-rose-700">{exitDestinations.rma}</div>
                 </div>
             </div>
          </div>
        </div>

        {/* COLUNA DIREITA: Agendamentos de Escadas */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
             <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                 <Calendar className="w-5 h-5" />
             </div>
             <div>
                 <h2 className="text-xl font-headline font-black text-slate-800">Manutenção de Escadas</h2>
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Relatório de Agendamentos</p>
             </div>
          </div>

          {/* Cards de Resumo */}
          <div className="grid grid-cols-4 gap-2">
             <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                <span className="text-[9px] font-bold uppercase text-slate-500 mb-1">Total</span>
                <span className="text-xl font-black text-slate-800">{schedStats.total}</span>
             </div>
             <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                <span className="text-[9px] font-bold uppercase text-emerald-600 mb-1">Realizadas</span>
                <span className="text-xl font-black text-emerald-700">{schedStats.realizadas}</span>
             </div>
             <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                <span className="text-[9px] font-bold uppercase text-rose-600 mb-1">Falhas</span>
                <span className="text-xl font-black text-rose-700">{schedStats.falhas}</span>
             </div>
             <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                <span className="text-[9px] font-bold uppercase text-amber-600 mb-1">Reagend.</span>
                <span className="text-xl font-black text-amber-700">{schedStats.reagendadas}</span>
             </div>
          </div>

          {/* Lista de Observações Detalhadas */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[550px]">
             <div className="p-5 border-b border-slate-100 bg-slate-50">
               <h3 className="text-sm font-bold uppercase tracking-widest text-slate-700 flex items-center gap-2">
                 <CheckSquare className="w-4 h-4 text-primary" /> Histórico de Agendamentos
               </h3>
             </div>
             
             <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-3">
                {filteredScheduling.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center text-slate-400">
                       <Calendar className="w-12 h-12 mb-3 opacity-20" />
                       <p className="font-medium text-sm">Nenhum agendamento encontrado.</p>
                   </div>
                ) : filteredScheduling.map((item, idx) => {
                   
                   const isSuccess = item.status.toUpperCase().includes('REALIZADA');
                   const isFail = item.status.toUpperCase().includes('POSSIVEL') || item.status.toUpperCase().includes('POSSÍVEL');
                   const isResched = item.status.toUpperCase().includes('REAGENDADA');
                   
                   let statusColor = "bg-slate-100 text-slate-600 border-slate-200";
                   let icon = <Clock className="w-4 h-4" />;
                   
                   if (isSuccess) {
                      statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                      icon = <CheckCircle2 className="w-4 h-4" />;
                   } else if (isFail) {
                      statusColor = "bg-rose-50 text-rose-700 border-rose-200";
                      icon = <XCircle className="w-4 h-4" />;
                   } else if (isResched) {
                      statusColor = "bg-amber-50 text-amber-700 border-amber-200";
                      icon = <AlertTriangle className="w-4 h-4" />;
                   }

                   return (
                     <div key={idx} className={`p-4 rounded-xl border ${statusColor} hover:shadow-md transition-shadow flex flex-col gap-3 group relative overflow-hidden`}>
                        {/* Efeito de brilho hover */}
                        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-40 transition-opacity duration-300 pointer-events-none"></div>
                        
                        <div className="flex items-start justify-between gap-4 relative z-10">
                           <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg bg-white/60 shadow-sm`}>
                                 {icon}
                              </div>
                              <div>
                                 <p className="text-xs font-bold">{formatBRDate(item.data)} <span className="text-[10px] opacity-70 ml-1 font-medium">{item.horario}</span></p>
                                 <p className="text-sm font-black tracking-tight">{item.tecnico}</p>
                              </div>
                           </div>
                           <span className={`px-2.5 py-1 rounded-md text-[9px] font-black tracking-widest uppercase bg-white/60 shadow-sm whitespace-nowrap`}>
                              {item.status}
                           </span>
                        </div>
                        
                        <div className="bg-white/60 rounded-lg p-3 text-xs font-medium leading-relaxed shadow-sm relative z-10">
                           {item.observacao ? (
                             <span className="text-slate-700">{item.observacao}</span>
                           ) : (
                             <span className="text-slate-400 italic">Nenhuma observação registrada para este agendamento.</span>
                           )}
                        </div>
                     </div>
                   );
                })}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
