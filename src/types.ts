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
  role: "admin" | "viewer" | "gerente";
  permissions?: string[];
  active: boolean;
  photoUrl?: string;
}

// Ponto Exportado (Excel)
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
