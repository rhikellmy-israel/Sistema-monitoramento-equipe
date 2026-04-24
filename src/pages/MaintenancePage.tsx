import React from 'react';
import { PenTool } from 'lucide-react';

export default function MaintenancePage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-primary font-headline tracking-tight flex items-center gap-4">
             <PenTool className="w-10 h-10 text-indigo-600" />
             Manutenções
          </h1>
          <p className="text-slate-500 text-lg leading-relaxed mt-2 font-medium">
            Painel analítico e gestão de manutenções de equipamentos e agendamentos.
          </p>
        </div>
      </header>

      <div className="bg-white rounded-3xl p-12 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center justify-center min-h-[400px] animate-pulse">
         <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-6">
            <PenTool className="w-10 h-10" />
         </div>
         <h2 className="text-2xl font-bold text-slate-800 font-headline mb-3">Módulo em Configuração</h2>
         <p className="text-slate-500 max-w-md mx-auto font-medium">
             As opções de importação já estão disponíveis. Em breve esta tela conterá todos os relatórios e cruzamentos de dados de testes em manutenção.
         </p>
      </div>
    </div>
  );
}
