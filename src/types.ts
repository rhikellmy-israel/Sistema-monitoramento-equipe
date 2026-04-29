export type Module =
  | "import"
  | "monitoring"
  | "discrepancies"
  | "attendance"
  | "ranking"
  | "admin";

export interface Auditor {
  id: string;
  name: string;
  level: string;
  avatar: string;
  score?: number;
  totalOs?: number;
  approvalRate?: number;
  avgTime?: string;
  status?: string;
}

export interface ProductBaseRecord {
  import_id?: string;
  id_produto: string;
  descricao: string;
}

export interface Discrepancy {
  id: string;
  title: string;
  severity: "high" | "medium" | "low";
  description: string;
  date: string;
  auditor: string;
  technician: string;
}

// Novos Modelos (Cadastros Administrativos)
export interface TechnicianConfig {
  id: string;
  name: string;
  status: "Ativo" | "Inativo";
}

export interface HorarioEscala {
  entrada: string;
  saida: string;
  entradaAlmoco: string;
  saidaAlmoco: string;
}

export interface AuditorConfig {
  id: string;
  name: string;
  status: "Ativo" | "Inativo";
  escala: HorarioEscala;
  escalaSexta?: HorarioEscala;
  
  tipoEscala?: "PADRAO" | "ALTERNADA";
  escalaAlternada?: {
    semanaComSabado: {
      segSex: HorarioEscala; // Actually Seg-Qui if standard changes, but leaving named segSex for compatibility
      sabado: HorarioEscala;
    };
    semanaSemSabado: {
      segSex: HorarioEscala;
      sexta?: HorarioEscala;
    };
    dataReferenciaSabadoTrabalhado: string; // "YYYY-MM-DD"
  };
}

export interface UserConfig {
  id: string;
  name: string;
  email?: string;
  password?: string;
  role: "admin" | "viewer" | "gerente" | "estagiario_teste";
  permissions?: string[];
  active: boolean;
  photoUrl?: string;
}

// Ponto Exportado (Excel)
export interface RmaRecord {
  id: string;
  fornecedor: string;
  mes_referencia: string;
  equipamentos: string;
  nfs: string;
  anexos?: { name: string; dataUrl: string }[];
  status: "DAR INICIO" | "EM PROGRESSO" | "FINALIZADO";
  created_at: string;
}

export interface AttendanceRecord {
  DATA_REGISTRO: string | number;
  COLABORADOR: string;
  STATUS: string;
  MINUTOS_ATRASO?: number;
  DIAS_ATESTADO?: number;
  ENTRADA?: string;
  ENTRADA_ALMOÇO?: string;
  SAIDA_ALMOÇO?: string;
  SAIDA?: string;
  OBERVAÇÃO?: string;
}

export interface MaintenanceRecord {
  import_id?: string;
  data_criacao: string;
  almoxarifado_origem: string;
  descricao: string;
  almoxarifado_destino: string;
  produto: string;
  quantidade: number;
  observacao?: string;
  status: string;
  id_almox_destino: string | number;
}

export interface SchedulingRecord {
  import_id?: string;
  data: string;
  tecnico: string;
  horario: string;
  status: string;
  observacao?: string;
}

export interface ProductionEntry {
  id: string;
  user_id: string;
  user_name: string;
  date: string;           // ISO YYYY-MM-DD
  limpos: number;
  testados: number;
  manutencao_equipamento: number;  // +3 pts cada
  manutencao_escada: number;       // +10 pts cada
  atividades: string[];   // Labels selecionadas
  outros: string;         // Campo "Outros" texto livre
  created_at: string;
}
