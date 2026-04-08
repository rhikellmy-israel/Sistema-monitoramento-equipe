import React, { useState } from "react";
import { UserCircle2, Lock, ShieldAlert, KeyRound, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function LoginView() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
        setError("Preencha o e-mail e a senha.");
        return;
    }
    
    setLoading(true);
    setError("");

    try {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (authError) {
          if (authError.message === "Invalid login credentials") {
               setError("E-mail ou senha incorretos.");
          } else {
               setError(authError.message);
          }
        }
    } catch (err: any) {
      setError(err?.message || "Ocorreu um erro ao conectar no servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-indigo-500 to-tertiary"></div>
        
        <div className="p-10 pt-12">
            <div className="flex flex-col items-center justify-center mb-8">
                <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center text-primary mb-4 shadow-inner rotate-3 transition-transform hover:rotate-6 shadow-indigo-500/20">
                   <KeyRound className="w-10 h-10" />
                </div>
                <h1 className="text-2xl font-black text-slate-800 dark:text-white font-headline">The Architect</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1 text-center">
                    Acesse sua conta para continuar
                </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-6">
                {error && (
                    <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 animate-in fade-in zoom-in-95">
                        <ShieldAlert className="w-5 h-5 shrink-0" />
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">E-mail corporativo</label>
                        <div className="relative">
                            <UserCircle2 className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setError("");
                                }}
                                placeholder="nome@empresa.com"
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Senha de Acesso</label>
                        <div className="relative">
                            <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setError("");
                                }}
                                placeholder="******"
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors"
                                disabled={loading}
                            />
                        </div>
                    </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-4 bg-slate-900 dark:bg-primary hover:bg-primary text-white rounded-xl font-black font-headline tracking-widest uppercase transition-all shadow-lg hover:shadow-primary/30 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? (
                       <><Loader2 className="w-5 h-5 animate-spin" /> AUTENTICANDO...</>
                    ) : (
                       <><Lock className="w-4 h-4 text-slate-400 dark:text-white group-hover:text-white transition-colors" /> ACESSAR PLATAFORMA</>
                    )}
                </button>
            </form>
        </div>
        
        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-xs font-bold text-slate-400">Ambiente Restrito &copy; 2026</p>
        </div>
      </div>
    </div>
  );
}
