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

export interface SchedulingRecord {
  import_id?: string;
  data: string;
  tecnico: string;
  horario: string;
  status: string;
  observacao?: string;
}

export const FONT_MODELS = [
  "FONTE 12V 1.0A",
  "FONTE 12V 1.5A",
  "FONTE 12V 2.0A",
  "FONTE 12V 0.5A (grossa)",
  "FONTE 12V 0.5A (fina)",
  "FONTE 12V 0.6A",
  "FONTE 9V 0.85A",
  "FONTE 9V 0.6A",
] as const;

export type FontModelName = typeof FONT_MODELS[number];

export const FONTE_DISCARD_REASONS = [
  "SUJA",
  "MUITA TINTA",
  "QUEIMADA",
  "DESCASCADA",
  "AVARIAS",
] as const;

export type FonteDiscardReason = typeof FONTE_DISCARD_REASONS[number];

export interface FonteModelData {
  aprovadas: number;
  descartadas: number;
  motivos?: Partial<Record<FonteDiscardReason, number>>;
  isCustom?: boolean;
  customName?: string;
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
  fontes_aprovadas?: number;       // +0.5 pts cada (soma de aprovadas)
  fontes_descarte?: number;        // +0 pts (soma de descartadas)
  tipo_relatorio?: "equipamentos" | "fontes";
  fontes_modelos?: Record<string, FonteModelData>;
  atividades_extras?: string[];    // Sucata, Conserto Minas, RMA
  atividades: string[];   // Labels selecionadas
  outros: string;         // Campo "Outros" texto livre
  created_at: string;
}

export interface EntradaSetorRecord {
  import_id?: string;
  data_criacao: string;
  nome: string;
  almoxarifado_origem: string;
  descricao: string;
  almoxarifado_destino: string;
  descricao_produto: string;
  quantidade: number;
}

export interface SaidaSetorRecord {
  id: string;
  import_id?: string;
  data_criacao: string;
  produto: string;
  descricao_produto: string;
  quantidade: number;
  almoxarifado_origem: string;
  almoxarifado_destino: string;
  observacao?: string;
  nome: string;
}

export type AnnouncementType = "ranking" | "informativo" | "importante";
export type AnnouncementStatus = "ativo" | "agendado" | "arquivado" | "rascunho";

export interface Announcement {
  id: string;
  tipo: AnnouncementType;
  titulo: string;
  mensagem: string;
  autor: string;
  autor_foto?: string;
  created_at: string;
  published_at?: string;
  status: AnnouncementStatus;
  data_inicio?: string;
  data_fim?: string;
  destinatarios: string; // "todos" | "estagiario_teste" | "admin" | "gerente" | "viewer" | etc.
  is_automatico: boolean;
  ranking_ref_date?: string; // e.g. "2026-08-20" para idempotência de ranking diário
  prioridade?: "alta" | "media" | "baixa";
  lido_por?: string[]; // IDs/emails que já visualizaram
  visualizacoes?: number;
  // Metadados do Ranking Oficial
  ranking_leader_name?: string;
  ranking_leader_photo?: string;
  ranking_leader_score?: number;
  ranking_runner_up_name?: string;
  ranking_runner_up_photo?: string;
  ranking_runner_up_score?: number;
  ranking_diff?: number;
}


