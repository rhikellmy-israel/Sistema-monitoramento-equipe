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
  Box,
  Search,
  Tag
} from 'lucide-react';
import { useData } from '../context/DataContext';
import DateFilter from '../components/DateFilter';
import { DateFilterMode, filterByDate } from '../lib/dateUtils';
import { MaintenanceRecord, SchedulingRecord } from '../types';

export default function MaintenancePage() {
  const { maintenanceInData, maintenanceOutData, schedulingData, productsBase } = useData();

  // Filtros Globais
  const [dateMode, setDateMode] = useState<DateFilterMode>("Todas");
  const [dateValue, setDateValue] = useState<string>("");
  const [selectedTech, setSelectedTech] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<string>("");

  // Dicionário de Produtos (ID -> Descrição)
  const productMap = useMemo(() => {
    const map = new Map<string, string>();
    productsBase.forEach(p => {
      map.set(String(p.id_produto).trim(), p.descricao);
    });
    return map;
  }, [productsBase]);

  // Função utilitária para buscar o nome do produto (Se não achar, retorna o ID original)
  const getProductName = (id: string | number) => {
    const strId = String(id).trim();
    return productMap.get(strId) || strId;
  };

  // Mapeamento de Almoxarifados
  const getAlmoxName = (id: string | number) => {
    const map: Record<string, string> = {
      "632": "Manutenção",
      "559": "Ferramental",
      "15": "Sucata",
      "335": "Conserto",
      "65": "RMA"
    };
    const strId = String(id).trim();
    return map[strId] || `Almox. ${strId}`;
  };

  // ==============================
  // PROCESSAMENTO DE MANUTENÇÕES
  // ==============================
  const filteredMaintenanceIn = useMemo(() => {
    let data = filterByDate(maintenanceInData, dateMode, dateValue, "data_criacao");
    if (selectedProduct) {
      data = data.filter(m => getProductName(m.produto).toUpperCase().includes(selectedProduct.toUpperCase()));
    }
    return data;
  }, [maintenanceInData, dateMode, dateValue, selectedProduct, productMap]);

  const filteredMaintenanceOut = useMemo(() => {
    let data = filterByDate(maintenanceOutData, dateMode, dateValue, "data_criacao");
    if (selectedProduct) {
      data = data.filter(m => getProductName(m.produto).toUpperCase().includes(selectedProduct.toUpperCase()));
    }
    return data;
  }, [maintenanceOutData, dateMode, dateValue, selectedProduct, productMap]);

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
      const id = String(item.id_almox_destino).trim();
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

  // Produtos únicos para o Filtro
  const uniqueProducts = useMemo(() => {
    const set = new Set<string>();
    maintenanceInData.forEach(m => set.add(getProductName(m.produto)));
    maintenanceOutData.forEach(m => set.add(getProductName(m.produto)));
    return Array.from(set).filter(Boolean).sort();
  }, [maintenanceInData, maintenanceOutData, productMap]);

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
        <div className="space-y-6 flex flex-col">
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

          {/* Filtro e Lista de Produtos */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1 h-[300px]">
             <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-700 flex items-center gap-2 whitespace-nowrap">
                  <Tag className="w-4 h-4 text-indigo-500" /> Lista de Equipamentos
                </h3>
                <div className="relative w-full max-w-[250px]">
                   <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                   <select 
                     value={selectedProduct} 
                     onChange={(e) => setSelectedProduct(e.target.value)}
                     className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-[10px] font-bold text-slate-700 outline-none focus:border-indigo-500 transition-colors uppercase appearance-none"
                   >
                     <option value="">Todos os Equipamentos</option>
                     {uniqueProducts.map((p, idx) => <option key={idx} value={p}>{p}</option>)}
                   </select>
                </div>
             </div>
             
             <div className="p-0 overflow-y-auto custom-scrollbar flex-1">
                 <table className="w-full text-left border-collapse">
                    <thead className="bg-white sticky top-0 z-10 shadow-sm">
                       <tr>
                          <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-100">Equipamento</th>
                          <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-100">Qtd</th>
                          <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-100">Status/Destino</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {filteredMaintenanceIn.length === 0 && filteredMaintenanceOut.length === 0 ? (
                          <tr><td colSpan={3} className="p-6 text-center text-slate-400 font-medium text-xs">Nenhum equipamento neste filtro.</td></tr>
                       ) : (
                          <>
                            {/* Render Entradas (Recebidos) */}
                            {filteredMaintenanceIn.map((item, idx) => (
                               <tr key={`in-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-4 py-3">
                                     <p className="text-xs font-bold text-slate-700">{getProductName(item.produto)}</p>
                                     <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5">Entrada • {formatBRDate(item.data_criacao)}</p>
                                  </td>
                                  <td className="px-4 py-3 font-black text-slate-600 text-xs">{item.quantidade || 1}</td>
                                  <td className="px-4 py-3">
                                     <span className="px-2 py-1 rounded text-[9px] font-bold bg-indigo-50 text-indigo-600 uppercase tracking-widest border border-indigo-100">
                                        RECEBIDO ({getAlmoxName(632)})
                                     </span>
                                  </td>
                               </tr>
                            ))}
                            {/* Render Saídas (Expedidos) */}
                            {filteredMaintenanceOut.map((item, idx) => {
                               const destId = String(item.id_almox_destino).trim();
                               const isSuccess = destId === "559";
                               return (
                               <tr key={`out-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-4 py-3">
                                     <p className="text-xs font-bold text-slate-700">{getProductName(item.produto)}</p>
                                     <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5">Saída • {formatBRDate(item.data_criacao)}</p>
                                  </td>
                                  <td className="px-4 py-3 font-black text-slate-600 text-xs">{item.quantidade || 1}</td>
                                  <td className="px-4 py-3">
                                     <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest border ${
                                        isSuccess ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                                     }`}>
                                        ENVIADO: {getAlmoxName(destId)}
                                     </span>
                                  </td>
                               </tr>
                               );
                            })}
                          </>
                       )}
                    </tbody>
                 </table>
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
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
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
