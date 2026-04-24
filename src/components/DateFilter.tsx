import React from "react";
import { Calendar, XCircle } from "lucide-react";
import { DateFilterMode } from "../lib/dateUtils";

interface DateFilterProps {
  mode: DateFilterMode;
  value: string; // ISO format strings
  onChange: (mode: DateFilterMode, value: string) => void;
  className?: string;
}

export default function DateFilter({ mode, value, onChange, className = "" }: DateFilterProps) {
  
  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMode = e.target.value as DateFilterMode;
    onChange(newMode, "");
  };

  const clearFilter = () => {
    onChange("Todas", "");
  };

  return (
    <div className={`flex flex-col md:flex-row gap-4 bg-surface-container-low p-2 rounded-xl border border-outline-variant/10 shadow-sm ${className}`}>
      <div className="flex items-center gap-2 px-3 py-1.5 focus-within:ring-2 ring-primary/20 rounded-lg bg-surface-container-lowest flex-1 group">
        <Calendar className="w-5 h-5 text-primary shrink-0 opacity-80 group-focus-within:opacity-100 transition-opacity" />
        
        <select
          value={mode}
          onChange={handleModeChange}
          className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer uppercase pr-2 min-w-[140px]"
        >
          <option value="Todas">Todo o Período</option>
          <option value="Ano">Apenas Ano</option>
          <option value="Mes">Apenas Mês</option>
          <option value="Dia">Data Exata</option>
          <option value="Range">Intervalo de Datas</option>
        </select>
        
        <div className="flex-1 border-l border-slate-200/60 pl-3 flex items-center min-w-[150px]">
          {mode === "Ano" && (
            <input 
                type="number" 
                placeholder="Ex: 2026" 
                value={value} 
                onChange={(e) => onChange(mode, e.target.value)} 
                className="bg-transparent text-sm font-bold text-slate-700 outline-none w-full"
                min="2000"
                max="2100"
            />
          )}

          {mode === "Mes" && (
            <input 
                type="month" 
                value={value} 
                onChange={(e) => onChange(mode, e.target.value)} 
                className="bg-transparent text-sm font-bold text-slate-700 outline-none w-full uppercase"
            />
          )}

          {mode === "Dia" && (
            <input 
                type="date" 
                value={value} 
                onChange={(e) => onChange(mode, e.target.value)} 
                className="bg-transparent text-sm font-bold text-slate-700 outline-none w-full uppercase"
            />
          )}

          {mode === "Range" && (
             <div className="flex items-center gap-2 w-full text-sm font-bold text-slate-700">
                <input 
                   type="date"
                   value={value.split("|")[0] || ""}
                   onChange={(e) => onChange(mode, `${e.target.value}|${value.split("|")[1] || ""}`)}
                   className="bg-transparent outline-none w-full"
                />
                <span className="text-slate-400 font-bold uppercase text-[10px]">Até</span>
                <input 
                   type="date"
                   value={value.split("|")[1] || ""}
                   min={value.split("|")[0] || ""}
                   onChange={(e) => onChange(mode, `${value.split("|")[0] || ""}|${e.target.value}`)}
                   className="bg-transparent outline-none w-full"
                />
             </div>
          )}
          
          {mode === "Todas" && (
             <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">
                Exibindo todo histórico
             </span>
          )}
        </div>
        
        {mode !== "Todas" && (
          <button 
            onClick={clearFilter} 
            className="text-slate-300 hover:text-error transition-colors bg-slate-50 hover:bg-error-container/50 rounded-full p-1 ml-2"
            title="Remover filtro"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
