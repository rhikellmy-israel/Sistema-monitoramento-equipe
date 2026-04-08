import React, { useState, useRef, useEffect } from "react";
import { Search, Bell, Settings, User, Wrench, ShieldCheck, Users, Palette, Moon, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useData } from "../../context/DataContext";
import { supabase } from "../../lib/supabase";

interface TopBarProps {
  title: string;
}

export default function TopBar({ title }: TopBarProps) {
  const { currentUser } = useData();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
        setIsThemeMenuOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNavigateAdmin = (tab: string) => {
    navigate("/admin");
    setTimeout(() => {
        window.dispatchEvent(new CustomEvent('navigateAdmin', { detail: tab }));
    }, 50);
    setIsMenuOpen(false);
  };

  const toggleDarkMode = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    setIsMenuOpen(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <header className="fixed top-0 right-0 left-72 h-20 flex justify-between items-center px-10 z-40 bg-surface/90 backdrop-blur-2xl border-b border-outline-variant/5 transition-colors duration-300">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-80 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary w-4 h-4 transition-colors" />
          <input
            type="text"
            placeholder="Pesquisar no sistema..."
            className="w-full bg-slate-200/40 hover:bg-slate-200/60 focus:bg-surface-container-lowest border border-transparent focus:border-primary/20 rounded-xl pl-11 pr-5 py-2.5 text-sm focus:ring-4 focus:ring-primary/5 transition-all outline-none dark:bg-slate-800/60 dark:hover:bg-slate-800 dark:focus:bg-slate-900 dark:text-slate-200 placeholder:text-slate-400 font-medium"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-1.5">
          <button className="relative p-2.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 rounded-full transition-all dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-indigo-400">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2.5 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 shadow-sm"></span>
          </button>
          
          {/* Settings Menu */}
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 rounded-full transition-all dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-indigo-400"
            >
              <Settings className="w-5 h-5" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-3 w-64 bg-white dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] border border-slate-100/80 dark:border-slate-700/50 py-3 z-50 animate-in fade-in slide-in-from-top-4">
                <div className="px-5 py-2 mb-1">
                  <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Configurações Base</h3>
                </div>
                
                <div className="px-2 space-y-0.5">
                    <button onClick={() => handleNavigateAdmin('techs')} className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors">
                    <Wrench className="w-4 h-4 text-slate-400" /> Técnico
                    </button>
                    <button onClick={() => handleNavigateAdmin('auditors')} className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 rounded-lg transition-colors">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" /> Colaborador
                    </button>
                    <button onClick={() => handleNavigateAdmin('users')} className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 rounded-lg transition-colors">
                    <Users className="w-4 h-4 text-blue-400" /> Acesso ao Sistema
                    </button>
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-700/50 my-3 mx-4"></div>

                <div className="relative px-2">
                  <button onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)} className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <Palette className="w-4 h-4 text-slate-400" /> Preferências
                    </div>
                  </button>

                  {isThemeMenuOpen && (
                    <div className="mt-2 p-1.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-700/50">
                       <button onClick={toggleDarkMode} className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                         <div className="flex items-center gap-2">
                            <Moon className="w-3.5 h-3.5" /> Modo Escuro (Global)
                         </div>
                       </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="h-10 w-px bg-slate-200/50 dark:bg-slate-700/50"></div>

        <div className="relative" ref={profileMenuRef}>
          <div 
            className="flex items-center gap-4 cursor-pointer group"
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
          >
            <div className="text-right">
              <p className="text-sm font-black text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300">
                {currentUser?.name || "Usuário"}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold">
                {currentUser?.role === 'admin' ? "Administrador" : currentUser?.role === 'gerente' ? "Gerente" : "Visualizador"}
              </p>
            </div>
            {currentUser?.photoUrl ? (
              <img
                src={currentUser.photoUrl}
                alt="User"
                className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-100/50 dark:ring-slate-800 group-hover:ring-indigo-400 dark:group-hover:ring-indigo-500 shadow-sm transition-all duration-300 group-hover:scale-105 ease-out"
              />
            ) : (
              <div className="w-11 h-11 rounded-full border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 ease-out">
                {currentUser?.name?.substring(0, 2).toUpperCase() || "US"}
              </div>
            )}
          </div>
          
          {isProfileMenuOpen && (
            <div className="absolute right-0 mt-3 w-48 bg-white dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] border border-slate-100/80 dark:border-slate-700/50 py-2 z-50 animate-in fade-in slide-in-from-top-4">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
               >
                <LogOut className="w-4 h-4" /> Sair da conta
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
