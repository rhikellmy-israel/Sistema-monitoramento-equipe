import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from "react";
import { AttendanceRecord, AuditorConfig, TechnicianConfig, UserConfig, RmaRecord, MaintenanceRecord, SchedulingRecord, ProductBaseRecord, ProductionEntry } from "../types";
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
  
  maintenanceInData: MaintenanceRecord[];
  setMaintenanceInData: (data: MaintenanceRecord[] | ((prev: MaintenanceRecord[]) => MaintenanceRecord[])) => void;
  maintenanceOutData: MaintenanceRecord[];
  setMaintenanceOutData: (data: MaintenanceRecord[] | ((prev: MaintenanceRecord[]) => MaintenanceRecord[])) => void;
  schedulingData: SchedulingRecord[];
  setSchedulingData: (data: SchedulingRecord[] | ((prev: SchedulingRecord[]) => SchedulingRecord[])) => void;
  productsBase: ProductBaseRecord[];
  setProductsBase: (data: ProductBaseRecord[] | ((prev: ProductBaseRecord[]) => ProductBaseRecord[])) => void;
  productionEntries: ProductionEntry[];
  setProductionEntries: (data: ProductionEntry[] | ((prev: ProductionEntry[]) => ProductionEntry[])) => void;
  deleteProductionEntry: (id: string) => void;
  updateProductionEntry: (id: string, data: Partial<ProductionEntry>) => void;
  
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
  const [maintenanceInData, setMaintenanceInData] = useState<MaintenanceRecord[]>([]);
  const [maintenanceOutData, setMaintenanceOutData] = useState<MaintenanceRecord[]>([]);
  const [schedulingData, setSchedulingData] = useState<SchedulingRecord[]>([]);
  const [productsBase, setProductsBase] = useState<ProductBaseRecord[]>([]);
  const [productionEntries, setProductionEntries] = useState<ProductionEntry[]>([]);

  const deleteProductionEntry = (id: string) => {
    setProductionEntries(prev => prev.filter(e => e.id !== id));
  };

  const updateProductionEntry = (id: string, data: Partial<ProductionEntry>) => {
    setProductionEntries(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
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

        try {
            const { data, error } = await supabase
                .from('app_store')
                .select('value')
                .eq('key', key)
                .single();
                
            if (data && data.value) {
                const parsedData = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
                localStorage.setItem(key, JSON.stringify(parsedData));
                return parsedData;
            }
        } catch(e) {
            console.error(`Erro buscando ${key}:`, e);
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

        const loadedMaintenanceIn = await loadSafe("db_maintenance_in", []);
        setMaintenanceInData(loadedMaintenanceIn);
        initialValuesRef.current["db_maintenance_in"] = JSON.stringify(loadedMaintenanceIn);

        const loadedMaintenanceOut = await loadSafe("db_maintenance_out", []);
        setMaintenanceOutData(loadedMaintenanceOut);
        initialValuesRef.current["db_maintenance_out"] = JSON.stringify(loadedMaintenanceOut);

        const loadedScheduling = await loadSafe("db_scheduling", []);
        setSchedulingData(loadedScheduling);
        initialValuesRef.current["db_scheduling"] = JSON.stringify(loadedScheduling);

        const loadedProductsBase = await loadSafe("db_products_base", []);
        setProductsBase(loadedProductsBase);
        initialValuesRef.current["db_products_base"] = JSON.stringify(loadedProductsBase);

        const loadedProductionEntries = await loadSafe("db_production_entries", []);
        setProductionEntries(loadedProductionEntries);
        initialValuesRef.current["db_production_entries"] = JSON.stringify(loadedProductionEntries);

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

  // Sincronizadores Dinâmicos para a Nuvem Supabase
  const saveSafe = async (key: string, value: any) => {
      if(!isLoaded) return;
      const strValue = JSON.stringify(value);
      if (strValue === initialValuesRef.current[key]) {
          // No changes since initial load, skip saving
          return;
      }
      try {
          localStorage.setItem(key, strValue);
          await supabase.from('app_store').upsert({ key, value });
          initialValuesRef.current[key] = strValue;
      } catch (err) {
          console.error(`Erro salvando ${key} na nuvem:`, err);
      }
  };

  useEffect(() => { saveSafe("db_monitoringData", monitoringData); }, [monitoringData, isLoaded]);
  useEffect(() => { saveSafe("db_fechamentoData", fechamentoData); }, [fechamentoData, isLoaded]);
  useEffect(() => { saveSafe("db_attendanceData", attendanceData); }, [attendanceData, isLoaded]);
  useEffect(() => { saveSafe("db_importHistory", importHistory); }, [importHistory, isLoaded]);
  useEffect(() => { saveSafe("db_rmaData", rmaData); }, [rmaData, isLoaded]);
  useEffect(() => { saveSafe("db_maintenance_in", maintenanceInData); }, [maintenanceInData, isLoaded]);
  useEffect(() => { saveSafe("db_maintenance_out", maintenanceOutData); }, [maintenanceOutData, isLoaded]);
  useEffect(() => { saveSafe("db_scheduling", schedulingData); }, [schedulingData, isLoaded]);
  useEffect(() => { saveSafe("db_products_base", productsBase); }, [productsBase, isLoaded]);
  useEffect(() => { saveSafe("db_production_entries", productionEntries); }, [productionEntries, isLoaded]);
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
      maintenanceInData, setMaintenanceInData,
      maintenanceOutData, setMaintenanceOutData,
      schedulingData, setSchedulingData,
      productsBase, setProductsBase,
      productionEntries, setProductionEntries, deleteProductionEntry, updateProductionEntry,
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
