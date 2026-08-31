import React, { useMemo, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useData } from "../context/DataContext";
import { motion } from "motion/react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LabelList, Cell, AreaChart, Area, Legend } from "recharts";
import { Box, CheckCircle, TrendingUp, Calendar, ArrowRightLeft, Activity, Filter, BarChart2, List, MonitorCheck, Trash2, Inbox, Wrench, ShieldAlert, Download, Loader2, Zap, X, Sparkles, Camera } from "lucide-react";
import { cn } from "../lib/utils";
import DateFilter from "../components/DateFilter";
import { DateFilterMode, isDateMatch, normalizeDateToISO, formatToBR } from "../lib/dateUtils";
import AnimatedCounter from "../components/AnimatedCounter";
import ReportVisaoGeral from "../components/reports/ReportVisaoGeral";
import ReportAssistenciaAvarias from "../components/reports/ReportAssistenciaAvarias";
import ReportFontesModelos, { ModelStatItem } from "../components/reports/ReportFontesModelos";
import { exportNodeToPng, getFilterPeriodLabel, getReportFilename } from "../lib/exportReportPng";
import { FONT_MODELS, FONTE_DISCARD_REASONS, FonteDiscardReason } from "../types";

export default function FechamentoPage() {
  const { fechamentoData, productionEntries, entradasSetorData, saidasSetorData } = useData();
  const [filterMode, setFilterMode] = useState<DateFilterMode>("Todas");
  const [filterValue, setFilterValue] = useState("");
  const [filterEquipamento, setFilterEquipamento] = useState("");
  const [viewMode, setViewMode] = useState<"grafico" | "lista">("grafico");
  const [activeSubTab, setActiveSubTab] = useState<"geral" | "avarias">("geral");
  const [isGeneratingGeral, setIsGeneratingGeral] = useState(false);
  const [isGeneratingAvarias, setIsGeneratingAvarias] = useState(false);
  const [isGeneratingFontes, setIsGeneratingFontes] = useState(false);
  const reportGeralRef = useRef<HTMLDivElement>(null);
  const reportAvariasRef = useRef<HTMLDivElement>(null);
  const reportFontesRef = useRef<HTMLDivElement>(null);
  const [showReportGeral, setShowReportGeral] = useState(false);
  const [showReportAvarias, setShowReportAvarias] = useState(false);
  const [showReportFontes, setShowReportFontes] = useState(false);

  // Estados dos Recursos de Fontes por Modelo
  const [rightSideView, setRightSideView] = useState<"fontesModelos" | "fluxoEntradas">("fontesModelos");
  const [fontModalCategory, setFontModalCategory] = useState<"testadas" | "aprovadas" | "descartadas" | null>(null);


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
        base = base.filter(d => {
           const isoDate = normalizeDateToISO(d.date) || normalizeDateToISO((d as any).created_at) || normalizeDateToISO((d as any).data) || "";
           return isDateMatch(isoDate, filterMode, filterValue);
        });
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

      // Acumular fontes aprovadas e descartadas
      let totalFontesAprovadas = 0;
      let totalFontesDescartadas = 0;
      filteredProduction.forEach(e => {
         totalFontesAprovadas += Number(e.fontes_aprovadas) || 0;
         totalFontesDescartadas += Number(e.fontes_descarte) || 0;
      });
      const totalFontesTestadas = totalFontesAprovadas + totalFontesDescartadas;

      return { total, comodato, taxa, totalFontesTestadas, totalFontesAprovadas, totalFontesDescartadas };
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

  // Estatísticas de Fontes por Modelo (Incluindo Motivos de Descarte e Fontes Aleatórias)
  const fontesModelosStats = useMemo(() => {
    const statsByModel: Record<string, ModelStatItem> = {};

    // 1. Inicializa todos os modelos pré-definidos
    FONT_MODELS.forEach(m => {
      statsByModel[m] = {
        model: m,
        isCustom: false,
        aprovadas: 0,
        descartadas: 0,
        testadas: 0,
        motivos: {
          "SUJA": 0,
          "MUITA TINTA": 0,
          "QUEIMADA": 0,
          "DESCASCADA": 0,
          "AVARIAS": 0,
        },
      };
    });

    // 2. Acumula os dados dos registros de produção filtrados
    filteredProduction.forEach(entry => {
      let modelos = entry.fontes_modelos;
      if (typeof modelos === 'string') {
        try { modelos = JSON.parse(modelos); } catch (err) {}
      }

      if (modelos && typeof modelos === 'object') {
        Object.entries(modelos).forEach(([modelName, vals]: [string, any]) => {
          const cleanModel = modelName.trim().toUpperCase().replace(/\s+/g, ' ');
          const isStandard = FONT_MODELS.some(m => m.toUpperCase().replace(/\s+/g, ' ') === cleanModel);
          const canon = isStandard
            ? (FONT_MODELS.find(m => m.toUpperCase().replace(/\s+/g, ' ') === cleanModel) || modelName)
            : (vals?.customName || modelName);

          if (!statsByModel[canon]) {
            statsByModel[canon] = {
              model: canon,
              isCustom: !isStandard,
              customName: vals?.customName || modelName,
              aprovadas: 0,
              descartadas: 0,
              testadas: 0,
              motivos: {
                "SUJA": 0,
                "MUITA TINTA": 0,
                "QUEIMADA": 0,
                "DESCASCADA": 0,
                "AVARIAS": 0,
              },
            };
          }

          const apr = Number(vals?.aprovadas) || 0;
          const desc = Number(vals?.descartadas) || 0;
          statsByModel[canon].aprovadas += apr;
          statsByModel[canon].descartadas += desc;
          statsByModel[canon].testadas += (apr + desc);

          // Acumular motivos
          if (vals?.motivos && typeof vals.motivos === 'object') {
            FONTE_DISCARD_REASONS.forEach(reason => {
              const rQty = Number(vals.motivos[reason]) || 0;
              statsByModel[canon].motivos[reason] = (statsByModel[canon].motivos[reason] || 0) + rQty;
            });
          }
        });
      }
    });

    // 3. Totais globais
    let totalAprovadas = 0;
    let totalDescartadas = 0;
    const totalPorMotivo: Record<FonteDiscardReason, number> = {
      "SUJA": 0,
      "MUITA TINTA": 0,
      "QUEIMADA": 0,
      "DESCASCADA": 0,
      "AVARIAS": 0,
    };

    Object.values(statsByModel).forEach(v => {
      totalAprovadas += v.aprovadas;
      totalDescartadas += v.descartadas;
      FONTE_DISCARD_REASONS.forEach(r => {
        totalPorMotivo[r] += (v.motivos[r] || 0);
      });
    });

    const totalTestadas = totalAprovadas + totalDescartadas;
    const taxaDescarte = totalTestadas > 0 ? (totalDescartadas / totalTestadas) * 100 : 0;

    // Lista ordenada de modelos (padrão primeiro, customizados depois)
    const modelStatsList = Object.values(statsByModel).filter(item => !item.isCustom || item.testadas > 0);

    const totals = {
      totalTestadas,
      totalAprovadas,
      totalDescartadas,
      taxaDescarte,
      totalPorMotivo,
    };

    return { statsByModel, modelStatsList, totals, totalAprovadas, totalDescartadas, totalTestadas, taxaDescarte };
  }, [filteredProduction]);

  const periodoLabel = useMemo(() => getFilterPeriodLabel(filterMode, filterValue), [filterMode, filterValue]);
  const dataGeracao = useMemo(() => {
     const now = new Date();
     const dd = String(now.getDate()).padStart(2, '0');
     const mm = String(now.getMonth() + 1).padStart(2, '0');
     const yyyy = now.getFullYear();
     const hh = String(now.getHours()).padStart(2, '0');
     const min = String(now.getMinutes()).padStart(2, '0');
     return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  }, []);

  const handleGenerateReportGeral = useCallback(async () => {
     setIsGeneratingGeral(true);
     setShowReportGeral(true);
     // Wait for React to render the off-screen report
     await new Promise(r => setTimeout(r, 500));
     try {
        if (reportGeralRef.current) {
           const filename = getReportFilename('VisaoGeral', filterMode, filterValue);
           await exportNodeToPng(reportGeralRef.current, filename);
        }
     } catch (err) {
        console.error('Erro ao gerar relatório Visão Geral:', err);
        alert('Erro ao gerar o relatório. Tente novamente.');
     } finally {
        setShowReportGeral(false);
        setIsGeneratingGeral(false);
     }
  }, [filterMode, filterValue]);

  const handleGenerateReportAvarias = useCallback(async () => {
     setIsGeneratingAvarias(true);
     setShowReportAvarias(true);
     await new Promise(r => setTimeout(r, 500));
     try {
        if (reportAvariasRef.current) {
           const filename = getReportFilename('AssistenciaAvarias', filterMode, filterValue);
           await exportNodeToPng(reportAvariasRef.current, filename);
        }
     } catch (err) {
        console.error('Erro ao gerar relatório Assistência & Avarias:', err);
        alert('Erro ao gerar o relatório. Tente novamente.');
     } finally {
        setShowReportAvarias(false);
        setIsGeneratingAvarias(false);
     }
  }, [filterMode, filterValue]);

  const handleGenerateReportFontes = useCallback(async () => {
     setIsGeneratingFontes(true);
     setShowReportFontes(true);
     await new Promise(r => setTimeout(r, 500));
     try {
        if (reportFontesRef.current) {
           const filename = getReportFilename('FontesModelos', filterMode, filterValue);
           await exportNodeToPng(reportFontesRef.current, filename);
        }
     } catch (err) {
        console.error('Erro ao gerar relatório Fontes por Modelo:', err);
        alert('Erro ao gerar o relatório. Tente novamente.');
     } finally {
        setShowReportFontes(false);
        setIsGeneratingFontes(false);
     }
  }, [filterMode, filterValue]);

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
          {/* Report Generation Button - Visão Geral */}
          <div className="flex justify-end">
            <button
              onClick={handleGenerateReportGeral}
              disabled={isGeneratingGeral}
              className={cn(
                "flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-sm cursor-pointer",
                isGeneratingGeral
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98]"
              )}
            >
              {isGeneratingGeral ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Gerando Relatório...</>
              ) : (
                <><Download className="w-4 h-4" /> Gerar Relatório</>
              )}
            </button>
          </div>

          {/* KPIs Cards — 6 Cards in a Single Row on XL screens */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
            {/* Total Movimentado */}
            <motion.div initial={{ y:-10, opacity:0 }} animate={{ y:0, opacity:1 }} transition={{ delay:0.05 }} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:border-indigo-200 hover:shadow-indigo-500/10 transition-all flex flex-col justify-between">
              <div className="absolute bottom-0 right-0 p-2 opacity-5 group-hover:opacity-10 group-hover:text-indigo-500 transition-all translate-x-1 translate-y-1 pointer-events-none">
                 <ArrowRightLeft className="w-16 h-16" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center text-indigo-600 transition-colors shadow-inner shrink-0">
                     <Box className="w-4.5 h-4.5" />
                  </div>
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider leading-tight">Total Movim.</h3>
                </div>
                <div className="flex items-baseline justify-between gap-1 flex-wrap">
                  <div className="text-2xl xl:text-3xl font-black text-slate-800 font-headline tracking-tighter">
                    <AnimatedCounter value={kpis.total} />
                  </div>
                  {avariasKpis.totalEntradas > 0 && (
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 font-headline shrink-0" title={`${kpis.total} movimentados de ${avariasKpis.totalEntradas} entradas`}>
                      {avariasKpis.movimentado.pct.toFixed(0)}% ent.
                    </span>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-medium mt-2">Laboratório</p>
            </motion.div>

            {/* Aprovados (Comodato) */}
            <motion.div initial={{ y:-10, opacity:0 }} animate={{ y:0, opacity:1 }} transition={{ delay:0.1 }} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:border-emerald-200 hover:shadow-emerald-500/10 transition-all flex flex-col justify-between">
              <div className="absolute bottom-0 right-0 p-2 opacity-5 group-hover:opacity-10 group-hover:text-emerald-500 transition-all translate-x-1 translate-y-1 pointer-events-none">
                 <CheckCircle className="w-16 h-16" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center text-emerald-600 transition-colors shadow-inner shrink-0">
                     <CheckCircle className="w-4.5 h-4.5" />
                  </div>
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider leading-tight">Comodato</h3>
                </div>
                <div className="text-2xl xl:text-3xl font-black text-slate-800 font-headline tracking-tighter">
                  <AnimatedCounter value={kpis.comodato} />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-medium mt-2">Aprovados</p>
            </motion.div>

            {/* Taxa de Conversão */}
            <motion.div initial={{ y:-10, opacity:0 }} animate={{ y:0, opacity:1 }} transition={{ delay:0.15 }} className="bg-gradient-to-br from-[#0f172a] to-indigo-950 p-5 rounded-2xl shadow-md relative overflow-hidden group text-white border border-indigo-500/20 flex flex-col justify-between">
              <div className="absolute bottom-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity translate-x-1 translate-y-1 pointer-events-none">
                 <TrendingUp className="w-16 h-16" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400 backdrop-blur-md border border-white/10 shadow-inner shrink-0">
                     <Activity className="w-4.5 h-4.5" />
                  </div>
                  <h3 className="text-[11px] font-bold text-indigo-100 uppercase tracking-wider leading-tight">Conversão</h3>
                </div>
                <div className="text-2xl xl:text-3xl font-black font-headline tracking-tighter text-emerald-400 drop-shadow-sm">
                  <AnimatedCounter value={kpis.taxa} formatter={(v) => v.toFixed(1) + "%"} />
                </div>
              </div>
              <p className="relative z-10 text-[10px] text-indigo-200 font-medium mt-2">Taxa aprov.</p>
            </motion.div>

            {/* Fontes Testadas — Clickable */}
            <motion.div initial={{ y:-10, opacity:0 }} animate={{ y:0, opacity:1 }} transition={{ delay:0.2 }}
              onClick={() => setFontModalCategory("testadas")}
              className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:border-violet-200 hover:shadow-violet-500/10 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="absolute bottom-0 right-0 p-2 opacity-5 group-hover:opacity-15 group-hover:text-violet-500 transition-all translate-x-1 translate-y-1 pointer-events-none">
                 <Zap className="w-16 h-16" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-50 group-hover:bg-violet-100 flex items-center justify-center text-violet-600 transition-colors shadow-inner shrink-0">
                     <Zap className="w-4.5 h-4.5" />
                  </div>
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider leading-tight">Fontes Test.</h3>
                </div>
                <div className="text-2xl xl:text-3xl font-black text-slate-800 font-headline tracking-tighter">
                  <AnimatedCounter value={kpis.totalFontesTestadas} />
                </div>
              </div>
              <p className="text-[9px] text-violet-500 font-bold mt-2 uppercase tracking-wider flex items-center gap-1">Ver modelos &rarr;</p>
            </motion.div>

            {/* Fontes Aprovadas — Clickable */}
            <motion.div initial={{ y:-10, opacity:0 }} animate={{ y:0, opacity:1 }} transition={{ delay:0.25 }}
              onClick={() => setFontModalCategory("aprovadas")}
              className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:border-emerald-200 hover:shadow-emerald-500/10 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="absolute bottom-0 right-0 p-2 opacity-5 group-hover:opacity-15 group-hover:text-emerald-500 transition-all translate-x-1 translate-y-1 pointer-events-none">
                 <Sparkles className="w-16 h-16" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center text-emerald-600 transition-colors shadow-inner shrink-0">
                     <Sparkles className="w-4.5 h-4.5" />
                  </div>
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider leading-tight">Fontes Aprov.</h3>
                </div>
                <div className="text-2xl xl:text-3xl font-black text-slate-800 font-headline tracking-tighter">
                  <AnimatedCounter value={kpis.totalFontesAprovadas} />
                </div>
              </div>
              <p className="text-[9px] text-emerald-600 font-bold mt-2 uppercase tracking-wider flex items-center gap-1">Ver modelos &rarr;</p>
            </motion.div>

            {/* Fontes Descartadas — Clickable */}
            <motion.div initial={{ y:-10, opacity:0 }} animate={{ y:0, opacity:1 }} transition={{ delay:0.3 }}
              onClick={() => setFontModalCategory("descartadas")}
              className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:border-rose-200 hover:shadow-rose-500/10 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="absolute bottom-0 right-0 p-2 opacity-5 group-hover:opacity-15 group-hover:text-rose-500 transition-all translate-x-1 translate-y-1 pointer-events-none">
                 <Trash2 className="w-16 h-16" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 group-hover:bg-rose-100 flex items-center justify-center text-rose-600 transition-colors shadow-inner shrink-0">
                     <Trash2 className="w-4.5 h-4.5" />
                  </div>
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider leading-tight">Fontes Desc.</h3>
                </div>
                <div className="text-2xl xl:text-3xl font-black text-slate-800 font-headline tracking-tighter">
                  <AnimatedCounter value={kpis.totalFontesDescartadas} />
                </div>
              </div>
              <p className="text-[9px] text-rose-500 font-bold mt-2 uppercase tracking-wider flex items-center gap-1">Ver modelos &rarr;</p>
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

            {/* Right Side: Toggle between Fontes por Modelo and Fluxo de Entradas */}
            <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col min-h-[600px] lg:h-auto overflow-hidden">
               <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                 <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                   <div>
                     <h3 className="text-xl font-bold text-slate-800 font-headline">
                       {rightSideView === "fontesModelos" ? "Fontes por Modelo" : "Fluxo de Entradas Confirmadas"}
                     </h3>
                     <p className="text-xs text-slate-400 font-medium">
                       {rightSideView === "fontesModelos" ? "Detalhamento e motivos de descarte" : "Movimentações confirmadas no setor"}
                     </p>
                   </div>
                   <div className="flex items-center gap-2">
                     <div className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-xs uppercase tracking-wider">
                       {rightSideView === "fontesModelos" ? `${fontesModelosStats.totals.totalTestadas} Fontes` : `${filteredData.length} Registros`}
                     </div>
                     {rightSideView === "fontesModelos" && (
                       <button
                         onClick={handleGenerateReportFontes}
                         disabled={isGeneratingFontes}
                         className={cn(
                           "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black transition-all shadow-xs cursor-pointer",
                           isGeneratingFontes
                             ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                             : "bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 hover:from-indigo-700 hover:to-violet-700 text-white shadow-indigo-500/20 active:scale-95"
                         )}
                         title="Exportar relatório consolidado de fontes em PNG"
                       >
                         {isGeneratingFontes ? (
                           <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando...</>
                         ) : (
                           <><Camera className="w-3.5 h-3.5" /> GERAR PNG</>
                         )}
                       </button>
                     )}
                   </div>
                 </div>
                 {/* Toggle Switcher */}
                 <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                   <button
                     onClick={() => setRightSideView("fontesModelos")}
                     className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all flex-1 justify-center cursor-pointer", rightSideView === "fontesModelos" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                   >
                     <Zap className="w-4 h-4" /> Fontes por Modelo
                   </button>
                   <button
                     onClick={() => setRightSideView("fluxoEntradas")}
                     className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all flex-1 justify-center cursor-pointer", rightSideView === "fluxoEntradas" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                   >
                     <List className="w-4 h-4" /> Fluxo de Entradas
                   </button>
                 </div>
               </div>

               <div className="flex-1 p-6 space-y-4 overflow-y-auto custom-scrollbar max-h-[650px]">
                 {rightSideView === "fontesModelos" ? (
                   /* Fontes por Modelo View */
                   fontesModelosStats.modelStatsList.length > 0 ? (
                     <div className="space-y-3">
                       {fontesModelosStats.modelStatsList.map((item, idx) => {
                         const maxTestadas = Math.max(...fontesModelosStats.modelStatsList.map(m => m.testadas), 1);
                         const motivosEntries = Object.entries(item.motivos).filter(([_, qty]) => Number(qty) > 0);

                         return (
                           <motion.div
                             initial={{ opacity: 0, x: -20 }}
                             animate={{ opacity: 1, x: 0 }}
                             transition={{ delay: idx * 0.03 }}
                             key={item.model + idx}
                             className="relative p-4 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden group hover:bg-violet-50/50 hover:border-violet-300 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/10"
                           >
                             <div className="absolute top-0 left-0 h-full bg-violet-100/40 group-hover:bg-violet-200/50 transition-all duration-1000" style={{ width: `${(item.testadas / maxTestadas) * 100}%` }} />
                             
                             <div className="relative">
                               <div className="flex justify-between items-center gap-4">
                                 <div className="flex items-center gap-2 min-w-0">
                                   <span className="text-sm font-bold text-slate-700 truncate group-hover:text-violet-900 transition-colors" title={item.customName || item.model}>
                                     {item.customName || item.model}
                                   </span>
                                   {item.isCustom && (
                                     <span className="text-[9px] font-extrabold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200 shrink-0 uppercase">
                                       Aleatória
                                     </span>
                                   )}
                                 </div>
                                 <div className="flex items-center gap-2 shrink-0">
                                   <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                                     {item.aprovadas} apr
                                   </span>
                                   <span className="text-[10px] font-black text-rose-700 bg-rose-50 px-2 py-1 rounded-md border border-rose-100">
                                     {item.descartadas} desc
                                   </span>
                                   <span className="text-xs font-black text-indigo-700 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-indigo-100">
                                     {item.testadas}
                                   </span>
                                 </div>
                               </div>

                               {/* Detalhamento dos Motivos de Descarte */}
                               {motivosEntries.length > 0 && (
                                 <div className="mt-2 pt-2 border-t border-slate-200/60 flex flex-wrap items-center gap-1.5">
                                   <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mr-1">
                                     Motivos:
                                   </span>
                                   {motivosEntries.map(([reasonKey, reasonQty]) => (
                                     <span
                                       key={reasonKey}
                                       className="text-[9px] font-bold bg-rose-50/80 text-rose-700 border border-rose-200/80 px-2 py-0.5 rounded-md"
                                     >
                                       {reasonKey}: {reasonQty}
                                     </span>
                                   ))}
                                 </div>
                               )}
                             </div>
                           </motion.div>
                         );
                       })}
                     </div>
                   ) : (
                     <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50 pt-10">
                       <Zap className="w-12 h-12 mb-3" />
                       <span className="text-sm font-bold">Nenhum dado de fontes</span>
                     </div>
                   )
                 ) : (
                   /* Fluxo de Entradas View (original) */
                   dailyData.length === 0 ? (
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
                   )
                 )}
               </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Report Generation Button - Assistência & Avarias */}
          <div className="flex justify-end">
            <button
              onClick={handleGenerateReportAvarias}
              disabled={isGeneratingAvarias}
              className={cn(
                "flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-sm cursor-pointer",
                isGeneratingAvarias
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98]"
              )}
            >
              {isGeneratingAvarias ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Gerando Relatório...</>
              ) : (
                <><Download className="w-4 h-4" /> Gerar Relatório</>
              )}
            </button>
          </div>

          {/* Assistência & Avarias sub-tab view */}
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

      {/* Off-screen report containers for PNG generation */}
      {showReportGeral && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1 }}>
          <ReportVisaoGeral
            ref={reportGeralRef}
            kpis={kpis}
            top5Equipamentos={equipamentosPorModelo.slice(0, 5)}
            periodoLabel={periodoLabel}
            dataGeracao={dataGeracao}
          />
        </div>
      )}

      {showReportAvarias && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1 }}>
          <ReportAssistenciaAvarias
            ref={reportAvariasRef}
            avariasKpis={avariasKpis}
            periodoLabel={periodoLabel}
            dataGeracao={dataGeracao}
          />
        </div>
      )}

      {showReportFontes && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1 }}>
          <ReportFontesModelos
            ref={reportFontesRef}
            modelStats={fontesModelosStats.modelStatsList}
            totals={fontesModelosStats.totals}
            periodoLabel={periodoLabel}
            dataGeracao={dataGeracao}
          />
        </div>
      )}

      {/* Modal Interativo de Detalhamento por Modelo ao clicar nos Cards (Renderizado via Portal para centralização absoluta na viewport) */}
      {fontModalCategory && typeof document !== "undefined" && createPortal(
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[99999] animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setFontModalCategory(null); }}
        >
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-xl w-full overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black font-headline tracking-tight">
                  Detalhamento por Modelo — {
                    fontModalCategory === "testadas" ? "Fontes Testadas" :
                    fontModalCategory === "aprovadas" ? "Fontes Aprovadas" : "Fontes Descartadas"
                  }
                </h3>
                <p className="text-indigo-200 text-xs font-medium mt-0.5">
                  Período: {periodoLabel}
                </p>
              </div>
              <button
                onClick={() => setFontModalCategory(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-extrabold text-[10px] uppercase tracking-widest">
                    <th className="pb-3">Modelo</th>
                    {fontModalCategory === "descartadas" && <th className="pb-3 text-center">Motivos</th>}
                    <th className="pb-3 text-right">Quantidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fontesModelosStats.modelStatsList.map((item) => {
                    const qty = fontModalCategory === "testadas" ? item.testadas :
                                fontModalCategory === "aprovadas" ? item.aprovadas : item.descartadas;
                    const motivosEntries = Object.entries(item.motivos).filter(([_, q]) => Number(q) > 0);

                    return (
                      <tr key={item.model} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 font-bold text-slate-800">
                          <div className="flex items-center gap-2">
                            <span>{item.customName || item.model}</span>
                            {item.isCustom && (
                              <span className="text-[8px] font-extrabold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200 uppercase">
                                Aleatória
                              </span>
                            )}
                          </div>
                        </td>
                        {fontModalCategory === "descartadas" && (
                          <td className="py-3 text-center">
                            {motivosEntries.length > 0 ? (
                              <div className="flex flex-wrap gap-1 justify-center">
                                {motivosEntries.map(([reasonKey, reasonQty]) => (
                                  <span key={reasonKey} className="text-[8px] font-bold bg-rose-50 text-rose-600 border border-rose-100 px-1.5 py-0.2 rounded">
                                    {reasonKey}: {reasonQty}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-300">-</span>
                            )}
                          </td>
                        )}
                        <td className="py-3 font-black text-right font-headline text-base text-indigo-600">
                          {qty.toLocaleString("pt-BR")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50/70 font-headline">
                    <td className="py-3 font-black text-slate-900 uppercase tracking-wider text-xs" colSpan={fontModalCategory === "descartadas" ? 2 : 1}>
                      Total Geral
                    </td>
                    <td className="py-3 font-black text-right text-lg text-indigo-700">
                      {
                        (fontModalCategory === "testadas" ? fontesModelosStats.totals.totalTestadas :
                        fontModalCategory === "aprovadas" ? fontesModelosStats.totals.totalAprovadas : fontesModelosStats.totals.totalDescartadas).toLocaleString("pt-BR")
                      }
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setFontModalCategory(null)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
