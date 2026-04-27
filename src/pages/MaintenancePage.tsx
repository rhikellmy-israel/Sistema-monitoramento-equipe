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
  Users
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

  // Cálculo de Saldo (Produto/Descrição)
  const maintenanceBalance = useMemo(() => {
    const map = new Map<string, { produto: string, descricao: string, entradas: number, saidas: number, saldo: number }>();

    filteredMaintenanceIn.forEach(item => {
      const key = `${item.produto}_${item.descricao}`;
      if (!map.has(key)) {
        map.set(key, { produto: item.produto, descricao: item.descricao, entradas: 0, saidas: 0, saldo: 0 });
      }
      map.get(key)!.entradas += item.quantidade || 1;
    });

    filteredMaintenanceOut.forEach(item => {
      const key = `${item.produto}_${item.descricao}`;
      if (!map.has(key)) {
        map.set(key, { produto: item.produto, descricao: item.descricao, entradas: 0, saidas: 0, saldo: 0 });
      }
      map.get(key)!.saidas += item.quantidade || 1;
    });

    return Array.from(map.values()).map(item => ({
      ...item,
      saldo: item.entradas - item.saidas
    })).sort((a, b) => b.saldo - a.saldo);
  }, [filteredMaintenanceIn, filteredMaintenanceOut]);

  // Destinos de Saída (Categorização)
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

  // ==============================
  // PROCESSAMENTO DE AGENDAMENTOS
  // ==============================
  const filteredScheduling = useMemo(() => {
    let data = filterByDate(schedulingData, dateMode, dateValue, "data");
    if (selectedTech) data = data.filter(s => s.tecnico.toUpperCase() === selectedTech.toUpperCase());
    if (selectedStatus) data = data.filter(s => s.status.toUpperCase() === selectedStatus.toUpperCase());
    return data;
  }, [schedulingData, dateMode, dateValue, selectedTech, selectedStatus]);

  // Métricas por Técnico
  const techMetrics = useMemo(() => {
    const map = new Map<string, { realizadas: number, reagendadas: number, falhas: number, total: number }>();
    filteredScheduling.forEach(item => {
      const tech = item.tecnico.toUpperCase();
      const status = item.status.toUpperCase();
      if (!map.has(tech)) {
        map.set(tech, { realizadas: 0, reagendadas: 0, falhas: 0, total: 0 });
      }
      const stats = map.get(tech)!;
      stats.total += 1;
      if (status.includes("REALIZADA")) stats.realizadas += 1;
      else if (status.includes("REAGENDADA")) stats.reagendadas += 1;
      else if (status.includes("POSSIVEL") || status.includes("POSSÍVEL")) stats.falhas += 1;
    });
    return Array.from(map.entries()).map(([tecnico, metrics]) => ({ tecnico, ...metrics })).sort((a, b) => b.total - a.total);
  }, [filteredScheduling]);

  // Lista de Técnicos Únicos (para o filtro)
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

  // Formatar ISO para Brasileiro
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
      <section className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm flex flex-col md:flex-row items-center gap-6">
        <div className="flex-1 w-full">
           <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block flex items-center gap-2">
             <Calendar className="w-3 h-3" /> Período
           </label>
           <DateFilter mode={dateMode} value={dateValue} onChange={(m, v) => { setDateMode(m); setDateValue(v); }} />
        </div>
        <div className="h-10 w-px bg-slate-200 hidden md:block"></div>
        <div className="flex-1 w-full flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
             <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block flex items-center gap-2">
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
             <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block flex items-center gap-2">
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
        <div className="space-y-8">
          <h2 className="text-xl font-headline font-bold text-primary flex items-center gap-2 border-b pb-3 border-slate-100">
             <ArrowRight className="w-5 h-5 text-tertiary" /> Fluxo de Manutenção (Setor 632)
          </h2>

          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Total Recebido</span>
                 <span className="text-3xl font-headline font-black text-slate-800">{filteredMaintenanceIn.reduce((acc, curr) => acc + (curr.quantidade || 1), 0)}</span>
             </div>
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Total Expedido</span>
                 <span className="text-3xl font-headline font-black text-primary">{filteredMaintenanceOut.reduce((acc, curr) => acc + (curr.quantidade || 1), 0)}</span>
             </div>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10 overflow-hidden">
             <div className="p-5 border-b border-slate-50 bg-slate-50/50">
               <h3 className="text-sm font-bold uppercase tracking-widest text-slate-700">Saldo por Produto</h3>
             </div>
             <div className="p-0 overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                   <thead className="bg-slate-50 sticky top-0 z-10">
                      <tr>
                         <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Produto / Descrição</th>
                         <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Entradas</th>
                         <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Saídas</th>
                         <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Saldo</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {maintenanceBalance.length === 0 ? (
                         <tr><td colSpan={4} className="p-8 text-center text-slate-400 font-medium text-sm">Sem movimentações no período.</td></tr>
                      ) : maintenanceBalance.map((item, idx) => (
                         <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                               <p className="text-xs font-bold text-slate-800">{item.produto}</p>
                               <p className="text-[10px] text-slate-500 truncate max-w-[200px]" title={item.descricao}>{item.descricao}</p>
                            </td>
                            <td className="px-6 py-4 text-center font-bold text-slate-600">{item.entradas}</td>
                            <td className="px-6 py-4 text-center font-bold text-slate-600">{item.saidas}</td>
                            <td className="px-6 py-4 text-center">
                               <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  item.saldo > 0 ? 'bg-error-container text-error' : item.saldo === 0 ? 'bg-tertiary-fixed/30 text-tertiary' : 'bg-slate-100 text-slate-500'
                               }`}>
                                  {item.saldo}
                               </span>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>

          <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
             <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Destinos de Saída (Categorização)
             </h3>
             <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm text-center">
                   <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">Ferramental</div>
                   <div className="text-2xl font-black text-slate-800">{exitDestinations.ferramental}</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm text-center">
                   <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">Sucata</div>
                   <div className="text-2xl font-black text-slate-800">{exitDestinations.sucata}</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm text-center border-b-2 border-indigo-400">
                   <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">Conserto</div>
                   <div className="text-2xl font-black text-slate-800">{exitDestinations.conserto}</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm text-center border-b-2 border-tertiary">
                   <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">RMA</div>
                   <div className="text-2xl font-black text-slate-800">{exitDestinations.rma}</div>
                </div>
             </div>
          </div>
        </div>

        {/* COLUNA DIREITA: Agendamentos de Escadas */}
        <div className="space-y-8">
          <h2 className="text-xl font-headline font-bold text-primary flex items-center gap-2 border-b pb-3 border-slate-100">
             <Calendar className="w-5 h-5 text-indigo-500" /> Relatório de Agendamentos (Escadas)
          </h2>

          {/* Resumo de Técnicos */}
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10 overflow-hidden">
             <div className="p-5 border-b border-slate-50 bg-slate-50/50">
               <h3 className="text-sm font-bold uppercase tracking-widest text-slate-700">Produtividade por Técnico</h3>
             </div>
             <div className="p-6 grid grid-cols-1 gap-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                {techMetrics.length === 0 ? (
                   <div className="text-center text-slate-400 font-medium text-sm py-4">Nenhum agendamento encontrado para o filtro atual.</div>
                ) : techMetrics.map((metric, idx) => (
                   <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                            {metric.tecnico.charAt(0)}
                         </div>
                         <div>
                            <p className="text-sm font-bold text-slate-800">{metric.tecnico}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">{metric.total} agendamentos</p>
                         </div>
                      </div>
                      <div className="flex gap-2 text-[10px] font-bold">
                         <span className="px-2 py-1 bg-tertiary-fixed/30 text-tertiary rounded flex items-center gap-1" title="Realizadas">
                            <CheckCircle2 className="w-3 h-3" /> {metric.realizadas}
                         </span>
                         <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded flex items-center gap-1" title="Reagendadas">
                            <Clock className="w-3 h-3" /> {metric.reagendadas}
                         </span>
                         <span className="px-2 py-1 bg-error-container text-error rounded flex items-center gap-1" title="Não foi possível">
                            <XCircle className="w-3 h-3" /> {metric.falhas}
                         </span>
                      </div>
                   </div>
                ))}
             </div>
          </div>

          {/* Lista de Observações Detalhadas */}
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10 overflow-hidden">
             <div className="p-5 border-b border-slate-50 bg-slate-50/50">
               <h3 className="text-sm font-bold uppercase tracking-widest text-slate-700">Detalhamento e Observações</h3>
             </div>
             <div className="p-0 overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                   <thead className="bg-slate-50 sticky top-0 z-10">
                      <tr>
                         <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 min-w-[100px]">Data</th>
                         <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Técnico / Status</th>
                         <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 w-1/2">Observação</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {filteredScheduling.length === 0 ? (
                         <tr><td colSpan={3} className="p-8 text-center text-slate-400 font-medium text-sm">Sem registros.</td></tr>
                      ) : filteredScheduling.map((item, idx) => (
                         <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                               <p className="text-xs font-bold text-slate-700">{formatBRDate(item.data)}</p>
                               <p className="text-[10px] text-slate-400">{item.horario}</p>
                            </td>
                            <td className="px-6 py-4">
                               <p className="text-xs font-bold text-slate-800">{item.tecnico}</p>
                               <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase ${
                                  item.status.toUpperCase().includes('REALIZADA') ? 'bg-tertiary-fixed/30 text-tertiary' : 
                                  item.status.toUpperCase().includes('REAGENDADA') ? 'bg-amber-100 text-amber-700' : 
                                  item.status.toUpperCase().includes('POSSIVEL') || item.status.toUpperCase().includes('POSSÍVEL') ? 'bg-error-container text-error' : 
                                  'bg-slate-200 text-slate-600'
                               }`}>
                                  {item.status}
                               </span>
                            </td>
                            <td className="px-6 py-4">
                               <p className="text-xs text-slate-600 leading-relaxed max-w-[250px] whitespace-normal">
                                  {item.observacao || <span className="text-slate-300 italic">Sem observação</span>}
                               </p>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
