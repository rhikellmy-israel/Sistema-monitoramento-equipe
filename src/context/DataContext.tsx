import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { AttendanceRecord, AuditorConfig, TechnicianConfig, UserConfig } from "../types";
import { supabase } from "../lib/supabase";

export interface MonitoringRecord {
  "DATA/HORA_ABERTURA": string | number;
  STATUS_MENSAGEM_OS: string;
  ID_CLIENTE: string | number;
  CLIENTE: string;
  ASSUNTO_SERVIÇO_REALIZADO?: string;
  AUDITOR: string;
  TECNICO?: string;
  ASSUNTO_OS: string;
  DIAGNOSTICO_MENSAGEM_OS: string;
  MENSAGEM_OS?: string;
  PROXIMA_TAREFA?: string;
  "DATA/HORA_FECHAMENTO": string | number;
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
  setMonitoringData: (data: MonitoringRecord[]) => void;
  discrepanciesData: MonitoringRecord[];
  setDiscrepanciesData: (data: MonitoringRecord[]) => void;
  attendanceData: AttendanceRecord[];
  setAttendanceData: (data: AttendanceRecord[]) => void;
  importHistory: ImportHistoryRecord[];
  setImportHistory: (data: ImportHistoryRecord[]) => void;
  
  // Registries
  users: UserConfig[];
  setUsers: (users: UserConfig[]) => void;
  technicians: TechnicianConfig[];
  setTechnicians: (techs: TechnicianConfig[]) => void;
  auditors: AuditorConfig[];
  setAuditors: (auds: AuditorConfig[]) => void;
  
  // Auth state
  currentUser: UserConfig | null;
  setCurrentUser: (user: UserConfig | null) => void;
  authLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);



const DEFAULT_USERS: UserConfig[] = [
    { id: "1", name: "Administrador Master", email: "admin@empresa.com", password: "admin", role: "admin", active: true },
    { id: "2", name: "Gabriel Santos", email: "gabriel@empresa.com", password: "123", role: "admin", active: true },
    { id: "3", name: "Visualizador Padrão", email: "viewer@empresa.com", password: "123", role: "viewer", active: true }
];

export function DataProvider({ children }: { children: ReactNode }) {
  const [monitoringData, setMonitoringData] = useState<MonitoringRecord[]>([]);
  const [discrepanciesData, setDiscrepanciesData] = useState<MonitoringRecord[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [importHistory, setImportHistory] = useState<ImportHistoryRecord[]>([]);

  // Supabase fetched states
  const [users, setUsers] = useState<UserConfig[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianConfig[]>([]);
  const [auditors, setAuditors] = useState<AuditorConfig[]>([]);
  
  // Supabase Auth State
  const [currentUser, setCurrentUser] = useState<UserConfig | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const fetchAllRows = async (table: string, limitAmt: number = 200000) => {
    let allRows: any[] = [];
    let from = 0;
    const step = 1000;
    while (from < limitAmt) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, from + step - 1);
      
      if (error || !data) break;
      allRows = allRows.concat(data);
      if (data.length < step) break;
      from += step;
    }
    return allRows;
  };

  const loadSupabaseData = async () => {
    const [
      { data: usersData }, 
      { data: techsData }, 
      { data: audsData },
      { data: historyData },
      monitoringDataRes,
      discrepanciesDataRes,
      attendanceDataRes
    ] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('technicians').select('*'),
      supabase.from('auditors').select('*'),
      supabase.from('import_history').select('*, users!imported_by(name, email)').order('created_at', { ascending: false }).limit(50),
      fetchAllRows('monitoring_records'),
      fetchAllRows('discrepancies_records'),
      fetchAllRows('attendance_records')
    ]);

    if (historyData) setImportHistory(historyData as any[]);
    if (monitoringDataRes) setMonitoringData(monitoringDataRes.map(mapSupabaseToLocal) as any[]);
    if (discrepanciesDataRes) setDiscrepanciesData(discrepanciesDataRes.map(mapSupabaseToLocal) as any[]);
    if (attendanceDataRes) setAttendanceData(attendanceDataRes as any[]);

    if (usersData) {
      setUsers(usersData.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        active: u.active,
        permissions: u.permissions || [],
        photoUrl: u.photo_url
      })));
    }

    if (techsData) {
      setTechnicians(techsData.map(t => ({
        id: t.id,
        name: t.name,
        status: t.status
      })));
    }

    if (audsData) {
      setAuditors(audsData.map(a => ({
        id: a.id,
        name: a.name,
        status: a.status,
        tipoEscala: a.tipo_escala,
        escala: a.escala,
        escalaSexta: a.escala_sexta,
        escalaAlternada: a.escala_alternada
      })));
    }
  };

  useEffect(() => {
    // Busca a sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser({
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email?.split("@")[0] || "Usuário",
          email: session.user.email || "",
          password: "",
          role: "admin",
          active: true,
          permissions: []
        });
        loadSupabaseData(); // Carrega o banco real quando loga
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });

    // Escuta mudanças (login, logout, etc)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser({
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email?.split("@")[0] || "Usuário",
          email: session.user.email || "",
          password: "",
          role: "admin",
          active: true,
          permissions: []
        });
        loadSupabaseData(); // Recarrega se a sessao mudar
      } else {
        setCurrentUser(null);
        // Clear data on logout
        setUsers([]);
        setTechnicians([]);
        setAuditors([]);
      }
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // WebSockets Real-time for Import History and Records Sync
  useEffect(() => {
    const channel = supabase.channel('realtime-imports')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'import_history' },
        () => {
          // Quando houver insert, update ou delete em import_history, re-carregamos a base
          loadSupabaseData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const mapSupabaseToLocal = (row: any): Partial<MonitoringRecord> => ({
    "DATA/HORA_ABERTURA": row.data_hora_abertura,
    "STATUS_MENSAGEM_OS": row.status_mensagem_os,
    "ID_CLIENTE": row.id_cliente,
    "CLIENTE": row.cliente,
    "ASSUNTO_SERVIÇO_REALIZADO": row.assunto_servico_realizado,
    "AUDITOR": row.auditor,
    "TECNICO": row.tecnico,
    "ASSUNTO_OS": row.assunto_os,
    "DIAGNOSTICO_MENSAGEM_OS": row.diagnostico_mensagem_os,
    "MENSAGEM_OS": row.mensagem_os,
    "PROXIMA_TAREFA": row.proxima_tarefa,
    "DATA/HORA_FECHAMENTO": row.data_hora_fechamento,
  });

  // Sync currentUser with local updates (like photoUrl, roles, etc)
  useEffect(() => {
    if (currentUser) {
      const localProfile = users.find(u => u.email === currentUser.email);
      if (localProfile) {
        if (JSON.stringify(currentUser) !== JSON.stringify(localProfile)) {
          setCurrentUser(localProfile);
        }
      }
    }
  }, [users, currentUser]);

  return (
    <DataContext.Provider value={{ 
      monitoringData, setMonitoringData,
      discrepanciesData, setDiscrepanciesData,
      attendanceData, setAttendanceData,
      importHistory, setImportHistory,
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
