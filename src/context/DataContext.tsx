import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from "react";
import { AttendanceRecord, AuditorConfig, TechnicianConfig, UserConfig, RmaRecord, SchedulingRecord, ProductBaseRecord, ProductionEntry, EntradaSetorRecord, SaidaSetorRecord, Announcement } from "../types";
import { supabase } from "../lib/supabase";
import { normalizeDisplayName } from "../lib/nameAliasMap";
import { normalizeDateToISO } from "../lib/dateUtils";
import { calculateOfficialRanking, generateRankingAnnouncementData, getLatestActiveMonth } from "../lib/rankingCalculator";


export interface MonitoringRecord {
  import_id?: string;
  dia_da_semana: string;
  data_registro: string;
  funcionario: string;
  limpos: number;
  testados: number;
  observacao?: string;
}
export interface FechamentoRecord {
  import_id?: string;
  data_criacao: string;
  produto: string;
  descricao: string;
  mac: string;
  almoxarifado_origem: string;
  almoxarifado_destino: string;
  situacao: string;
  id_almoxarifado: string;
  data_confirmacao?: string;
  observacao?: string;
}
export interface ImportHistoryRecord {
  id: string;
  file_name: string;
  module: string;
  imported_by: string;
  created_at: string;
  users?: { name: string; email: string };
}

interface DataContextType {
  monitoringData: MonitoringRecord[];
  setMonitoringData: (data: MonitoringRecord[] | ((prev: MonitoringRecord[]) => MonitoringRecord[])) => void;
  fechamentoData: FechamentoRecord[];
  setFechamentoData: (data: FechamentoRecord[] | ((prev: FechamentoRecord[]) => FechamentoRecord[])) => void;
  attendanceData: AttendanceRecord[];
  setAttendanceData: (data: AttendanceRecord[] | ((prev: AttendanceRecord[]) => AttendanceRecord[])) => void;
  importHistory: ImportHistoryRecord[];
  setImportHistory: (data: ImportHistoryRecord[] | ((prev: ImportHistoryRecord[]) => ImportHistoryRecord[])) => void;
  
  rmaData: RmaRecord[];
  setRmaData: (data: RmaRecord[] | ((prev: RmaRecord[]) => RmaRecord[])) => void;
  
  schedulingData: SchedulingRecord[];
  setSchedulingData: (data: SchedulingRecord[] | ((prev: SchedulingRecord[]) => SchedulingRecord[])) => void;
  productsBase: ProductBaseRecord[];
  setProductsBase: (data: ProductBaseRecord[] | ((prev: ProductBaseRecord[]) => ProductBaseRecord[])) => void;
  productionEntries: ProductionEntry[];
  setProductionEntries: (data: ProductionEntry[] | ((prev: ProductionEntry[]) => ProductionEntry[])) => void;
  deleteProductionEntry: (id: string) => void;
  updateProductionEntry: (id: string, data: Partial<ProductionEntry>) => void;
  
  entradasSetorData: EntradaSetorRecord[];
  setEntradasSetorData: (data: EntradaSetorRecord[] | ((prev: EntradaSetorRecord[]) => EntradaSetorRecord[])) => void;
  saidasSetorData: SaidaSetorRecord[];
  setSaidasSetorData: (data: SaidaSetorRecord[] | ((prev: SaidaSetorRecord[]) => SaidaSetorRecord[])) => void;

  announcements: Announcement[];
  setAnnouncements: (data: Announcement[] | ((prev: Announcement[]) => Announcement[])) => void;
  addAnnouncement: (ann: Omit<Announcement, "id" | "created_at"> & { id?: string }) => void;
  updateAnnouncement: (id: string, data: Partial<Announcement>) => void;
  deleteAnnouncement: (id: string) => void;
  markAnnouncementAsRead: (id: string, userKey: string) => void;

  users: UserConfig[];
  setUsers: (users: UserConfig[] | ((prev: UserConfig[]) => UserConfig[])) => void;
  technicians: TechnicianConfig[];
  setTechnicians: (techs: TechnicianConfig[] | ((prev: TechnicianConfig[]) => TechnicianConfig[])) => void;
  auditors: AuditorConfig[];
  setAuditors: (auds: AuditorConfig[] | ((prev: AuditorConfig[]) => AuditorConfig[])) => void;
  
  currentUser: UserConfig | null;
  setCurrentUser: (user: UserConfig | null) => void;
  authLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [monitoringData, setMonitoringData] = useState<MonitoringRecord[]>([]);
  const [fechamentoData, setFechamentoData] = useState<FechamentoRecord[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [importHistory, setImportHistory] = useState<ImportHistoryRecord[]>([]);
  const [rmaData, setRmaData] = useState<RmaRecord[]>([]);

  const [schedulingData, setSchedulingData] = useState<SchedulingRecord[]>([]);
  const [productsBase, setProductsBase] = useState<ProductBaseRecord[]>([]);
  const [productionEntries, setProductionEntries] = useState<ProductionEntry[]>([]);

  const [entradasSetorData, setEntradasSetorData] = useState<EntradaSetorRecord[]>([]);
  const [saidasSetorData, setSaidasSetorData] = useState<SaidaSetorRecord[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const deleteProductionEntry = (id: string) => {
    setProductionEntries(prev => prev.filter(e => e.id !== id));
  };

  const updateProductionEntry = (id: string, data: Partial<ProductionEntry>) => {
    setProductionEntries(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
  };

  const addAnnouncement = (ann: Omit<Announcement, "id" | "created_at"> & { id?: string }) => {
    const newAnn: Announcement = {
      ...ann,
      id: ann.id || `ann-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      created_at: new Date().toISOString(),
      published_at: ann.published_at || (ann.status === "ativo" ? new Date().toISOString() : undefined),
      visualizacoes: ann.visualizacoes || 0,
      lido_por: ann.lido_por || [],
    };
    setAnnouncements(prev => [newAnn, ...(Array.isArray(prev) ? prev : [])]);
  };

  const updateAnnouncement = (id: string, data: Partial<Announcement>) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
  };

  const deleteAnnouncement = (id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  };

  const markAnnouncementAsRead = (id: string, userKey: string) => {
    if (!userKey) return;
    setAnnouncements(prev => prev.map(a => {
      if (a.id === id) {
        const alreadyRead = (a.lido_por || []).includes(userKey);
        if (!alreadyRead) {
          const updatedLido = [...(a.lido_por || []), userKey];
          return {
            ...a,
            lido_por: updatedLido,
            visualizacoes: (a.visualizacoes || 0) + 1,
          };
        }
      }
      return a;
    }));
  };

  const [users, setUsers] = useState<UserConfig[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianConfig[]>([]);
  const [auditors, setAuditors] = useState<AuditorConfig[]>([]);
  
  const [currentUser, setCurrentUser] = useState<UserConfig | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const initialValuesRef = useRef<Record<string, string>>({});

  // Inicializa o banco na NUVEM ao ligar o app
  useEffect(() => {
    const loadSafe = async (key: string, defaultValue: any) => {
        let localData = defaultValue;
        try {
            const localRaw = localStorage.getItem(key);
            if (localRaw) {
                localData = JSON.parse(localRaw);
            }
        } catch (e) {
            console.error("Erro parsing local storage para", key);
        }

        const localCount = Array.isArray(localData) ? localData.length : 0;

        try {
            const { data } = await supabase
                .from('app_store')
                .select('value')
                .eq('key', key)
                .maybeSingle();
                
            if (data && data.value !== null && data.value !== undefined) {
                const parsedData = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
                const cloudCount = Array.isArray(parsedData) ? parsedData.length : 0;

                // REGRA DE OURO: quem tiver MAIS registros vence.
                if (localCount > cloudCount) {
                    supabase.from('app_store').upsert({ key, value: localData }).catch(() => {});
                    return localData;
                }
                if (cloudCount > 0) {
                    try { localStorage.setItem(key, JSON.stringify(parsedData)); } catch(e) { /* quota */ }
                    return parsedData;
                }
                return localData;
            } else if (localCount > 0) {
                supabase.from('app_store').upsert({ key, value: localData }).catch(() => {});
            }
        } catch(e) {
            console.error(`Erro buscando ${key} da nuvem:`, e);
        }
        return localData;
    };

    const initializeDataSystem = async () => {
        const loadedMonitoring = await loadSafe("db_monitoringData", []);
        setMonitoringData(loadedMonitoring);
        initialValuesRef.current["db_monitoringData"] = JSON.stringify(loadedMonitoring);

        const loadedFechamento = await loadSafe("db_fechamentoData", []);
        setFechamentoData(loadedFechamento);
        initialValuesRef.current["db_fechamentoData"] = JSON.stringify(loadedFechamento);

        const loadedAttendance = await loadSafe("db_attendanceData", []);
        setAttendanceData(loadedAttendance);
        initialValuesRef.current["db_attendanceData"] = JSON.stringify(loadedAttendance);

        const loadedImportHistory = await loadSafe("db_importHistory", []);
        setImportHistory(loadedImportHistory);
        initialValuesRef.current["db_importHistory"] = JSON.stringify(loadedImportHistory);

        const loadedRma = await loadSafe("db_rmaData", []);
        setRmaData(loadedRma);
        initialValuesRef.current["db_rmaData"] = JSON.stringify(loadedRma);

        const loadedScheduling = await loadSafe("db_scheduling", []);
        setSchedulingData(loadedScheduling);
        initialValuesRef.current["db_scheduling"] = JSON.stringify(loadedScheduling);

        const loadedProductsBase = await loadSafe("db_products_base", []);
        setProductsBase(loadedProductsBase);
        initialValuesRef.current["db_products_base"] = JSON.stringify(loadedProductsBase);

        const loadedProductionEntries = await loadSafe("db_production_entries", []);
        setProductionEntries(loadedProductionEntries);
        initialValuesRef.current["db_production_entries"] = JSON.stringify(loadedProductionEntries);

        const loadedEntradas = await loadSafe("db_entradasSetor", []);
        setEntradasSetorData(loadedEntradas);
        initialValuesRef.current["db_entradasSetor"] = JSON.stringify(loadedEntradas);

        const loadedSaidas = await loadSafe("db_saidasSetor", []);
        setSaidasSetorData(loadedSaidas);
        initialValuesRef.current["db_saidasSetor"] = JSON.stringify(loadedSaidas);

        const loadedAnnouncements = await loadSafe("db_announcements", []);
        setAnnouncements(loadedAnnouncements);
        initialValuesRef.current["db_announcements"] = JSON.stringify(loadedAnnouncements);

        const loadedTechnicians = await loadSafe("db_technicians", []);
        setTechnicians(loadedTechnicians);
        initialValuesRef.current["db_technicians"] = JSON.stringify(loadedTechnicians);

        // Perfil administrativo fake
        const defaultUsers = [{ 
          id: "mock-id-admin", 
          name: "Administrativo Local", 
          email: "rhikellmyisrael28@gmail.com", 
          password: "", 
          role: "admin", 
          active: true, 
          permissions: [] 
        }];
        const loadedUsers = await loadSafe("db_users", defaultUsers);
        setUsers(loadedUsers);
        initialValuesRef.current["db_users"] = JSON.stringify(loadedUsers);

        // Injeta TESTE COLABORADOR 1 se lista vier vazia
        const loadedAuditors = await loadSafe("db_auditors", []);
        if (loadedAuditors.length === 0) {
            loadedAuditors.push({
                id: "colab-teste-1", 
                name: "TESTE COLABORADOR 1", 
                status: "Ativo",
                tipoEscala: "PADRAO",
                escala: { entrada: "08:00", entradaAlmoco: "12:00", saidaAlmoco: "13:00", saida: "18:00" }
            });
        }
        setAuditors(loadedAuditors);
        initialValuesRef.current["db_auditors"] = JSON.stringify(loadedAuditors);

        // Login persistente
        const mockEmail = localStorage.getItem("mock_auth_email")?.trim().toLowerCase();
        const foundUser = loadedUsers.find((u: UserConfig) => u.email?.trim().toLowerCase() === mockEmail);
        
        if (foundUser) {
            setCurrentUser(foundUser);
        } else if (mockEmail === "rhikellmyisrael28@gmail.com") {
            setCurrentUser(defaultUsers[0]);
        } else {
            setCurrentUser(null);
        }

        setIsLoaded(true);
        setAuthLoading(false);
    };

    initializeDataSystem();
  }, []);

  // Gerador de Comunicados Automáticos de Ranking Mensal (Idempotente & 100% Oficial)
  useEffect(() => {
    if (!isLoaded) return;

    const activeMonth = getLatestActiveMonth(productionEntries, monitoringData);
    if (!activeMonth.monthKey) return;

    const autoId = `auto-ranking-${activeMonth.monthKey}`;
    const alreadyGenerated = announcements.some(
      a => a.id === autoId || (a.is_automatico && a.ranking_ref_date === activeMonth.monthKey)
    );

    const monthlyRanking = calculateOfficialRanking({
      productionEntries,
      monitoringData,
      attendanceData,
      auditors,
      users,
      filterMode: "Mes",
      filterValue: activeMonth.monthKey,
    });

    if (monthlyRanking.length > 0 && monthlyRanking[0].score > 0) {
      const rankData = generateRankingAnnouncementData(monthlyRanking, activeMonth.label);

      if (!alreadyGenerated) {
        const autoAnnouncement: Announcement = {
          id: autoId,
          tipo: "ranking",
          titulo: rankData.titulo,
          mensagem: rankData.mensagem,
          autor: "Sistema SLT",
          autor_foto: rankData.leaderPhoto,
          created_at: new Date().toISOString(),
          published_at: new Date().toISOString(),
          status: "ativo",
          destinatarios: "todos",
          is_automatico: true,
          ranking_ref_date: activeMonth.monthKey,
          prioridade: "alta",
          visualizacoes: 0,
          lido_por: [],
          ranking_leader_name: rankData.firstPlace?.name,
          ranking_leader_photo: rankData.leaderPhoto,
          ranking_leader_score: rankData.firstPlace?.score,
          ranking_runner_up_name: rankData.secondPlace?.name,
          ranking_runner_up_photo: rankData.runnerUpPhoto,
          ranking_runner_up_score: rankData.secondPlace?.score,
          ranking_diff: rankData.diff,
        };

        // Remove any outdated auto-ranking announcements and insert the new official one
        setAnnouncements(prev => [
          autoAnnouncement,
          ...(Array.isArray(prev) ? prev.filter(a => !a.is_automatico) : [])
        ]);
      }
    }
  }, [isLoaded, productionEntries, monitoringData, attendanceData, auditors, users, announcements]);



  // Sincronizadores Dinâmicos para a Nuvem Supabase
  const saveSafe = async (key: string, value: any) => {
      if(!isLoaded) return;
      const strValue = JSON.stringify(value);
      if (strValue === initialValuesRef.current[key]) {
          return;
      }
      initialValuesRef.current[key] = strValue;

      try {
          localStorage.setItem(key, strValue);
      } catch (localErr) {
          console.warn(`[saveSafe] localStorage cheio para ${key}. Salvando apenas na nuvem.`);
      }

      try {
          await supabase.from('app_store').upsert({ key, value });
      } catch (cloudErr) {
          console.error(`[saveSafe] Erro salvando ${key} na nuvem:`, cloudErr);
      }
  };

  useEffect(() => { saveSafe("db_monitoringData", monitoringData); }, [monitoringData, isLoaded]);
  useEffect(() => { saveSafe("db_fechamentoData", fechamentoData); }, [fechamentoData, isLoaded]);
  useEffect(() => { saveSafe("db_attendanceData", attendanceData); }, [attendanceData, isLoaded]);
  useEffect(() => { saveSafe("db_importHistory", importHistory); }, [importHistory, isLoaded]);
  useEffect(() => { saveSafe("db_rmaData", rmaData); }, [rmaData, isLoaded]);

  useEffect(() => { saveSafe("db_scheduling", schedulingData); }, [schedulingData, isLoaded]);
  useEffect(() => { saveSafe("db_products_base", productsBase); }, [productsBase, isLoaded]);
  useEffect(() => { saveSafe("db_production_entries", productionEntries); }, [productionEntries, isLoaded]);
  useEffect(() => { saveSafe("db_entradasSetor", entradasSetorData); }, [entradasSetorData, isLoaded]);
  useEffect(() => { saveSafe("db_saidasSetor", saidasSetorData); }, [saidasSetorData, isLoaded]);
  useEffect(() => { saveSafe("db_announcements", announcements); }, [announcements, isLoaded]);
  useEffect(() => { saveSafe("db_users", users); }, [users, isLoaded]);
  useEffect(() => { saveSafe("db_technicians", technicians); }, [technicians, isLoaded]);
  useEffect(() => { saveSafe("db_auditors", auditors); }, [auditors, isLoaded]);

  // ─── REALTIME: Sincronização em Tempo Real de Comunicados ───────────────────
  // Quando o ADM publicar ou atualizar um comunicado, TODOS os usuários
  // conectados recebem a atualização instantaneamente, sem precisar de F5.
  useEffect(() => {
    if (!isLoaded) return;

    const channel = supabase
      .channel("realtime-announcements")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "app_store",
          filter: "key=eq.db_announcements",
        },
        (payload: any) => {
          try {
            const newValue = payload.new?.value;
            if (!newValue) return;

            // Supabase can return the value as a string or as an already-parsed object
            const parsed: Announcement[] = typeof newValue === "string"
              ? JSON.parse(newValue)
              : newValue;

            if (Array.isArray(parsed)) {
              // Merge: keep automatic announcements generated locally if the remote
              // list doesn't include them yet (avoids flicker on the publishing device)
              setAnnouncements(prev => {
                const remoteIds = new Set(parsed.map((a: Announcement) => a.id));
                const localAutoOnly = Array.isArray(prev)
                  ? prev.filter(a => a.is_automatico && !remoteIds.has(a.id))
                  : [];
                return [...parsed, ...localAutoOnly];
              });

              // Sync local storage so next page load is also up-to-date
              try {
                localStorage.setItem("db_announcements", JSON.stringify(parsed));
              } catch (_) { /* ignore quota errors */ }
            }
          } catch (err) {
            console.warn("[Realtime] Failed to parse announcements update:", err);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLoaded]);
  // ────────────────────────────────────────────────────────────────────────────


  // Sync profile edits
  useEffect(() => {
    if (currentUser && isLoaded) {
      const localProfile = users.find(u => u.email === currentUser.email);
      if (localProfile) {
        if (JSON.stringify(currentUser) !== JSON.stringify(localProfile)) {
          setCurrentUser(localProfile);
        }
      }
    }
  }, [users, currentUser, isLoaded]);

  return (
    <DataContext.Provider value={{ 
      monitoringData, setMonitoringData,
      fechamentoData, setFechamentoData,
      attendanceData, setAttendanceData,
      importHistory, setImportHistory,
      rmaData, setRmaData,

      schedulingData, setSchedulingData,
      productsBase, setProductsBase,
      productionEntries, setProductionEntries, deleteProductionEntry, updateProductionEntry,
      entradasSetorData, setEntradasSetorData,
      saidasSetorData, setSaidasSetorData,
      announcements, setAnnouncements, addAnnouncement, updateAnnouncement, deleteAnnouncement, markAnnouncementAsRead,
      users, setUsers,
      technicians, setTechnicians,
      auditors, setAuditors,
      currentUser, setCurrentUser,
      authLoading
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}
