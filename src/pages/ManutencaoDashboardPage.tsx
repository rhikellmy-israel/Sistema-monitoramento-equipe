import React, { useMemo, useState } from "react";
import {
  BarChart3,
  Wrench,
  ArrowUpDown,
  Trophy,
  TrendingUp,
  Users
} from "lucide-react";
import { motion } from "motion/react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useData } from "../context/DataContext";
import DateFilter from "../components/DateFilter";
import { DateFilterMode, isDateMatch, normalizeDateToISO } from "../lib/dateUtils";

const CHART_COLORS = [
  "#6366f1", "#8b5cf6", "#06b6d4", "#14b8a6", "#f59e0b",
  "#ec4899", "#10b981", "#3b82f6", "#ef4444", "#84cc16"
];

export default function ManutencaoDashboardPage() {
  const { productionEntries } = useData();

  const [filterMode, setFilterMode] = useState<DateFilterMode>("Mes");
  const [filterValue, setFilterValue] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const filtered = useMemo(() => {
    return productionEntries.filter(e => {
      const iso = normalizeDateToISO(e.date);
      return isDateMatch(iso || "", filterMode, filterValue);
    });
  }, [productionEntries, filterMode, filterValue]);

  // Aggregate by user
  const ranking = useMemo(() => {
    const map = new Map<string, { equip: number; escada: number }>();
    filtered.forEach(e => {
      const name = (e.user_name || "").toUpperCase().trim();
      if (!map.has(name)) map.set(name, { equip: 0, escada: 0 });
      const stat = map.get(name)!;
      stat.equip += Number(e.manutencao_equipamento) || 0;
      stat.escada += Number(e.manutencao_escada) || 0;
    });

    return Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        equip: data.equip,
        escada: data.escada,
        total: data.equip + data.escada,
        points: (data.equip * 3) + (data.escada * 10),
      }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  // KPIs
  const totalEquip = ranking.reduce((a, r) => a + r.equip, 0);
  const totalEscada = ranking.reduce((a, r) => a + r.escada, 0);
  const totalPoints = ranking.reduce((a, r) => a + r.points, 0);

  // Chart data (top 10)
  const chartData = ranking.slice(0, 10).map(r => ({
    name: r.name.length > 12 ? r.name.substring(0, 12) + "…" : r.name,
    total: r.total,
    points: r.points,
  }));

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-12">
      {/* HEADER */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-cyan-900 via-blue-800 to-indigo-500 font-headline tracking-tighter leading-none">
                Dashboard de Manutenções
              </h1>
              <p className="text-slate-500 text-sm font-medium mt-1">
                Ranking de manutenções realizadas pelos estagiários
              </p>
            </div>
          </div>
        </div>
        <DateFilter
          mode={filterMode}
          value={filterValue}
          onChange={(m, v) => { setFilterMode(m); setFilterValue(v); }}
          className="bg-white/80 backdrop-blur"
        />
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group overflow-hidden relative"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-blue-500" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
              <Wrench className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Manut. Equipamento</span>
          </div>
          <p className="text-3xl font-black text-indigo-600 font-headline tracking-tight">{totalEquip}</p>
        </motion.div>

        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group overflow-hidden relative"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-teal-500" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-500 group-hover:scale-110 transition-transform">
              <ArrowUpDown className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Manut. Escada</span>
          </div>
          <p className="text-3xl font-black text-cyan-600 font-headline tracking-tight">{totalEscada}</p>
        </motion.div>

        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group overflow-hidden relative"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-green-500" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pontos Gerados</span>
          </div>
          <p className="text-3xl font-black text-emerald-600 font-headline tracking-tight">{totalPoints}</p>
        </motion.div>

        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group overflow-hidden relative"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-400 to-purple-500" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-500 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Colaboradores</span>
          </div>
          <p className="text-3xl font-black text-violet-600 font-headline tracking-tight">{ranking.length}</p>
        </motion.div>
      </div>

      {/* CHART + TABLE */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Bar Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden"
        >
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 font-headline tracking-tight">Ranking de Manutenções</h2>
              <p className="text-xs text-slate-500 font-medium">Top 10 por volume total</p>
            </div>
          </div>

          <div className="p-6" style={{ height: 380 }}>
            {chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <BarChart3 className="w-12 h-12 mb-3 opacity-20" />
                <p className="font-medium text-sm">Nenhum dado de manutenção no período.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 700 }} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: "#64748b", fontWeight: 700 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, fontWeight: 700 }}
                    formatter={(value: number, name: string) => [value, name === "total" ? "Total Manutenções" : "Pontos"]}
                  />
                  <Bar dataKey="total" radius={[0, 8, 8, 0]} barSize={24}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Ranking Table */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col"
        >
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-black text-slate-800 font-headline tracking-tight">Classificação</h2>
            </div>
            <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 uppercase tracking-wider">
              {ranking.length} Avaliados
            </span>
          </div>

          <div className="overflow-y-auto custom-scrollbar flex-1 max-h-[500px]">
            {ranking.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 text-slate-400">
                <Users className="w-12 h-12 mb-3 opacity-20" />
                <p className="font-medium text-sm">Sem dados no período selecionado.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left">#</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left">Colaborador</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Equip.</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Escada</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Total</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Pontos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {ranking.map((r, i) => (
                    <tr key={r.name} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${
                          i === 0 ? "bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-amber-500/30 shadow-sm" :
                          i === 1 ? "bg-gradient-to-br from-slate-200 to-slate-400 text-white shadow-sm" :
                          i === 2 ? "bg-gradient-to-br from-amber-600 to-amber-800 text-white shadow-sm" :
                          "bg-slate-50 text-slate-600 border border-slate-200"
                        }`}>
                          {i + 1}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold text-slate-800 truncate group-hover:text-indigo-700 transition-colors">{r.name}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-black text-indigo-600">{r.equip}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-black text-cyan-600">{r.escada}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-black text-slate-800">{r.total}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-black text-emerald-600">+{r.points}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
