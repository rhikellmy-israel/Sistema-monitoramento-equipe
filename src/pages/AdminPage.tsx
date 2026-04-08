import React, { useState, useEffect, useRef } from "react";
import { Users, UserPlus, Settings, Trash2, Building, ShieldCheck, Wrench, Search, Clock, CalendarDays, Edit2, Image as ImageIcon, UploadCloud } from "lucide-react";
import * as XLSX from "xlsx";
import { useData } from "../context/DataContext";
import { AuditorConfig, HorarioEscala, TechnicianConfig, UserConfig } from "../types";
import { supabase } from "../lib/supabase";

type Tab = "techs" | "auditors" | "users" | "theme";

export default function AdminPanel() {
  const { 
    technicians, setTechnicians, 
    auditors, setAuditors, 
    users, setUsers 
  } = useData();

  const [activeTab, setActiveTab] = useState<Tab>("techs");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const handleNav = (e: any) => {
      if (['techs', 'auditors', 'users'].includes(e.detail)) {
        setActiveTab(e.detail);
      }
    };
    window.addEventListener("navigateAdmin", handleNav);
    return () => window.removeEventListener("navigateAdmin", handleNav);
  }, []);

  // States for Technician Form
  const [techName, setTechName] = useState("");
  const [techStatus, setTechStatus] = useState<"Ativo" | "Inativo">("Ativo");
  const [editingTechId, setEditingTechId] = useState<string | null>(null);

  const startEditTech = (tech: TechnicianConfig) => {
    setEditingTechId(tech.id);
    setTechName(tech.name);
    setTechStatus(tech.status);
    setActiveTab('techs');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditTech = () => {
    setEditingTechId(null);
    setTechName("");
    setTechStatus("Ativo");
  };

  // States for Colaborador Form
  const [auditorName, setAuditorName] = useState("");
  const [auditorStatus, setAuditorStatus] = useState<"Ativo" | "Inativo">("Ativo");
  const [tipoEscala, setTipoEscala] = useState<"PADRAO" | "ALTERNADA">("PADRAO");
  
  const [escala, setEscala] = useState<HorarioEscala>({
    entrada: "08:00",
    entradaAlmoco: "12:00",
    saidaAlmoco: "13:00",
    saida: "17:00"
  });

  const [escalaAltSabado, setEscalaAltSabado] = useState<HorarioEscala>({
    entrada: "08:00",
    entradaAlmoco: "12:00",
    saidaAlmoco: "13:00",
    saida: "12:00"
  });

  const [escalaSexta, setEscalaSexta] = useState<HorarioEscala>({
    entrada: "08:00",
    entradaAlmoco: "12:00",
    saidaAlmoco: "13:00",
    saida: "16:00"
  });

  const [escalaAltSegSexFolga, setEscalaAltSegSexFolga] = useState<HorarioEscala>({
    entrada: "08:00",
    entradaAlmoco: "12:00",
    saidaAlmoco: "13:00",
    saida: "18:00"
  });

  const [escalaAltSextaFolga, setEscalaAltSextaFolga] = useState<HorarioEscala>({
    entrada: "08:00",
    entradaAlmoco: "12:00",
    saidaAlmoco: "13:00",
    saida: "17:00"
  });

  const [dataReferencia, setDataReferencia] = useState("");

  const [editingAuditorId, setEditingAuditorId] = useState<string | null>(null);

  const startEditAuditor = (auditor: AuditorConfig) => {
    setEditingAuditorId(auditor.id);
    setAuditorName(auditor.name);
    setAuditorStatus(auditor.status);
    setTipoEscala(auditor.tipoEscala || "PADRAO");
    setEscala(auditor.escala);
    if (auditor.escalaSexta) {
        setEscalaSexta(auditor.escalaSexta);
    }
    
    if (auditor.escalaAlternada) {
        if (auditor.escalaAlternada.semanaComSabado.sabado) {
            setEscalaAltSabado(auditor.escalaAlternada.semanaComSabado.sabado);
        }
        if (auditor.escalaAlternada.semanaSemSabado.segSex) {
            setEscalaAltSegSexFolga(auditor.escalaAlternada.semanaSemSabado.segSex);
        }
        if (auditor.escalaAlternada.semanaSemSabado.sexta) {
            setEscalaAltSextaFolga(auditor.escalaAlternada.semanaSemSabado.sexta);
        }
        setDataReferencia(auditor.escalaAlternada.dataReferenciaSabadoTrabalhado || "");
    }
    setActiveTab('auditors');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditAuditor = () => {
    setEditingAuditorId(null);
    setAuditorName("");
    setAuditorStatus("Ativo");
    setTipoEscala("PADRAO");
    setDataReferencia("");
  };

  // States for User Form
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState<"admin" | "viewer" | "gerente">("viewer");
  const [userPhotoUrl, setUserPhotoUrl] = useState("");
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  const togglePermission = (perm: string) => {
      setUserPermissions(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  };

  const startEditUser = (user: UserConfig) => {
    setEditingUserId(user.id);
    setUserName(user.name);
    setUserEmail(user.email || "");
    setUserPassword(user.password || "");
    setUserRole(user.role);
    setUserPhotoUrl(user.photoUrl || "");
    setUserPermissions(user.permissions || []);
    setActiveTab('users');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditUser = () => {
    setEditingUserId(null);
    setUserName("");
    setUserEmail("");
    setUserPassword("");
    setUserRole("viewer");
    setUserPhotoUrl("");
    setUserPermissions([]);
  };


  const handleAddTech = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!techName.trim()) return;
    const newTech: TechnicianConfig = {
      id: editingTechId || String(Date.now()) + Math.random(),
      name: techName,
      status: techStatus
    };

    const targetRow = { id: newTech.id, name: newTech.name, status: newTech.status };

    if (editingTechId) {
        await supabase.from('technicians').update(targetRow).eq('id', newTech.id);
        setTechnicians(technicians.map(t => t.id === editingTechId ? newTech : t));
        cancelEditTech();
    } else {
        await supabase.from('technicians').insert([targetRow]);
        setTechnicians([...technicians, newTech]);
        setTechName("");
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json<any>(firstSheet, { header: 1 });
        
        let newTechs: TechnicianConfig[] = [];
        const existingNames = new Set(technicians.map(t => t.name));
        
        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            const name = row[0]; 
            
            if (name && typeof name === "string" && name.trim().length > 2) {
                const upperName = name.toUpperCase().trim();
                if (upperName.includes("NOME") || upperName.includes("TÉCNICO") || upperName.includes("TECNICO") || upperName === "N") continue;
                
                if (!existingNames.has(upperName)) {
                    newTechs.push({
                        id: String(Date.now() + i) + Math.random(),
                        name: upperName,
                        status: "Ativo"
                    });
                    existingNames.add(upperName); // prevent duplicates within the same batch
                }
            }
        }
        if (newTechs.length > 0) {
            const rows = newTechs.map(t => ({ id: t.id, name: t.name, status: t.status }));
            await supabase.from('technicians').insert(rows);
            setTechnicians(prev => [...prev, ...newTechs]);
            alert(`${newTechs.length} técnicos lidos e armazenados na nuvem.\nCadastros duplicados (nomes exatos) foram ignorados por segurança.`);
        } else {
            alert("Nenhum nome válido novo encontrado na planilha.");
        }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddAuditor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditorName.trim()) return;

    if (tipoEscala === "ALTERNADA" && !dataReferencia) {
        alert("Preencha a 'Data Referência' para uma escala alternada.");
        return;
    }

    const newAud: AuditorConfig = {
      id: editingAuditorId || String(Date.now()) + Math.random(),
      name: auditorName,
      status: auditorStatus,
      escala: { ...escala }, 
      escalaSexta: tipoEscala === "PADRAO" ? { ...escalaSexta } : undefined,
      tipoEscala: tipoEscala,
      escalaAlternada: tipoEscala === "ALTERNADA" ? {
        semanaComSabado: {
          segSex: { ...escala },
          sabado: { ...escalaAltSabado }
        },
        semanaSemSabado: {
          segSex: { ...escalaAltSegSexFolga },
          sexta: { ...escalaAltSextaFolga }
        },
        dataReferenciaSabadoTrabalhado: dataReferencia
      } : undefined
    };

    const targetRow = {
      id: newAud.id,
      name: newAud.name,
      status: newAud.status,
      tipo_escala: newAud.tipoEscala,
      escala: newAud.escala,
      escala_sexta: newAud.escalaSexta,
      escala_alternada: newAud.escalaAlternada
    };

    if (editingAuditorId) {
        await supabase.from('auditors').update(targetRow).eq('id', newAud.id);
        setAuditors(auditors.map(a => a.id === editingAuditorId ? newAud : a));
        cancelEditAuditor();
    } else {
        await supabase.from('auditors').insert([targetRow]);
        setAuditors([...auditors, newAud]);
        setAuditorName("");
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userEmail.trim()) return;

    if (!editingUserId) {
        if (!userPassword.trim()) {
             alert("Digite a senha provisória.");
             return;
        }
        
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData?.session?.access_token;
            
            const { data, error } = await supabase.functions.invoke('create-admin-user', {
                body: {
                    email: userEmail,
                    password: userPassword,
                    name: userName,
                    role: userRole,
                    permissions: userPermissions
                },
                headers: token ? {
                    Authorization: `Bearer ${token}`
                } : undefined
            });
            
            if (error || !data || data.error) {
                alert("Erro ao criar usuário: " + (error?.message || data?.error || "Desconhecido"));
                return;
            }
            
            alert("Conta criada com sucesso!");
            cancelEditUser();
            
            const newUser: UserConfig = {
               id: data.id,
               name: userName,
               email: userEmail,
               role: userRole,
               permissions: userPermissions,
               active: true,
               photoUrl: userPhotoUrl || undefined
            };
            setUsers([...users, newUser]);
            return;
        } catch (err) {
            console.error(err);
            alert("Erro na operação.");
            return;
        }
    }

    const existingUser = users.find(u => u.id === editingUserId);

    const newUser: UserConfig = {
      id: editingUserId,
      name: userName,
      email: userEmail,
      password: existingUser?.password || "", // mantendo senha antiga para formatação via UI se houver edicao profunda futura
      role: userRole,
      permissions: userPermissions,
      active: true,
      photoUrl: userPhotoUrl || undefined
    };

    const targetRow = {
       name: newUser.name,
       role: newUser.role,
       permissions: newUser.permissions,
       photo_url: newUser.photoUrl
    };

    await supabase.from('users').update(targetRow).eq('id', newUser.id);
    setUsers(users.map(u => u.id === editingUserId ? newUser : u));
    cancelEditUser();
  };

  const deleteTech = async (id: string) => {
      if (window.confirm("Essa exclusão apaga esse técnico do servidor para o mundo todo. Continuar?")) {
          await supabase.from('technicians').delete().eq('id', id);
          setTechnicians(technicians.filter(t => t.id !== id));
      }
  };
  const deleteAuditor = async (id: string) => {
      if (window.confirm("Essa exclusão apaga esse colaborador do servidor para o mundo todo. Continuar?")) {
          await supabase.from('auditors').delete().eq('id', id);
          setAuditors(auditors.filter(a => a.id !== id));
      }
  };
  const deleteUser = async (id: string) => {
      if (window.confirm("Isso excluirá o perfil base, mas o e-mail de acesso oficial deve ser deletado diretamente no Supabase Auth. Continuar?")) {
          await supabase.from('users').delete().eq('id', id);
          setUsers(users.filter(u => u.id !== id));
      }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-8">
        <div className="max-w-2xl">
          <h2 className="text-4xl font-extrabold text-primary font-headline tracking-tight mb-3 flex items-center gap-4">
            <Settings className="w-10 h-10 text-primary" />
            Configurações e Cadastros
          </h2>
          <p className="text-slate-500 text-lg leading-relaxed">
            Painel administrativo para gerenciar usuários, escalas de colaboradores e a base mestre de técnicos da operação.
          </p>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-8">
        {/* SIDEBAR TABS */}
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
            <button
              onClick={() => setActiveTab("techs")}
              className={`px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-3 transition-colors text-left ${activeTab === 'techs' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-slate-600 hover:bg-slate-100 border border-transparent'}`}
            >
              <Wrench className={`w-5 h-5 ${activeTab === 'techs' ? 'text-primary' : 'text-slate-400'}`} /> Técnicos da Base
            </button>
            <button
              onClick={() => setActiveTab("auditors")}
              className={`px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-3 transition-colors text-left ${activeTab === 'auditors' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-600 hover:bg-slate-100 border border-transparent'}`}
            >
              <ShieldCheck className={`w-5 h-5 ${activeTab === 'auditors' ? 'text-indigo-500' : 'text-slate-400'}`} /> Colaboradores
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-3 transition-colors text-left ${activeTab === 'users' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-600 hover:bg-slate-100 border border-transparent'}`}
            >
              <Users className={`w-5 h-5 ${activeTab === 'users' ? 'text-blue-500' : 'text-slate-400'}`} /> Credenciais Acesso
            </button>
            <div className="my-2 border-t border-slate-200"></div>
            <button
              onClick={() => setActiveTab("theme")}
              className={`px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-3 transition-colors text-left ${activeTab === 'theme' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'text-slate-600 hover:bg-slate-100 border border-transparent'}`}
            >
              <ImageIcon className={`w-5 h-5 ${activeTab === 'theme' ? 'text-purple-500' : 'text-slate-400'}`} /> Aparência (Tema)
            </button>
        </div>

        <div className="flex-1 w-full min-w-0">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* ADD FORM SECTION */}
        <div className="xl:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            
            {activeTab === 'techs' && (
              <form onSubmit={handleAddTech} className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 font-headline mb-4 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" /> {editingTechId ? "Editar Técnico" : "Novo Técnico"}
                </h3>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nome Completo</label>
                  <input type="text" value={techName} onChange={e => setTechName(e.target.value)} required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm font-medium text-slate-700" placeholder="Ex: João da Silva..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status</label>
                  <select value={techStatus} onChange={e => setTechStatus(e.target.value as any)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm font-medium text-slate-700">
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 mt-6">
                    {editingTechId && (
                        <button type="button" onClick={cancelEditTech} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold transition-all">
                            Cancelar Edição
                        </button>
                    )}
                    <button type="submit" className="flex-1 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-bold shadow-md transition-all">
                      {editingTechId ? "Salvar Alterações" : "Salvar Técnico"}
                    </button>
                    {!editingTechId && (
                        <>
                           <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={handleBulkImport} />
                           <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold transition-all border border-indigo-200">
                               <UploadCloud className="w-5 h-5" /> Subir Planilha (.xlsx)
                           </button>
                        </>
                    )}
                </div>
              </form>
            )}

            {activeTab === 'auditors' && (
              <form onSubmit={handleAddAuditor} className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 font-headline mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-500" /> {editingAuditorId ? "Editar Colaborador" : "Novo Colaborador"}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nome Completo</label>
                    <input type="text" value={auditorName} onChange={e => setAuditorName(e.target.value)} required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-700" placeholder="Ex: Maria Oliveira" />
                    </div>
                    <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status</label>
                    <select value={auditorStatus} onChange={e => setAuditorStatus(e.target.value as any)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-700">
                        <option value="Ativo">Ativo</option>
                        <option value="Inativo">Inativo</option>
                    </select>
                    </div>
                    <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tipo de Escala</label>
                    <select value={tipoEscala} onChange={e => setTipoEscala(e.target.value as any)} className="w-full px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold shadow-sm">
                        <option value="PADRAO">Padrão Único (Seg a Sex)</option>
                        <option value="ALTERNADA">Alternado (Sábado Sim / Não)</option>
                    </select>
                    </div>
                </div>

                {tipoEscala === "PADRAO" && (
                    <div className="pt-4 border-t border-slate-100 space-y-4">
                        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200">
                            <label className="block text-xs font-bold text-indigo-500 uppercase tracking-wider mb-3 flex items-center gap-1"><Clock className="w-4 h-4"/> Horário (Seg - Qui)</label>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] uppercase text-slate-400 font-bold mb-1">ENTRADA</label>
                                    <input type="time" value={escala.entrada} onChange={e => setEscala({...escala, entrada: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-sm font-medium" />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-slate-400 font-bold mb-1">E. ALMOÇO</label>
                                    <input type="time" value={escala.entradaAlmoco} onChange={e => setEscala({...escala, entradaAlmoco: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-sm font-medium" />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-slate-400 font-bold mb-1">S. ALMOÇO</label>
                                    <input type="time" value={escala.saidaAlmoco} onChange={e => setEscala({...escala, saidaAlmoco: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-sm font-medium" />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-slate-400 font-bold mb-1">SAÍDA</label>
                                    <input type="time" value={escala.saida} onChange={e => setEscala({...escala, saida: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-sm font-medium" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-100">
                            <label className="block text-xs font-bold text-teal-600 uppercase tracking-wider mb-3 flex items-center gap-1"><Clock className="w-4 h-4"/> Horário (Sexta)</label>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] uppercase text-teal-500 font-bold mb-1">ENTRADA</label>
                                    <input type="time" value={escalaSexta.entrada} onChange={e => setEscalaSexta({...escalaSexta, entrada: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-sm font-medium text-teal-700" />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-teal-500 font-bold mb-1">E. ALMOÇO</label>
                                    <input type="time" value={escalaSexta.entradaAlmoco} onChange={e => setEscalaSexta({...escalaSexta, entradaAlmoco: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-sm font-medium text-teal-700" />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-teal-500 font-bold mb-1">S. ALMOÇO</label>
                                    <input type="time" value={escalaSexta.saidaAlmoco} onChange={e => setEscalaSexta({...escalaSexta, saidaAlmoco: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-sm font-medium text-teal-700" />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-teal-500 font-bold mb-1">SAÍDA</label>
                                    <input type="time" value={escalaSexta.saida} onChange={e => setEscalaSexta({...escalaSexta, saida: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-sm font-medium text-teal-700" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {tipoEscala === "ALTERNADA" && (
                    <div className="pt-4 border-t border-slate-100 space-y-4">
                        <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                            <label className="block text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3 flex items-center gap-1"><CalendarDays className="w-4 h-4"/> Na semana COM Sábado</label>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="pl-3 border-l-2 border-indigo-200">
                                    <label className="block text-[11px] font-bold text-slate-500 mb-2">Horário Seg a Sex</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[9px] uppercase text-slate-400 font-semibold mb-0.5">ENTRADA</label>
                                            <input type="time" value={escala.entrada} onChange={e => setEscala({...escala, entrada: e.target.value})} className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[11px] font-medium" />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] uppercase text-slate-400 font-semibold mb-0.5">E. ALMOÇO</label>
                                            <input type="time" value={escala.entradaAlmoco} onChange={e => setEscala({...escala, entradaAlmoco: e.target.value})} className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[11px] font-medium" />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] uppercase text-slate-400 font-semibold mb-0.5">S. ALMOÇO</label>
                                            <input type="time" value={escala.saidaAlmoco} onChange={e => setEscala({...escala, saidaAlmoco: e.target.value})} className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[11px] font-medium" />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] uppercase text-slate-400 font-semibold mb-0.5">SAÍDA</label>
                                            <input type="time" value={escala.saida} onChange={e => setEscala({...escala, saida: e.target.value})} className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[11px] font-medium" />
                                        </div>
                                    </div>
                                </div>

                                <div className="pl-3 border-l-2 border-amber-200">
                                    <label className="block text-[11px] font-bold text-amber-600 mb-2">Horário Sábado</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[9px] uppercase text-slate-400 font-semibold mb-0.5">ENTRADA</label>
                                            <input type="time" value={escalaAltSabado.entrada} onChange={e => setEscalaAltSabado({...escalaAltSabado, entrada: e.target.value})} className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[11px] font-medium" />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] uppercase text-slate-400 font-semibold mb-0.5">E. ALMOÇO</label>
                                            <input type="time" value={escalaAltSabado.entradaAlmoco} onChange={e => setEscalaAltSabado({...escalaAltSabado, entradaAlmoco: e.target.value})} className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[11px] font-medium" />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] uppercase text-slate-400 font-semibold mb-0.5">S. ALMOÇO</label>
                                            <input type="time" value={escalaAltSabado.saidaAlmoco} onChange={e => setEscalaAltSabado({...escalaAltSabado, saidaAlmoco: e.target.value})} className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[11px] font-medium" />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] uppercase text-slate-400 font-semibold mb-0.5">SAÍDA</label>
                                            <input type="time" value={escalaAltSabado.saida} onChange={e => setEscalaAltSabado({...escalaAltSabado, saida: e.target.value})} className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[11px] font-medium" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-1"><CalendarDays className="w-4 h-4"/> Na semana SEM Sábado (Folga)</label>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="pl-3 border-l-2 border-slate-300">
                                    <label className="block text-[11px] font-bold text-slate-500 mb-2">Horário Seg a Qui (Compensado)</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[9px] uppercase text-slate-400 font-semibold mb-0.5">ENTRADA</label>
                                            <input type="time" value={escalaAltSegSexFolga.entrada} onChange={e => setEscalaAltSegSexFolga({...escalaAltSegSexFolga, entrada: e.target.value})} className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[11px] font-medium" />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] uppercase text-slate-400 font-semibold mb-0.5">E. ALMOÇO</label>
                                            <input type="time" value={escalaAltSegSexFolga.entradaAlmoco} onChange={e => setEscalaAltSegSexFolga({...escalaAltSegSexFolga, entradaAlmoco: e.target.value})} className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[11px] font-medium" />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] uppercase text-slate-400 font-semibold mb-0.5">S. ALMOÇO</label>
                                            <input type="time" value={escalaAltSegSexFolga.saidaAlmoco} onChange={e => setEscalaAltSegSexFolga({...escalaAltSegSexFolga, saidaAlmoco: e.target.value})} className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[11px] font-medium" />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] uppercase text-slate-400 font-semibold mb-0.5">SAÍDA</label>
                                            <input type="time" value={escalaAltSegSexFolga.saida} onChange={e => setEscalaAltSegSexFolga({...escalaAltSegSexFolga, saida: e.target.value})} className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[11px] font-medium" />
                                        </div>
                                    </div>
                                </div>
                                <div className="pl-3 border-l-2 border-teal-300">
                                    <label className="block text-[11px] font-bold text-teal-600 mb-2">Horário Sexta</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[9px] uppercase text-slate-400 font-semibold mb-0.5">ENTRADA</label>
                                            <input type="time" value={escalaAltSextaFolga.entrada} onChange={e => setEscalaAltSextaFolga({...escalaAltSextaFolga, entrada: e.target.value})} className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[11px] font-medium" />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] uppercase text-slate-400 font-semibold mb-0.5">E. ALMOÇO</label>
                                            <input type="time" value={escalaAltSextaFolga.entradaAlmoco} onChange={e => setEscalaAltSextaFolga({...escalaAltSextaFolga, entradaAlmoco: e.target.value})} className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[11px] font-medium" />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] uppercase text-slate-400 font-semibold mb-0.5">S. ALMOÇO</label>
                                            <input type="time" value={escalaAltSextaFolga.saidaAlmoco} onChange={e => setEscalaAltSextaFolga({...escalaAltSextaFolga, saidaAlmoco: e.target.value})} className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[11px] font-medium" />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] uppercase text-slate-400 font-semibold mb-0.5">SAÍDA</label>
                                            <input type="time" value={escalaAltSextaFolga.saida} onChange={e => setEscalaAltSextaFolga({...escalaAltSextaFolga, saida: e.target.value})} className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[11px] font-medium" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                             <label className="block text-[11px] font-bold text-rose-700 uppercase tracking-wider mb-2 flex items-center gap-1">Data Referência Inicial</label>
                             <p className="text-[10px] text-rose-600 mb-2">Informe a data de ALGUM SÁBADO que esse colaborador efetivamente trabalhou. O sistema usará essa data para intercalar e descobrir as semanas corretas infinitamente.</p>
                             <input type="date" required value={dataReferencia} onChange={e => setDataReferencia(e.target.value)} className="w-full px-3 py-2 bg-white border border-rose-200 rounded text-sm font-bold text-rose-900 shadow-sm" />
                        </div>
                    </div>
                )}


                <div className="flex gap-4 mt-4">
                    {editingAuditorId && (
                        <button type="button" onClick={cancelEditAuditor} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold transition-all">
                            Cancelar Edição
                        </button>
                    )}
                    <button type="submit" className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-md transition-all">
                      {editingAuditorId ? "Salvar Alterações" : "Cadastrar colaborador"}
                    </button>
                </div>
              </form>
            )}

            {activeTab === 'users' && (
              <form onSubmit={handleAddUser} className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 font-headline mb-4 flex items-center gap-2">
                  <Building className="w-5 h-5 text-blue-500" /> {editingUserId ? "Editar Acesso" : "Nova Conta de Acesso"}
                </h3>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nome Completo</label>
                  <input type="text" value={userName} onChange={e => setUserName(e.target.value)} required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium text-slate-700" placeholder="Ex: Gabriel Santos" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">E-mail</label>
                    <input type="email" value={userEmail} onChange={e => setUserEmail(e.target.value)} required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium text-slate-700" placeholder="email@empresa.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{editingUserId ? "Nova Senha (deixe vazio p/ manter)" : "Senha Provisória"}</label>
                    <input type="password" value={userPassword} onChange={e => setUserPassword(e.target.value)} required={!editingUserId} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium text-slate-700" placeholder="******" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nível de Permissão (Básico)</label>
                  <select value={userRole} onChange={e => setUserRole(e.target.value as any)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium text-slate-700">
                    <option value="viewer">Visualizador Padrão</option>
                    <option value="gerente">Gerente</option>
                    <option value="admin">Administração Total</option>
                  </select>
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Acessos Permitidos (Módulos Específicos)</label>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                       {[
                         {id: 'import', label: 'Importação'}, 
                         {id: 'monitoring', label: 'Monitoramento da Equipe'}, 
                         {id: 'discrepancies', label: 'Divergências Técnicas'}, 
                         {id: 'attendance', label: 'Atrasos de Ponto'}, 
                         {id: 'ranking', label: 'Ranking Geral'}, 
                         {id: 'admin', label: 'Configurações e API'}
                       ].map(mod => (
                           <label key={mod.id} className="flex items-center gap-2 cursor-pointer">
                               <input type="checkbox" checked={userPermissions.includes(mod.id)} onChange={() => togglePermission(mod.id)} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 focus:ring-2" />
                               <span className="text-sm font-medium text-slate-700">{mod.label}</span>
                           </label>
                       ))}
                   </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2"><ImageIcon className="w-4 h-4"/> URL da Foto (Opcional)</label>
                  <input type="text" value={userPhotoUrl} onChange={e => setUserPhotoUrl(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium text-slate-700" placeholder="Ex: https://..." />
                </div>
                <div className="flex gap-4 mt-4">
                    {editingUserId && (
                        <button type="button" onClick={cancelEditUser} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold transition-all">
                            Cancelar Edição
                        </button>
                    )}
                    <button type="submit" className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md transition-all">
                      {editingUserId ? "Salvar Alterações" : "Criar Credencial"}
                    </button>
                </div>
              </form>
            )}

            {activeTab === 'theme' && (
                <div className="space-y-4">
                   <h3 className="text-lg font-bold text-slate-800 font-headline mb-4 flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-purple-600" /> Personalização e Temas
                   </h3>
                   <div className="p-8 bg-slate-50 border border-slate-200 rounded-xl text-center">
                       <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-4 opacity-50" />
                       <p className="text-sm text-slate-500 font-bold mb-6">Em breve você poderá customizar as cores da marca (Color Palette), trocar logotipos institucionais e configurar forçar modo nativo de tela direto por aqui.</p>
                       <button className="px-6 py-2.5 bg-slate-300 text-slate-500 font-bold rounded-lg cursor-not-allowed">Configurações Bloqueadas</button>
                   </div>
                </div>
            )}

          </div>
        </div>

        {/* LIST SECTION */}
        {activeTab !== 'theme' && (
          <div className="xl:col-span-7 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col min-h-[500px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 font-headline">Cadastros Existentes</h3>
            <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    placeholder="Filtrar nesta lista..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-300 text-sm text-slate-700"
                />
            </div>
          </div>

          <div className="overflow-y-auto pr-2 space-y-3 flex-1 custom-scrollbar">
            {/* TECH LIST */}
            {activeTab === 'techs' && (
                technicians.length === 0 ? (
                    <div className="text-center text-slate-400 mt-20"><Wrench className="w-12 h-12 mx-auto mb-3 opacity-20"/>Nenhum técnico cadastrado na base persistente.</div>
                ) : (
                    technicians.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase())).map((t) => (
                        <div key={t.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all group">
                            <div>
                                <h4 className="text-sm font-bold text-slate-700 uppercase">{t.name}</h4>
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mt-1 inline-block ${t.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{t.status}</span>
                            </div>
                            <div className="flex gap-2 ml-4">
                                <button onClick={() => startEditTech(t)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:bg-indigo-50 hover:text-indigo-500 transition-colors" title="Editar Técnico">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => deleteTech(t.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:bg-error/10 hover:text-error transition-colors" title="Remover Técnico">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )
            )}

            {/* AUDITORS LIST */}
            {activeTab === 'auditors' && (
                auditors.length === 0 ? (
                    <div className="text-center text-slate-400 mt-20"><ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-20"/>Nenhum colaborador configurado com escala.</div>
                ) : (
                    auditors.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase())).map((a) => (
                        <div key={a.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all group">
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-slate-700 uppercase">{a.name}</h4>
                                <div className="flex gap-2 mt-2 flex-wrap">
                                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${a.status === 'Ativo' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>{a.status}</span>
                                    
                                    {!a.tipoEscala || a.tipoEscala === "PADRAO" ? (
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                            <Clock className="w-3 h-3 text-slate-400"/> Padrão: {a.escala.entrada} às {a.escala.saida}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100">
                                            <CalendarDays className="w-3 h-3 text-amber-500"/> Escala Alternada (Sab Sim/Não)
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                                <button onClick={() => startEditAuditor(a)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:bg-indigo-50 hover:text-indigo-500 transition-colors" title="Editar Escala">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => deleteAuditor(a.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:bg-error/10 hover:text-error transition-colors" title="Remover Escala">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )
            )}

            {/* USERS LIST */}
            {activeTab === 'users' && (
                users.length === 0 ? (
                    <div className="text-center text-slate-400 mt-20"><Users className="w-12 h-12 mx-auto mb-3 opacity-20"/>Nenhum usuário configurado.</div>
                ) : (
                    users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase())).map((u) => (
                        <div key={u.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all group">
                            <div className="flex items-center gap-4">
                                {u.photoUrl ? (
                                    <img src={u.photoUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full border border-blue-200 bg-blue-100 flex items-center justify-center text-blue-600 font-bold shadow-sm">
                                        {u.name.substring(0, 2).toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <h4 className="text-sm font-bold text-slate-700">{u.name}</h4>
                                    {u.email && <p className="text-xs text-slate-500">{u.email}</p>}
                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mt-1 inline-block ${u.role === 'admin' ? 'bg-rose-50 text-rose-600 border border-rose-100' : u.role === 'gerente' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>Acesso: {u.role}</span>
                                </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                                <button onClick={() => startEditUser(u)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:bg-blue-50 hover:text-blue-500 transition-colors" title="Editar Usuário">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => deleteUser(u.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:bg-error/10 hover:text-error transition-colors" title="Remover Usuário">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )
            )}
          </div>
        </div>
        )}

          </div>{/* end inner grid */}
        </div>{/* end flex-1 wrapper */}
      </div>{/* end layout wrapper */}
    </div>
  );
}
