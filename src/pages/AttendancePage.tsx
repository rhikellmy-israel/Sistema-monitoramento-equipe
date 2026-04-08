import React, { useMemo, useState } from "react";
import {
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  TrendingDown,
  Timer,
  AlertTriangle,
  FileX2,
  Plus,
  X,
  Edit2,
  Trash2
} from "lucide-react";
import { cn } from "../lib/utils";
import { useData } from "../context/DataContext";
import { AttendanceRecord } from "../types";

export default function AttendanceView() {
  const { attendanceData, setAttendanceData, auditors } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    DATA_REGISTRO: "",
    COLABORADOR: "",
    STATUS: "ATRASO",
    MINUTOS_ATRASO: "",
    DIAS_ATESTADO: 1,
    ENTRADA: "",
    ENTRADA_ALMOÇO: "",
    SAIDA_ALMOÇO: "",
    SAIDA: "",
    OBERVAÇÃO: ""
  });

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const clearForm = () => {
    setFormData({
      DATA_REGISTRO: "",
      COLABORADOR: "",
      STATUS: "ATRASO",
      MINUTOS_ATRASO: "",
      DIAS_ATESTADO: 1,
      ENTRADA: "",
      ENTRADA_ALMOÇO: "",
      SAIDA_ALMOÇO: "",
      SAIDA: "",
      OBERVAÇÃO: ""
    });
    setEditingIndex(null);
  };

  const handleEdit = (item: any, originalIndex: number) => {
      let dataRegistroStr = String(item.DATA_REGISTRO);
      if (typeof item.DATA_REGISTRO === 'number') {
          const d = new Date((item.DATA_REGISTRO - 25569) * 86400 * 1000);
          dataRegistroStr = d.toISOString().split('T')[0];
      } else if (dataRegistroStr.length > 10) {
          dataRegistroStr = dataRegistroStr.substring(0, 10);
      }

      setFormData({
          DATA_REGISTRO: dataRegistroStr,
          COLABORADOR: item.COLABORADOR,
          STATUS: item.STATUS,
          MINUTOS_ATRASO: item.MINUTOS_ATRASO?.toString() || "",
          DIAS_ATESTADO: item.DIAS_ATESTADO || 1,
          ENTRADA: item.ENTRADA || "",
          ENTRADA_ALMOÇO: item.ENTRADA_ALMOÇO || "",
          SAIDA_ALMOÇO: item.SAIDA_ALMOÇO || "",
          SAIDA: item.SAIDA || "",
          OBERVAÇÃO: item.OBERVAÇÃO || ""
      });
      setEditingIndex(originalIndex);
      setIsModalOpen(true);
  };

  const handleDelete = (originalIndex: number) => {
      if (window.confirm("Tem certeza que deseja apagar este registro de ponto?")) {
          const newData = [...attendanceData];
          newData.splice(originalIndex, 1);
          setAttendanceData(newData);
      }
  };

  const handleSave = () => {
    if (!formData.DATA_REGISTRO || !formData.COLABORADOR || !formData.STATUS) {
        alert("Preencha ao menos Data, Colaborador e Status.");
        return;
    }

    if (formData.STATUS === "ATRASO" && !formData.MINUTOS_ATRASO && !formData.ENTRADA) {
        alert("Preencha os minutos de atraso ou os horários de entrada e saída.");
        return;
    }

    const newRecord: AttendanceRecord = {
        DATA_REGISTRO: formData.DATA_REGISTRO,
        COLABORADOR: formData.COLABORADOR,
        STATUS: formData.STATUS,
        MINUTOS_ATRASO: formData.STATUS === "ATRASO" && formData.MINUTOS_ATRASO ? Number(formData.MINUTOS_ATRASO) : undefined,
        DIAS_ATESTADO: formData.STATUS === "ATESTADO" ? Number(formData.DIAS_ATESTADO) : undefined,
        ENTRADA: formData.ENTRADA,
        ENTRADA_ALMOÇO: formData.ENTRADA_ALMOÇO,
        SAIDA_ALMOÇO: formData.SAIDA_ALMOÇO,
        SAIDA: formData.SAIDA,
        OBERVAÇÃO: formData.OBERVAÇÃO
    };

    if (editingIndex !== null) {
        const newData = [...attendanceData];
        newData[editingIndex] = newRecord;
        setAttendanceData(newData);
    } else {
        setAttendanceData([...attendanceData, newRecord]);
    }
    clearForm();
    setIsModalOpen(false);
  };

  const stats = useMemo(() => {
    if (!attendanceData || attendanceData.length === 0) return null;

    let totalDelayMinutes = 0;
    let totalFaltas = 0;
    let totalJustificados = 0;

    const collabStats = new Map<string, { name: string, totalDelay: number, faltas: number, records: any[] }>();
    const enhancedRecords: any[] = [];

    attendanceData.forEach((r, originalIndex) => {
        const collabName = (r.COLABORADOR || "Desconhecido").toUpperCase();
        if (!collabStats.has(collabName)) {
            collabStats.set(collabName, { name: collabName, totalDelay: 0, faltas: 0, records: [] });
        }
        const collabStat = collabStats.get(collabName)!;

        // Verify status
        const status = (r.STATUS || "").toUpperCase();
        if (status === "FALTA") {
            collabStat.faltas += 1;
            totalFaltas += 1;
        }
        const isAtestadoOrDecl = status === "ATESTADO" || status === "DECLARAÇÃO";
        
        if (isAtestadoOrDecl) {
            totalJustificados += 1;
        }

        // Calculate Delay based on expected schema!
        let recordDelay = 0;
        const auditorConfig = auditors.find(a => a.name.toUpperCase() === collabName);
        
        if (status === "ATRASO" && r.MINUTOS_ATRASO) {
            recordDelay = r.MINUTOS_ATRASO;
        } else if (auditorConfig && !isAtestadoOrDecl && status !== "FALTA") {
            let escalaDia: any = auditorConfig.escala; // Fallback

            // 1. Parse REGISTRO date
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

            // 2. Discover target escala for this day
            if (auditorConfig.tipoEscala === "ALTERNADA" && auditorConfig.escalaAlternada) {
                const alt = auditorConfig.escalaAlternada;
                const refParts = alt.dataReferenciaSabadoTrabalhado.split("-");
                const refDate = new Date(parseInt(refParts[0]), parseInt(refParts[1])-1, parseInt(refParts[2]));
                
                const refWeekStart = new Date(refDate);
                refWeekStart.setDate(refDate.getDate() - refDate.getDay());
                
                const regWeekStart = new Date(regDate);
                regWeekStart.setDate(regDate.getDate() - regDate.getDay());
                
                // Diff in weeks
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
                    const parts = timeStr.split(":");
                    if (parts.length < 2) return null;
                    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
                };

                const escEntrada = parseTime(escalaDia.entrada);
                const recEntrada = parseTime(r.ENTRADA);
                if (recEntrada && escEntrada && recEntrada > escEntrada) {
                    recordDelay += (recEntrada - escEntrada);
                }

                const escVoltaAlmoco = parseTime(escalaDia.saidaAlmoco); // Volta do almoço
                const recVoltaAlmoco = parseTime(r.SAIDA_ALMOÇO);
                if (recVoltaAlmoco && escVoltaAlmoco && recVoltaAlmoco > escVoltaAlmoco) {
                    recordDelay += (recVoltaAlmoco - escVoltaAlmoco);
                }
            }
        }

        collabStat.totalDelay += recordDelay;
        totalDelayMinutes += recordDelay;

        collabStat.records.push({
            date: r.DATA_REGISTRO,
            status: status,
            delay: recordDelay,
            obs: r.OBERVAÇÃO || "S/ Info"
        });
        
        enhancedRecords.push({ ...r, originalIndex, computedDelay: recordDelay });
    });

    const rankingDecrescente = Array.from(collabStats.values())
        .sort((a, b) => {
            if (b.totalDelay !== a.totalDelay) return b.totalDelay - a.totalDelay;
            return b.faltas - a.faltas;
        });

    return { 
        totalDelayMinutes, 
        totalFaltas, 
        totalJustificados, 
        ranking: rankingDecrescente, 
        tableData: enhancedRecords.reverse().slice(0, 100) 
    };
  }, [attendanceData, auditors]);

  const formatMinutes = (m: number) => {
      if (m < 60) return `${m}m`;
      const h = Math.floor(m / 60);
      const min = m % 60;
      return `${h}h ${min}m`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-8">
        <div className="max-w-2xl">
          <h2 className="text-4xl font-extrabold text-primary font-headline tracking-tight mb-3">
            Atrasos de Ponto
          </h2>
          <p className="text-slate-500 text-lg leading-relaxed">
            Controle de pontualidade e jornada de trabalho.
          </p>
        </div>
        <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all uppercase tracking-widest text-sm"
        >
            <Plus className="w-5 h-5" /> NOVO REGISTRO
        </button>
      </div>

      {!stats ? (
          <div className="flex flex-col items-center justify-center p-20 text-center space-y-6">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200 shadow-inner">
               <FileX2 className="w-10 h-10 text-slate-300" />
            </div>
            <div className="max-w-md">
              <h2 className="text-2xl font-headline font-bold text-slate-700 mb-2">Base de Ponto Vazia</h2>
              <p className="text-slate-500 font-medium mb-6">Você não possui nenhum registro de ponto gravado no sistema.</p>
            </div>
          </div>
      ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-outline-variant/10 shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 w-2 bg-error"></div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Volumetria Negativa</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-error font-headline">{formatMinutes(stats.totalDelayMinutes)}</span>
                </div>
                <p className="text-xs font-bold text-slate-400 mt-2">Em minutos perdidos (Atrasos)</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-outline-variant/10 shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 w-2 bg-rose-500"></div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Faltas Computadas</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-rose-500 font-headline">{stats.totalFaltas}</span>
                </div>
                <p className="text-xs font-bold text-slate-400 mt-2">Ausências injustificadas totais</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-outline-variant/10 shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 w-2 bg-emerald-500"></div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Ocorrências Justificadas</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-emerald-500 font-headline">{stats.totalJustificados}</span>
                </div>
                <p className="text-xs font-bold text-slate-400 mt-2">Declarações e Atestados</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-outline-variant/10 shadow-sm relative overflow-hidden flex flex-col justify-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Colaborador mais atrasado</p>
                {stats.ranking[0] ? (
                    <>
                        <span className="text-xl font-black text-slate-800 font-headline uppercase truncate">{stats.ranking[0].name}</span>
                        <p className="text-xs font-bold text-error mt-1">{formatMinutes(stats.ranking[0].totalDelay)} em Atrasos / {stats.ranking[0].faltas} Faltas</p>
                    </>
                ) : (
                    <span className="text-sm font-bold text-slate-800">Nenhum dado</span>
                )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/10 flex flex-col overflow-hidden h-full">
                        <div className="p-6 pb-2">
                            <h3 className="text-base font-bold text-error font-headline flex items-center gap-2 mb-6 uppercase">
                                <AlertCircle className="w-5 h-5 text-error" /> Top Infratores de Ponto
                            </h3>
                            <div className="space-y-4 pr-2">
                                {stats.ranking.slice(0, 8).map((collab, i) => {
                                    const isWorst = i === 0;
                                    return (
                                        <div key={i} className="flex justify-between items-center p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-black", isWorst ? "bg-error text-white" : "bg-slate-100 text-slate-600")}>
                                                    #{i+1}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold uppercase text-slate-700">{collab.name}</p>
                                                    <p className="text-[10px] font-bold text-error">{formatMinutes(collab.totalDelay)} Atraso | {collab.faltas} Faltas</p>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-8">
                    <div className="bg-white rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden h-full flex flex-col">
                        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-surface-container-lowest">
                        <h3 className="text-lg font-bold text-primary font-headline flex items-center gap-2">
                            <Timer className="w-5 h-5" /> Pendência de Ponto
                        </h3>
                        </div>
                        <div className="flex-1 overflow-x-auto text-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap">Data</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap">Colaborador</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap">Status</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap">Detalhes / Tempo</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap">Observação</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap text-right">Ações</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                            {stats.tableData.map((item, i) => {
                                const isFalta = item.STATUS?.toUpperCase() === 'FALTA';
                                const isAtraso = item.STATUS?.toUpperCase() === 'ATRASO';
                                let dataStr = String(item.DATA_REGISTRO);
                                if (typeof item.DATA_REGISTRO === 'number') {
                                    const d = new Date((item.DATA_REGISTRO - 25569) * 86400 * 1000);
                                    dataStr = d.toLocaleDateString('pt-BR');
                                } else if (dataStr.length > 10) dataStr = dataStr.substring(0, 10);

                                return (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 text-xs font-bold text-slate-500">{dataStr}</td>
                                    <td className="px-6 py-4 text-xs font-black uppercase text-slate-700">{item.COLABORADOR}</td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight",
                                            isFalta ? "bg-rose-100 text-rose-600" : isAtraso ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                                        )}>
                                        {isFalta || isAtraso ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                                        {item.STATUS}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-bold text-slate-600">
                                        {isAtraso ? formatMinutes(item.computedDelay || 0) : 
                                         item.STATUS?.toUpperCase() === 'ATESTADO' && item.DIAS_ATESTADO ? `${item.DIAS_ATESTADO} dia(s)` :
                                         (item.ENTRADA || item.SAIDA) ? `${item.ENTRADA || "--"} às ${item.SAIDA || "--"}` : "--"}
                                    </td>
                                    <td className="px-6 py-4 text-[11px] font-bold text-slate-500 italic max-w-[200px] truncate">
                                        {item.OBERVAÇÃO || "S/ Info"}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => handleEdit(item, item.originalIndex)}
                                                className="w-7 h-7 rounded bg-slate-100 text-slate-500 hover:bg-primary hover:text-white flex items-center justify-center transition-colors"
                                                title="Editar Registro"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(item.originalIndex)}
                                                className="w-7 h-7 rounded bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-colors"
                                                title="Apagar Registro"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                        </div>
                    </div>
                </div>
            </div>
          </>
      )}

      {/* Modal / Formulario */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="text-xl font-black font-headline text-slate-800 uppercase flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        {editingIndex !== null ? "Editar Registro" : "Adicionar Registro de Ponto"}
                        </h3>
                    </div>
                    <button 
                        onClick={() => setIsModalOpen(false)} 
                        className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-slate-50/30">
                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Data do Registro *</label>
                            <input 
                                type="date" 
                                value={formData.DATA_REGISTRO} 
                                onChange={(e) => handleInputChange("DATA_REGISTRO", e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary shadow-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Colaborador (Auditor) *</label>
                            <select 
                                value={formData.COLABORADOR}
                                onChange={(e) => handleInputChange("COLABORADOR", e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary shadow-sm uppercase font-semibold"
                            >
                                <option value="">Selecione...</option>
                                {auditors.map(a => (
                                    <option key={a.id} value={a.name.toUpperCase()}>{a.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Status da Ocorrência *</label>
                        <select 
                            value={formData.STATUS}
                            onChange={(e) => handleInputChange("STATUS", e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary shadow-sm font-bold text-slate-700"
                        >
                            <option value="ATRASO">Atraso</option>
                            <option value="FALTA">Falta</option>
                            <option value="ATESTADO">Atestado</option>
                            <option value="DECLARAÇÃO">Declaração</option>
                        </select>
                    </div>

                    {formData.STATUS === "ATRASO" && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Entrada</label>
                                    <input 
                                        type="time" 
                                        value={formData.ENTRADA} 
                                        onChange={(e) => handleInputChange("ENTRADA", e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary shadow-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Almoço (Ida)</label>
                                    <input 
                                        type="time" 
                                        value={formData.ENTRADA_ALMOÇO} 
                                        onChange={(e) => handleInputChange("ENTRADA_ALMOÇO", e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary shadow-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Almoço (Volta)</label>
                                    <input 
                                        type="time" 
                                        value={formData.SAIDA_ALMOÇO} 
                                        onChange={(e) => handleInputChange("SAIDA_ALMOÇO", e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary shadow-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Saída</label>
                                    <input 
                                        type="time" 
                                        value={formData.SAIDA} 
                                        onChange={(e) => handleInputChange("SAIDA", e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary shadow-sm"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="h-[1px] flex-1 bg-slate-200"></div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">OU CALCULAR MINUTOS MANUALMENTE</span>
                                <div className="h-[1px] flex-1 bg-slate-200"></div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Minutos Lançados *</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    value={formData.MINUTOS_ATRASO} 
                                    onChange={(e) => handleInputChange("MINUTOS_ATRASO", e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary shadow-sm"
                                    placeholder="Ex: 15"
                                />
                            </div>
                        </div>
                    )}

                    {formData.STATUS === "ATESTADO" && (
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Dias de Atestado *</label>
                            <input 
                                type="number" 
                                min="1"
                                value={formData.DIAS_ATESTADO} 
                                onChange={(e) => handleInputChange("DIAS_ATESTADO", e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary shadow-sm"
                            />
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Observação / Justificativa</label>
                        <input 
                            type="text" 
                            placeholder="Ex: Doente, Sem Justificativa, OK"
                            value={formData.OBERVAÇÃO} 
                            onChange={(e) => handleInputChange("OBERVAÇÃO", e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary shadow-sm"
                        />
                    </div>
                </div>
                
                <div className="p-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                    <button 
                        onClick={clearForm}
                        className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-widest"
                    >
                        Limpar Formulário
                    </button>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsModalOpen(false)}
                            className="px-6 py-2 border border-slate-200 bg-white rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors uppercase tracking-widest"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleSave}
                            className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-md hover:bg-primary/90 transition-all uppercase tracking-widest"
                        >
                            Salvar Registro
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}
