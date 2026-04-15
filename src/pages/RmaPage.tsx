import React, { useState, useMemo } from "react";
import { 
  Plus, 
  X, 
  CalendarDays, 
  XCircle,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
  ExternalLink,
  ChevronRight,
  GripHorizontal
} from "lucide-react";
import { cn } from "../lib/utils";
import { useData } from "../context/DataContext";
import { RmaRecord } from "../types";
import { motion, AnimatePresence } from "motion/react";

const COLUMNS = [
  { id: "DAR INICIO", label: "Dar Início", icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-200", bar: "bg-amber-400" },
  { id: "EM PROGRESSO", label: "Em Progresso", icon: Clock, color: "text-indigo-500", bg: "bg-indigo-50", border: "border-indigo-200", bar: "bg-indigo-500" },
  { id: "FINALIZADO", label: "Finalizado", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-200", bar: "bg-emerald-500" }
] as const;

export default function RmaPage() {
  const { rmaData, setRmaData } = useData();
  const [filterMonth, setFilterMonth] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRma, setEditingRma] = useState<RmaRecord | null>(null);
  
  const [formData, setFormData] = useState({
      fornecedor: "",
      mes_referencia: new Date().toISOString().slice(0, 7), // YYYY-MM
      equipamentos: "",
      nfs: "",
      status: "DAR INICIO" as RmaRecord["status"],
      anexos: [] as { name: string, dataUrl: string }[]
  });

  const filteredData = useMemo(() => {
    return rmaData.filter((rma) => {
      const matchMonth = filterMonth ? rma.mes_referencia === filterMonth : true;
      const matchSearch = searchTerm 
        ? rma.fornecedor.toLowerCase().includes(searchTerm.toLowerCase()) || 
          rma.nfs.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      return matchMonth && matchSearch;
    });
  }, [rmaData, filterMonth, searchTerm]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("rmaId", id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: RmaRecord["status"]) => {
    const id = e.dataTransfer.getData("rmaId");
    if (id) {
        setRmaData(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    }
  };

  const openForm = (rma?: RmaRecord, e?: React.MouseEvent) => {
      if(e) e.stopPropagation();
      if (rma) {
          setEditingRma(rma);
          setFormData({
              fornecedor: rma.fornecedor,
              mes_referencia: rma.mes_referencia,
              equipamentos: rma.equipamentos,
              nfs: rma.nfs,
              status: rma.status,
              anexos: rma.anexos || []
          });
      } else {
          setEditingRma(null);
          setFormData({
              fornecedor: "",
              mes_referencia: filterMonth || new Date().toISOString().slice(0, 7),
              equipamentos: "",
              nfs: "",
              status: "DAR INICIO",
              anexos: []
          });
      }
      setIsModalOpen(true);
  };

  const deleteRma = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if(window.confirm("Deseja realmente excluir este registro de RMA?")) {
          setRmaData(prev => prev.filter(r => r.id !== id));
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!formData.fornecedor.trim()) {
          alert("O fornecedor é obrigatório.");
          return;
      }

      if (editingRma) {
          setRmaData(prev => prev.map(r => r.id === editingRma.id ? { 
              ...r, 
              ...formData 
          } : r));
      } else {
          const newRma: RmaRecord = {
              id: Date.now().toString(),
              ...formData,
              created_at: new Date().toISOString()
          };
          setRmaData(prev => [...prev, newRma]);
      }
      setIsModalOpen(false);
  };

  const formatMonth = (ym: string) => {
      if(!ym) return "";
      const p = ym.split("-");
      if(p.length !== 2) return ym;
      const d = new Date(parseInt(p[0]), parseInt(p[1])-1);
      return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric'}).toUpperCase();
  };

  const isValidUrl = (str: string) => {
      try { return Boolean(new URL(str)); } 
      catch(e) { return false; }
  };

  const parseNFs = (nfsString: string) => {
      if (!nfsString) return [];
      return nfsString.split(",").map(n => n.trim()).filter(Boolean);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h2 className="text-5xl font-black text-slate-800 font-headline tracking-tighter mb-4 pt-2">
             Gestão de RMA
          </h2>
          <p className="text-slate-500 text-lg leading-relaxed font-medium">
            Módulo aprimorado para acompanhamento de garantias. Anexe Notas Fiscais e Planilhas de relação em cada fornecedor.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="bg-white p-3 pr-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all group">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shadow-inner group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300">
                    <CalendarDays className="w-6 h-6" />
                </div>
                <div className="flex flex-col relative">
                    <span className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-0.5">Competência</span>
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

            <button 
                onClick={() => openForm()}
                className="bg-primary hover:bg-slate-800 text-white px-6 py-4 rounded-2xl shadow-lg shadow-primary/20 flex items-center gap-3 font-bold transition-all border border-slate-700/50 hover:scale-105 active:scale-95"
            >
                <Plus className="w-5 h-5" />
                <span>Registrar RMA</span>
            </button>
        </div>
      </div>

      <div className="flex items-center -mt-2">
            <input 
                type="text" 
                placeholder="Pesquisar por Fornecedor ou número de NF..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:max-w-md bg-white border border-slate-200 px-5 py-3.5 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all font-semibold text-slate-700 outline-none placeholder:text-slate-400 placeholder:font-medium"
            />
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
         {COLUMNS.map((col, idx) => {
             const colData = filteredData.filter(r => r.status === col.id);
             return (
                 <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.15, type: "spring", bounce: 0.3 }}
                    key={col.id} 
                    className="flex flex-col bg-slate-200/40 rounded-3xl p-4 border border-slate-200/80 min-h-[600px] pb-10 shadow-inner"
                    onDragOver={handleDragOver}
                    onDrop={(e: any) => handleDrop(e, col.id as RmaRecord["status"])}
                 >
                     <div className="flex items-center justify-between mb-6 px-3 pt-2">
                         <div className="flex items-center gap-3">
                             <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border", col.bg, col.border)}>
                                 <col.icon className={cn("w-5 h-5", col.color)} />
                             </div>
                             <h3 className="text-lg font-black font-headline text-slate-800 tracking-tight">{col.label}</h3>
                         </div>
                         <div className="px-3 py-1 rounded-full bg-white text-slate-600 font-bold text-sm shadow-sm border border-slate-200">
                             {colData.length}
                         </div>
                     </div>

                     <div className="flex-1 space-y-4">
                         {colData.map((rma) => {
                             const nfsArr = parseNFs(rma.nfs);
                             const hasLink = isValidUrl(rma.equipamentos);
                             
                             return (
                             <motion.div 
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                key={rma.id} 
                                draggable 
                                onDragStart={(e: any) => handleDragStart(e, rma.id)}
                                onClick={() => openForm(rma)}
                                className={cn(
                                    "bg-white p-5 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.03)] border-2 cursor-grab active:cursor-grabbing hover:shadow-xl transition-all group relative block transform-gpu",
                                    col.id === 'FINALIZADO' ? 'border-emerald-100 hover:border-emerald-300 hover:-translate-y-1' : 
                                    col.id === 'EM PROGRESSO' ? 'border-indigo-100 hover:border-indigo-300 hover:-translate-y-1' : 
                                    'border-slate-100 hover:border-amber-300 hover:-translate-y-1'
                                )}
                             >
                                 {/* Indicador de Status Colorido Superior */}
                                 <div className={cn("absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-1 rounded-b-full shadow-sm", col.bar)}></div>

                                 <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={(e) => deleteRma(rma.id, e)}
                                        className="text-slate-300 hover:text-rose-500 bg-slate-50 hover:bg-rose-50 rounded-full p-2.5 transition-colors border border-transparent hover:border-rose-100 shadow-sm"
                                        title="Excluir"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                 </div>
                                 
                                 <div className="flex items-start justify-between mb-4 mt-2 pr-10">
                                     <div className="flex gap-2.5 items-start">
                                        <GripHorizontal className="w-5 h-5 text-slate-300 shrink-0 mt-0.5 cursor-grab group-active:cursor-grabbing" />
                                        <div>
                                            <h4 className="text-base font-black text-slate-800 uppercase line-clamp-1 group-hover:text-indigo-900 transition-colors">{rma.fornecedor}</h4>
                                            <p className="text-[10px] font-black tracking-[0.1em] text-slate-400 uppercase mt-0.5">{formatMonth(rma.mes_referencia)}</p>
                                        </div>
                                     </div>
                                 </div>
                                 
                                 <div className="space-y-3 mt-5">
                                    {/* NFs Tags Area */}
                                    {(nfsArr.length > 0 || (rma.anexos && rma.anexos.length > 0)) && (
                                        <div className="flex flex-col gap-1.5">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-0.5">Notas Fiscais e Anexos</span>
                                            <div className="flex flex-col gap-2">
                                                {nfsArr.length > 0 && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {nfsArr.map((nf, i) => (
                                                            <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 shadow-sm">
                                                                <FileText className="w-3.5 h-3.5 text-slate-400" />
                                                                NF: {nf}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                
                                                {rma.anexos && rma.anexos.map((anexo, i) => (
                                                    <a 
                                                        key={`pdf-${i}`}
                                                        href={anexo.dataUrl} 
                                                        download={anexo.name}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="inline-flex items-center justify-between gap-1.5 px-3 py-2 rounded-lg bg-rose-50 border border-rose-100 hover:border-rose-300 transition-colors w-full group/pdf"
                                                    >
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <FileText className="w-3.5 h-3.5 text-rose-500" />
                                                            <span className="text-xs font-bold text-rose-900 truncate">PDF: {anexo.name}</span>
                                                        </div>
                                                        <ExternalLink className="w-3.5 h-3.5 text-rose-400 group-hover/pdf:text-rose-600" />
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Planilha/Relação Area */}
                                    <div className="flex flex-col gap-1.5 pt-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-0.5">Ressalvas / Planilha</span>
                                        {hasLink ? (
                                            <a 
                                                href={rma.equipamentos}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="flex items-center justify-between w-full p-3 bg-indigo-50 border border-indigo-100 hover:border-indigo-300 hover:bg-indigo-100 transition-colors rounded-xl group/link"
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0">
                                                        <LinkIcon className="w-4 h-4 text-indigo-500" />
                                                    </div>
                                                    <span className="text-sm font-bold text-indigo-900 truncate">Planilha de Equipamentos</span>
                                                </div>
                                                <ExternalLink className="w-4 h-4 text-indigo-400 group-hover/link:text-indigo-600 shrink-0" />
                                            </a>
                                        ) : (
                                            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                                                <p className="text-xs font-medium text-slate-500 line-clamp-3 leading-relaxed">
                                                    {rma.equipamentos || "Sem planilha ou descrição anexada."}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                 </div>
                             </div>
                         )})}

                         {colData.length === 0 && (
                             <div className="h-40 border-[3px] border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 text-sm font-bold gap-3 opacity-60">
                                 <Plus className="w-8 h-8" />
                                 Arraste para cá
                             </div>
                         )}
                     </div>
                 </div>
             )
         })}
      </div>

      {/* Form Modal */}
      <AnimatePresence>
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)}></motion.div>
          
          <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl relative z-10 flex flex-col max-h-[90vh] border border-slate-100">
            <div className="flex items-center justify-between p-7 border-b border-slate-100">
              <div>
                <h3 className="text-2xl font-black font-headline text-slate-800">
                  {editingRma ? "Editar RMA" : "Novo Registro de RMA"}
                </h3>
                <p className="text-sm text-slate-500 font-medium mt-1">Preencha os dados do envio e anexe as referências.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-rose-50 hover:text-rose-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-7 overflow-y-auto custom-scrollbar flex-1">
              <form id="rmaForm" onSubmit={handleSubmit} className="space-y-7">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* Fornecedor */}
                  <div className="space-y-2.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-widest pl-1">Fornecedor / Fabricante</label>
                    <input 
                      required
                      placeholder="Ex: Dell, HP, Positivo..."
                      className="w-full bg-slate-50 border border-slate-200 px-5 py-4 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all font-bold outline-none text-slate-800 uppercase shadow-sm placeholder:font-medium placeholder:normal-case placeholder:text-slate-400"
                      value={formData.fornecedor}
                      onChange={e => setFormData({...formData, fornecedor: e.target.value})}
                    />
                  </div>

                  {/* Competencia */}
                  <div className="space-y-2.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-widest pl-1">Mês Referência</label>
                    <input 
                      type="month"
                      required
                      className="w-full bg-slate-50 border border-slate-200 px-5 py-4 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all font-bold outline-none text-slate-800 uppercase shadow-sm"
                      value={formData.mes_referencia}
                      onChange={e => setFormData({...formData, mes_referencia: e.target.value})}
                    />
                  </div>
                </div>

                {/* Status selector */}
                <div className="space-y-2.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-widest pl-1">
                        Andamento Atual
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
                        {COLUMNS.map(col => (
                            <button
                                type="button"
                                key={col.id}
                                onClick={() => setFormData({...formData, status: col.id as RmaRecord["status"]})}
                                className={cn(
                                    "px-4 py-3 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2",
                                    formData.status === col.id 
                                        ? cn("bg-white border-2 shadow-sm", col.color, col.border) 
                                        : "bg-transparent border-transparent text-slate-500 hover:bg-slate-200/50"
                                )}
                            >
                                <col.icon className="w-4 h-4 shrink-0" />
                                {col.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* NF Input and PDF Attachments */}
                <div className="space-y-4 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-2 mb-1 pl-1">
                        <FileText className="w-4 h-4 text-indigo-500" />
                        <label className="text-xs font-black text-slate-700 uppercase tracking-widest">Notas Fiscais de Retorno</label>
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold text-slate-400 pl-1 mb-2">Se houver mais de uma NF, separe os números por vírgula (,)</p>
                        <input 
                          placeholder="Ex: 59382, 10293, Danfe 1002"
                          className="w-full bg-slate-50 border border-slate-200 px-5 py-4 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all font-bold outline-none text-slate-800"
                          value={formData.nfs}
                          onChange={e => setFormData({...formData, nfs: e.target.value})}
                        />
                    </div>
                    
                    <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 uppercase">Arquivos Anexos (PDF / Excel)</span>
                            <label className="cursor-pointer bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                                + Anexar Arquivo
                                <input 
                                    type="file" 
                                    accept="application/pdf, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, .csv" 
                                    className="hidden"
                                    multiple
                                    onChange={(e) => {
                                        const files = Array.from(e.target.files || []);
                                        files.forEach(file => {
                                            const reader = new FileReader();
                                            reader.onload = (ev) => {
                                                if (ev.target?.result) {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        anexos: [...(prev.anexos || []), { name: file.name, dataUrl: ev.target!.result as string }]
                                                    }));
                                                }
                                            };
                                            reader.readAsDataURL(file);
                                        });
                                        e.target.value = ''; // Reset input
                                    }}
                                />
                            </label>
                        </div>
                        {formData.anexos && formData.anexos.length > 0 && (
                            <div className="mt-3 flex flex-col gap-2">
                                {formData.anexos.map((anexo, i) => (
                                    <div key={i} className="flex items-center justify-between bg-slate-50 p-2 px-3 rounded-lg border border-slate-200">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                            <span className="text-xs font-semibold text-slate-600 truncate">{anexo.name}</span>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => setFormData(prev => ({ ...prev, anexos: prev.anexos?.filter((_, idx) => idx !== i) }))}
                                            className="text-slate-400 hover:text-rose-500 p-1"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Equipamentos/Link Input */}
                <div className="space-y-2.5 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between mb-1 pl-1">
                        <div className="flex items-center gap-2">
                            <LinkIcon className="w-4 h-4 text-indigo-500" />
                            <label className="text-xs font-black text-slate-700 uppercase tracking-widest">Anexar Relação de Equipamentos</label>
                        </div>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-400 pl-1 mb-3">Cole o Link do Drive/Planilha para habilitar o Anexo Rápido no card, ou digite o texto manualmente.</p>
                    <textarea 
                      placeholder="Cole um link https://docs.google.com/... ou descreva aqui os itens..."
                      rows={4}
                      className="w-full bg-slate-50 border border-slate-200 px-5 py-4 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all font-medium outline-none text-slate-700 resize-none custom-scrollbar"
                      value={formData.equipamentos}
                      onChange={e => setFormData({...formData, equipamentos: e.target.value})}
                    ></textarea>
                </div>

              </form>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/80 rounded-b-3xl flex justify-end gap-4">
              <button 
                type="button"
                className="px-6 py-4 font-bold text-slate-500 hover:bg-slate-200 hover:text-slate-700 bg-slate-100 border border-slate-200 rounded-xl transition-all"
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </button>
              <button 
                type="submit"
                form="rmaForm"
                className="px-8 py-4 font-black text-white bg-primary hover:bg-slate-800 rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-2 group"
              >
                {editingRma ? "Salvar Alterações" : "Criar RMA"}
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

           </div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
}
