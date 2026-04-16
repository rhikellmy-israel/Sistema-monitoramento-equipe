import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { AttendanceRecord, AuditorConfig, TechnicianConfig, UserConfig, RmaRecord } from "../types";
import { supabase } from "../lib/supabase";

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

  const [users, setUsers] = useState<UserConfig[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianConfig[]>([]);
  const [auditors, setAuditors] = useState<AuditorConfig[]>([]);
  
  const [currentUser, setCurrentUser] = useState<UserConfig | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  // Inicializa o banco na NUVEM ao ligar o app
  useEffect(() => {
    const loadSafe = async (key: string, defaultValue: any) => {
        try {
            const { data, error } = await supabase
                .from('app_store')
                .select('value')
                .eq('key', key)
                .single();
                
            if (data && data.value) {
                // Parsing depends on how JSONB was stringified, usually it returns the parsed object if stored carefully.
                // Supabase returning JSONB will yield object directly. 
                // We double check if it's string (fallback)
                if (typeof data.value === 'string') return JSON.parse(data.value);
                return data.value;
            }
        } catch(e) {
            console.error(`Erro buscando ${key}:`, e);
        }
        return defaultValue;
    };

    const initializeDataSystem = async () => {
        setMonitoringData(await loadSafe("db_monitoringData", []));
        setFechamentoData(await loadSafe("db_fechamentoData", []));
        setAttendanceData(await loadSafe("db_attendanceData", []));
        setImportHistory(await loadSafe("db_importHistory", []));
        setRmaData(await loadSafe("db_rmaData", []));
        setTechnicians(await loadSafe("db_technicians", []));

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

        // Injeta TESTE COLABORADOR 1 se lista vier vazia
        const localAuditors = await loadSafe("db_auditors", []);
        if (localAuditors.length === 0) {
            localAuditors.push({
                id: "colab-teste-1", 
                name: "TESTE COLABORADOR 1", 
                status: "Ativo",
                tipoEscala: "PADRAO",
                escala: { entrada: "08:00", entradaAlmoco: "12:00", saidaAlmoco: "13:00", saida: "18:00" }
            });
        }
        setAuditors(localAuditors);

        // Login persistente
        const mockEmail = localStorage.getItem("mock_auth_email");
        const foundUser = loadedUsers.find((u: UserConfig) => u.email === mockEmail);
        
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

  // Sincronizadores Dinâmicos para a Nuvem Supabase
  const saveSafe = async (key: string, value: any) => {
      if(!isLoaded) return;
      try {
          await supabase.from('app_store').upsert({ key, value });
      } catch (err) {
          console.error(`Erro salvando ${key} na nuvem:`, err);
      }
  };

  useEffect(() => { saveSafe("db_monitoringData", monitoringData); }, [monitoringData, isLoaded]);
  useEffect(() => { saveSafe("db_fechamentoData", fechamentoData); }, [fechamentoData, isLoaded]);
  useEffect(() => { saveSafe("db_attendanceData", attendanceData); }, [attendanceData, isLoaded]);
  useEffect(() => { saveSafe("db_importHistory", importHistory); }, [importHistory, isLoaded]);
  useEffect(() => { saveSafe("db_rmaData", rmaData); }, [rmaData, isLoaded]);
  useEffect(() => { saveSafe("db_users", users); }, [users, isLoaded]);
  useEffect(() => { saveSafe("db_technicians", technicians); }, [technicians, isLoaded]);
  useEffect(() => { saveSafe("db_auditors", auditors); }, [auditors, isLoaded]);

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
