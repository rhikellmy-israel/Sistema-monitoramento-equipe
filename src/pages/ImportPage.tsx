import React, { useState } from "react";
import {
  FileText,
  Info,
  Upload,
  CheckCircle2,
  ChevronRight,
  Users,
  AlertTriangle,
  Clock,
  XCircle,
  Loader2,
  Trash2,
  PenTool,
  Calendar
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { useData } from "../context/DataContext";
import { supabase } from "../lib/supabase";
import { normalizeDateToISO } from "../lib/dateUtils";

const MONITORING_COLUMNS = [
  "DIA DA SEMANA",
  "DATA",
  "FUNCIONÁRIO",
  "LIMPOS",
  "TESTADOS",
  "OBSERVAÇÃO"
];

const FECHAMENTO_COLUMNS = [
  "DATA DA CRIAÇÃO",
  "PRODUTO",
  "DESCRIÇÃO",
  "MAC",
  "ALMOXARIFADO ORIGEM",
  "ALMOXARIFADO DESTINO",
  "SITUAÇÃO",
  "ID ALMOXARIFADO",
  "DATA DE CONFIRMAÇÃO",
  "OBSERVAÇÃO"
];

const ATTENDANCE_COLUMNS = [
  "DATA_REGISTRO",
  "COLABORADOR",
  "STATUS",
  "ENTRADA",
  "ENTRADA_ALMOÇO",
  "SAIDA_ALMOÇO",
  "SAIDA",
  "OBERVAÇÃO"
];

const MAINTENANCE_COLUMNS = [
  "DATA DA CRIAÇÃO",
  "ALMOXARIFADO ORIGEM",
  "DESCRIÇÃO",
  "ALMOXARIFADO DESTINO",
  "PRODUTO",
  "QUANTIDADE",
  "OBSERVAÇÃO",
  "STATUS",
  "ID ALMOXARIFADO"
];

const SCHEDULING_COLUMNS = [
  "DATA",
  "TÉCNICO",
  "HORÁRIO",
  "STATUS",
  "OBSERVAÇÃO"
];

type ImportType = "monitoring" | "fechamento" | "attendance" | "maintenance_in" | "maintenance_out" | "scheduling";

export default function ImportPage() {
  const navigate = useNavigate();
  const { setMonitoringData, setFechamentoData, setAttendanceData, setMaintenanceInData, setMaintenanceOutData, setSchedulingData, currentUser, importHistory, setImportHistory } = useData();
  const [importType, setImportType] = useState<ImportType>("monitoring");
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "validating" | "success" | "error"
  >("idle");
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [tempParsedData, setTempParsedData] = useState<any[]>([]);
  const [showStructure, setShowStructure] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setUploadStatus("validating");
    setErrorDetails([]);
    setShowStructure(false);

    const reader = new FileReader();
    reader.onload = (evt) => {
      setTimeout(() => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          const rawJsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          const rawHeaders = rawJsonData[0] as string[];

          if (!rawHeaders || rawHeaders.length === 0) {
            setUploadStatus("error");
            setErrorDetails([
              "O arquivo está vazio ou não possui cabeçalhos na primeira linha.",
            ]);
            return;
          }

          const normalizeStr = (str: string) => {
            if (!str || typeof str !== 'string') return '';
            return str
              .toUpperCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "") // remove accents
              .trim()
              .replace("DADOS/HORA", "DATA/HORA"); // Map user's spreadsheet typo "DADOS" safely to internal "DATA" expectation
          };

          let expectedColumns: string[] = [];
          if (importType === "monitoring") expectedColumns = MONITORING_COLUMNS;
          else if (importType === "fechamento")
            expectedColumns = FECHAMENTO_COLUMNS;
          else if (importType === "attendance")
            expectedColumns = ATTENDANCE_COLUMNS;
          else if (importType === "maintenance_in" || importType === "maintenance_out")
            expectedColumns = MAINTENANCE_COLUMNS;
          else if (importType === "scheduling")
            expectedColumns = SCHEDULING_COLUMNS;

          // Build a mapping from normalized Excel header to original Raw Excel header
          const normalizedExcelHeadersMap = new Map<string, string>();
          rawHeaders.forEach(h => {
             normalizedExcelHeadersMap.set(normalizeStr(h), h);
          });

          const missingColumns: string[] = [];
          
          expectedColumns.forEach(col => {
             const normCol = normalizeStr(col);
             if (!normalizedExcelHeadersMap.has(normCol)) {
                missingColumns.push(col);
             }
          });

          if (missingColumns.length > 0 && expectedColumns.length > 0) {
            setUploadStatus("error");
            setErrorDetails(missingColumns);
          } else {
            setUploadStatus("success");
            if (["monitoring", "fechamento", "maintenance_in", "maintenance_out", "scheduling", "attendance"].includes(importType)) {
              const dataObjects = XLSX.utils.sheet_to_json(worksheet, {
                raw: false,
                dateNF: "dd/mm/yyyy",
              });
              
              // Normalize keys in the final objects match exactly what the system expects
              const mappedObjects = dataObjects.map((row: any) => {
                 const newRow: any = {};
                 expectedColumns.forEach(col => {
                    const normCol = normalizeStr(col);
                    const originalExcelHeader = normalizedExcelHeadersMap.get(normCol);
                    if (originalExcelHeader && originalExcelHeader in row) {
                       newRow[col] = row[originalExcelHeader];
                    }
                 });
                 // Also copy over other generic rows just in case
                 Object.keys(row).forEach(k => {
                    const normK = normalizeStr(k);
                    const isExpected = expectedColumns.some(c => normalizeStr(c) === normK);
                    if (!isExpected) newRow[k] = row[k];
                 });
                 return newRow;
              });

              setTempParsedData(mappedObjects);
            }
          }
        } catch (error) {
          setUploadStatus("error");
          setErrorDetails([
            "Erro ao processar o arquivo. Certifique-se de que é um Excel válido (.xlsx)",
          ]);
        }
      }, 150);
    };
    reader.readAsArrayBuffer(file);
    // Reset input
    e.target.value = "";
  };

  const handleSaveAndStart = async () => {
    if (uploadStatus === "success") {
      setUploadStatus("validating"); // Reutiliza este state para dar a sensação de loading ("Salvando...")
      
      setTimeout(() => {
          try {
              const importId = "imp-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5);
              
              setImportHistory((prev: any) => [{
                id: importId,
                file_name: fileName,
                module: importType,
                imported_by: currentUser?.id || "local",
                created_at: new Date().toISOString()
              }, ...(Array.isArray(prev) ? prev : [])]);

              const payload = tempParsedData.map(row => {
                  if (importType === "monitoring") {
                     return {
                         import_id: importId,
                         dia_da_semana: row["DIA DA SEMANA"] ? String(row["DIA DA SEMANA"]) : null,
                         data_registro: row["DATA"] ? normalizeDateToISO(row["DATA"]) : null,
                         funcionario: row["FUNCIONÁRIO"] ? String(row["FUNCIONÁRIO"]) : null,
                         limpos: row["LIMPOS"] ? Number(row["LIMPOS"]) || 0 : 0,
                         testados: row["TESTADOS"] ? Number(row["TESTADOS"]) || 0 : 0,
                         observacao: row["OBSERVAÇÃO"] ? String(row["OBSERVAÇÃO"]) : null,
                     };
                  }
                  if (importType === "maintenance_in" || importType === "maintenance_out") {
                      return {
                          import_id: importId,
                          data_criacao: row["DATA DA CRIAÇÃO"] ? normalizeDateToISO(row["DATA DA CRIAÇÃO"]) : null,
                          almoxarifado_origem: row["ALMOXARIFADO ORIGEM"] || "",
                          descricao: row["DESCRIÇÃO"] || "",
                          almoxarifado_destino: row["ALMOXARIFADO DESTINO"] || "",
                          produto: row["PRODUTO"] || "",
                          quantidade: Number(row["QUANTIDADE"]) || 0,
                          observacao: row["OBSERVAÇÃO"] || "",
                          status: row["STATUS"] || "",
                          id_almox_destino: row["ID ALMOXARIFADO"] || ""
                      };
                  }
                  if (importType === "scheduling") {
                      return {
                          import_id: importId,
                          data: row["DATA"] ? normalizeDateToISO(row["DATA"]) : null,
                          tecnico: row["TÉCNICO"] || "",
                          horario: row["HORÁRIO"] || "",
                          status: row["STATUS"] || "",
                          observacao: row["OBSERVAÇÃO"] || ""
                      };
                  }
                  return {
                     import_id: importId,
                     data_criacao: row["DATA DA CRIAÇÃO"] ? normalizeDateToISO(row["DATA DA CRIAÇÃO"]) : null,
                     produto: row["PRODUTO"] || "",
                     descricao: row["DESCRIÇÃO"] || "",
                     mac: row["MAC"] || "",
                     almoxarifado_origem: row["ALMOXARIFADO ORIGEM"] || "",
                     almoxarifado_destino: row["ALMOXARIFADO DESTINO"] || "",
                     situacao: row["SITUAÇÃO"] || "",
                     id_almoxarifado: row["ID ALMOXARIFADO"] || "",
                     data_confirmacao: row["DATA DE CONFIRMAÇÃO"] ? normalizeDateToISO(row["DATA DE CONFIRMAÇÃO"]) : null,
                     observacao: row["OBSERVAÇÃO"] || ""
                  };
              });

              if (importType === "monitoring") {
                   setMonitoringData((prev: any) => [...payload, ...(Array.isArray(prev) ? prev : [])]);
                   navigate("/dashboard");
              } else if (importType === "fechamento") {
                   setFechamentoData((prev: any) => [...payload, ...(Array.isArray(prev) ? prev : [])]);
                   navigate("/fechamento");
              } else if (importType === "maintenance_in") {
                   const filtered = payload.filter((r: any) => String(r.id_almox_destino) === "632");
                   setMaintenanceInData((prev: any) => [...filtered, ...(Array.isArray(prev) ? prev : [])]);
                   navigate("/maintenance");
              } else if (importType === "maintenance_out") {
                   const allowedIds = ["559", "15", "335", "65"];
                   const filtered = payload.filter((r: any) => allowedIds.includes(String(r.id_almox_destino)));
                   setMaintenanceOutData((prev: any) => [...filtered, ...(Array.isArray(prev) ? prev : [])]);
                   navigate("/maintenance");
              } else if (importType === "scheduling") {
                   setSchedulingData((prev: any) => [...payload, ...(Array.isArray(prev) ? prev : [])]);
                   navigate("/maintenance");
              }
          } catch (e: any) {
              console.error(e);
              alert("Erro grave ao salvar os dados locais: " + e.message);
              setUploadStatus("error");
          }
      }, 50);
    }
  };

  const handleDeleteHistory = async (id: string, fileNameDelete: string) => {
    const confirm = window.confirm(`Tem certeza que deseja excluir em lote o arquivo "${fileNameDelete}"? Isso removerá os registros importados desta carga instantaneamente e afetará as visualizações de todos os usuários.`);
    if (!confirm) return;

    setMonitoringData((prev: any) => prev.filter((r: any) => r.import_id !== id));
    setFechamentoData((prev: any) => prev.filter((r: any) => r.import_id !== id));
    setAttendanceData((prev: any) => prev.filter((r: any) => r.import_id !== id));
    setMaintenanceInData((prev: any) => prev.filter((r: any) => r.import_id !== id));
    setMaintenanceOutData((prev: any) => prev.filter((r: any) => r.import_id !== id));
    setSchedulingData((prev: any) => prev.filter((r: any) => r.import_id !== id));
    setImportHistory((prev: any) => prev.filter((r: any) => r.id !== id));
  };

  const renderStatusIcon = () => {
    switch (uploadStatus) {
      case "idle":
        return <Upload className="w-6 h-6 text-slate-400" />;
      case "validating":
        return <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />;
      case "success":
        return <CheckCircle2 className="w-6 h-6 text-tertiary" />;
      case "error":
        return <XCircle className="w-6 h-6 text-error" />;
    }
  };

  const renderStatusText = () => {
    switch (uploadStatus) {
      case "idle":
        return "Aguardando...";
      case "validating":
        return "Validando...";
      case "success":
        return "Sucesso!";
      case "error":
        return "Falha na Validação";
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <p className="text-sm font-medium text-indigo-700 flex items-center gap-2">
            <FileText className="w-4 h-4" /> Auditoria Ativa
          </p>
          <h1 className="text-4xl font-headline font-extrabold text-primary tracking-tight">
            Importação de Dados
          </h1>
        </div>

        <div
          className={`bg-surface-container-lowest px-6 py-4 rounded-xl shadow-sm border flex items-center gap-4 transition-colors ${
            uploadStatus === "success"
              ? "border-tertiary-fixed"
              : uploadStatus === "error"
                ? "border-error/50"
                : "border-outline-variant/10"
          }`}
        >
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              uploadStatus === "success"
                ? "bg-tertiary-fixed/20 text-tertiary"
                : uploadStatus === "error"
                  ? "bg-error-container text-error"
                  : uploadStatus === "validating"
                    ? "bg-indigo-50 text-indigo-500"
                    : "bg-slate-100 text-slate-400"
            }`}
          >
            {renderStatusIcon()}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-tighter text-slate-500">
              Status da Carga
            </p>
            <p
              className={`text-2xl font-headline font-bold ${
                uploadStatus === "success"
                  ? "text-tertiary"
                  : uploadStatus === "error"
                    ? "text-error"
                    : "text-slate-700"
              }`}
            >
              {renderStatusText()}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <section className="bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-outline-variant/10 flex flex-col gap-6">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-headline font-bold text-primary">
                  Configuração
                </h2>
                <Info className="w-5 h-5 text-primary cursor-help" />
              </div>
              <FileText className="w-6 h-6 text-slate-300" />
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block">
                Tipo de Importação
              </label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => setImportType("monitoring")}
                  className={`flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                    importType === "monitoring"
                      ? "border-2 border-primary bg-primary/5"
                      : "border border-outline-variant/30 hover:border-primary/50 group"
                  }`}
                >
                  <Users
                    className={`w-5 h-5 ${importType === "monitoring" ? "text-primary" : "text-slate-400 group-hover:text-primary"}`}
                  />
                  <div>
                    <p
                      className={`text-xs font-bold uppercase tracking-tight ${importType === "monitoring" ? "text-primary" : "text-slate-700"}`}
                    >
                      Monitoramento da Equipe
                    </p>
                    <p
                      className={`text-[10px] ${importType === "monitoring" ? "text-slate-500 italic" : "text-slate-400"}`}
                    >
                      Eficiência Operacional
                    </p>
                  </div>
                  <div
                    className={`ml-auto w-4 h-4 rounded-full ${importType === "monitoring" ? "border-4 border-primary" : "border border-slate-300"}`}
                  />
                </button>

                <button
                  onClick={() => setImportType("fechamento")}
                  className={`flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                    importType === "fechamento"
                      ? "border-2 border-primary bg-primary/5"
                      : "border border-outline-variant/30 hover:border-primary/50 group"
                  }`}
                >
                  <AlertTriangle
                    className={`w-5 h-5 ${importType === "fechamento" ? "text-primary" : "text-slate-400 group-hover:text-primary"}`}
                  />
                  <div>
                    <p
                      className={`text-xs font-bold uppercase tracking-tight ${importType === "fechamento" ? "text-primary" : "text-slate-700"}`}
                    >
                      Fechamento Mês
                    </p>
                    <p
                      className={`text-[10px] ${importType === "fechamento" ? "text-slate-500 italic" : "text-slate-400"}`}
                    >
                      Movimentação Setorial
                    </p>
                  </div>
                  <div
                    className={`ml-auto w-4 h-4 rounded-full ${importType === "fechamento" ? "border-4 border-primary" : "border border-slate-300"}`}
                  />
                </button>

                <button
                  onClick={() => setImportType("maintenance_in")}
                  className={`flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                    importType === "maintenance_in"
                      ? "border-2 border-primary bg-primary/5"
                      : "border border-outline-variant/30 hover:border-primary/50 group"
                  }`}
                >
                  <PenTool
                    className={`w-5 h-5 ${importType === "maintenance_in" ? "text-primary" : "text-slate-400 group-hover:text-primary"}`}
                  />
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-tight ${importType === "maintenance_in" ? "text-primary" : "text-slate-700"}`}>
                      Entrada Manutenção
                    </p>
                  </div>
                  <div className={`ml-auto w-4 h-4 rounded-full ${importType === "maintenance_in" ? "border-4 border-primary" : "border border-slate-300"}`} />
                </button>

                <button
                  onClick={() => setImportType("maintenance_out")}
                  className={`flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                    importType === "maintenance_out"
                      ? "border-2 border-primary bg-primary/5"
                      : "border border-outline-variant/30 hover:border-primary/50 group"
                  }`}
                >
                  <PenTool
                    className={`w-5 h-5 ${importType === "maintenance_out" ? "text-primary" : "text-slate-400 group-hover:text-primary"}`}
                  />
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-tight ${importType === "maintenance_out" ? "text-primary" : "text-slate-700"}`}>
                      Saída Manutenção
                    </p>
                  </div>
                  <div className={`ml-auto w-4 h-4 rounded-full ${importType === "maintenance_out" ? "border-4 border-primary" : "border border-slate-300"}`} />
                </button>

                <button
                  onClick={() => setImportType("scheduling")}
                  className={`flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                    importType === "scheduling"
                      ? "border-2 border-primary bg-primary/5"
                      : "border border-outline-variant/30 hover:border-primary/50 group"
                  }`}
                >
                  <Calendar
                    className={`w-5 h-5 ${importType === "scheduling" ? "text-primary" : "text-slate-400 group-hover:text-primary"}`}
                  />
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-tight ${importType === "scheduling" ? "text-primary" : "text-slate-700"}`}>
                      Relatório de Agendamentos
                    </p>
                  </div>
                  <div className={`ml-auto w-4 h-4 rounded-full ${importType === "scheduling" ? "border-4 border-primary" : "border border-slate-300"}`} />
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
                Upload do Arquivo
              </h3>
              <div className="group relative bg-surface-container-highest/50 border-2 border-dashed border-outline-variant/30 rounded-xl p-8 text-center transition-all hover:bg-indigo-50 hover:border-indigo-200">
                <Upload className="w-10 h-10 text-slate-400 group-hover:text-primary transition-colors mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-600 mb-1">
                  Arraste a planilha (.xls, .xlsx)
                </p>
                <div className="mt-2 flex flex-col items-center gap-2">
                  <button className="px-4 py-1.5 bg-white text-primary text-[10px] font-bold border border-primary/20 rounded shadow-sm hover:bg-indigo-50 transition-colors uppercase tracking-wider relative">
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    SELECIONAR PLANILHA
                  </button>
                  {fileName && (
                    <span
                      className="text-[10px] font-medium text-primary mt-2 truncate w-full px-2"
                      title={fileName}
                    >
                      {fileName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="col-span-12 lg:col-span-8 space-y-6">
          <section className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10 overflow-hidden h-full flex flex-col">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-surface-container-low/30">
              <h2 className="text-lg font-headline font-bold text-primary">
                Status e Prévia
              </h2>
              <button 
                onClick={() => setShowStructure(!showStructure)}
                className="flex items-center gap-2 px-4 py-1.5 border border-primary/30 text-primary text-[10px] font-bold rounded hover:bg-primary/5 transition-all uppercase tracking-widest"
              >
                {showStructure ? "Ocultar Estrutura Padrão" : "Ver Estrutura Padrão"}
              </button>
            </div>

            <div className="flex-1 overflow-x-auto custom-scrollbar p-6 bg-slate-50/30 flex flex-col">
              {showStructure ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-700 p-10 text-center animate-in fade-in zoom-in-95 duration-200">
                  <h3 className="text-xl font-headline font-bold mb-6 text-primary">
                    Estrutura Exigida
                  </h3>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-outline-variant/10 w-full max-w-lg text-left">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 border-b pb-2">
                       {importType === 'monitoring' ? 'Monitoramento da Equipe' : importType === 'maintenance_in' || importType === 'maintenance_out' ? 'Manutenções' : importType === 'scheduling' ? 'Agendamentos' : 'Divergências dos Técnicos'}
                    </p>
                    <ul className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-700 uppercase">
                      {(importType === "monitoring"
                        ? MONITORING_COLUMNS
                        : importType === "fechamento"
                          ? FECHAMENTO_COLUMNS
                          : importType === "maintenance_in" || importType === "maintenance_out"
                            ? MAINTENANCE_COLUMNS
                            : importType === "scheduling"
                              ? SCHEDULING_COLUMNS
                              : ATTENDANCE_COLUMNS
                      ).map((col) => (
                        <li key={col} className="flex items-center gap-1.5 truncate" title={col}>
                          <CheckCircle2 className="w-3 h-3 text-tertiary shrink-0" /> {col}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <>
                  {uploadStatus === "idle" && (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-10 text-center">
                  <FileText className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-sm font-medium">Nenhum arquivo enviado.</p>
                  <p className="text-xs mt-1">
                    Selecione uma planilha para visualizar o status da
                    validação.
                  </p>
                </div>
              )}

              {uploadStatus === "validating" && (
                <div className="flex-1 flex flex-col items-center justify-center text-primary p-10 text-center">
                  <Loader2 className="w-16 h-16 mb-4 animate-spin opacity-50" />
                  <p className="text-sm font-bold animate-pulse">
                    Lendo e validando estrutura do arquivo...
                  </p>
                </div>
              )}

              {uploadStatus === "success" && (
                <div className="flex-1 flex flex-col items-center justify-center text-on-tertiary-container p-10 text-center bg-tertiary-fixed/10 rounded-xl border border-tertiary-fixed/30">
                  <CheckCircle2 className="w-16 h-16 mb-4" />
                  <h3 className="text-xl font-headline font-bold mb-2">
                    Estrutura Validada com Sucesso!
                  </h3>
                  <p className="text-sm font-medium opacity-80 mb-6">
                    A planilha "{fileName}" atende a todos os requisitos de
                    colunas para o módulo selecionado.
                  </p>

                  <div className="bg-white p-4 rounded-lg shadow-sm border border-outline-variant/10 w-full max-w-lg text-left">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 border-b pb-2">
                      Colunas Identificadas
                    </p>
                    <ul className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-700 uppercase">
                      {(importType === "monitoring"
                        ? MONITORING_COLUMNS
                        : importType === "maintenance_in" || importType === "maintenance_out"
                          ? MAINTENANCE_COLUMNS
                          : importType === "scheduling"
                            ? SCHEDULING_COLUMNS
                            : FECHAMENTO_COLUMNS
                      ).map((col) => (
                        <li
                          key={col}
                          className="flex items-center gap-1.5 truncate"
                          title={col}
                        >
                          <CheckCircle2 className="w-3 h-3 text-tertiary shrink-0" />{" "}
                          {col}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {uploadStatus === "error" && (
                <div className="flex-1 flex flex-col items-start justify-center p-8 bg-error-container/20 rounded-xl border border-error/20">
                  <div className="flex items-center gap-3 mb-4 text-error">
                    <XCircle className="w-8 h-8" />
                    <h3 className="text-xl font-headline font-bold">
                      Mapeamento Incorreto
                    </h3>
                  </div>
                  <p className="text-sm font-medium text-slate-700 mb-6">
                    O arquivo "{fileName}" não possui a estrutura exigida. As
                    seguintes colunas não foram encontradas na primeira linha da
                    planilha:
                  </p>
                  <ul className="space-y-2 mb-6 w-full max-w-lg">
                    {errorDetails.map((err, idx) => (
                      <li
                        key={idx}
                        className="flex items-center gap-2 bg-white px-4 py-2 rounded border border-error/10 text-xs font-bold text-error uppercase shadow-sm"
                      >
                        <AlertTriangle className="w-4 h-4 shrink-0" /> {err}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-slate-500 font-medium">
                    Corrija sua planilha e tente enviar novamente.
                  </p>
                </div>
              )}
                </>
              )}
            </div>

            <div className="p-8 bg-surface-container-low/20 flex flex-col items-center border-t border-outline-variant/5">
              <p className="text-sm text-slate-500 mb-6 text-center max-w-sm font-medium">
                Certifique-se de que o arquivo segue a arquitetura do respectivo
                módulo antes de prosseguir com a consolidação final.
              </p>
              <button
                disabled={uploadStatus !== "success"}
                onClick={handleSaveAndStart}
                className={`w-full sm:w-auto px-12 py-4 rounded-md font-bold transition-all flex items-center justify-center gap-3 group shadow-lg uppercase tracking-widest text-sm ${
                  uploadStatus === "success"
                    ? "bg-primary text-white hover:bg-primary/90 cursor-pointer"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Salvar e Iniciar Carga</span>
              </button>
            </div>
          </section>
        </div>
      </div>

      <div className="bg-primary-container p-1 rounded-xl shadow-xl shadow-primary/10 overflow-hidden">
        <div className="bg-primary-container rounded-lg p-8 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-xl font-headline font-bold text-white">
              Soberania de Dados
            </h3>
            <p className="text-blue-100/70 text-sm max-w-xl">
              A arquitetura exigida garante que os motores de auditoria "The
              Architect" processem as informações com 99.9% de precisão
              operacional.
            </p>
          </div>
          <div className="flex -space-x-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-10 h-10 rounded-full border-2 border-primary-container overflow-hidden bg-slate-200"
              >
                <img
                  src={`https://picsum.photos/seed/auditor${i}/100/100`}
                  alt="Auditor"
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
            <div className="w-10 h-10 rounded-full border-2 border-primary-container bg-blue-800 flex items-center justify-center text-[10px] font-bold text-white">
              +12
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-headline font-bold text-primary flex items-center gap-2">
          <Clock className="w-5 h-5" /> Histórico Dinâmico de Lotes
        </h2>
        <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10 overflow-hidden relative min-h-[150px]">
          {importHistory.length === 0 ? (
            <div className="p-10 flex flex-col items-center justify-center text-slate-400">
               <span className="text-sm font-medium">Nenhum lote importado recentemente.</span>
               <span className="text-xs">Os últimos arquivos consolidados aparecerão aqui.</span>
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/5">
              {importHistory.map((history) => (
                <div key={history.id} className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                   <div className="flex items-start gap-4">
                     <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-lg flex items-center justify-center shrink-0">
                       <FileText className="w-5 h-5" />
                     </div>
                     <div>
                       <h3 className="text-sm font-bold text-slate-800 break-all">{history.file_name}</h3>
                       <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                         <span className="flex items-center gap-1 font-medium bg-slate-100 px-2 py-0.5 rounded">
                           {history.module === 'monitoring' ? <Users className="w-3 h-3" /> : history.module.includes('maintenance') || history.module === 'scheduling' ? <PenTool className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                           {history.module === 'monitoring' ? 'Monitoramento' : history.module === 'maintenance_in' ? 'Entrada Manut.' : history.module === 'maintenance_out' ? 'Saída Manut.' : history.module === 'scheduling' ? 'Agendamentos' : 'Divergências'}
                         </span>
                         <span className="flex items-center gap-1">
                           <Clock className="w-3 h-3" />
                           {new Date(history.created_at).toLocaleString('pt-BR')}
                         </span>
                         {history.users?.name && (
                           <span className="flex items-center gap-1">
                             <span className="w-4 h-4 bg-primary text-white rounded-full flex items-center justify-center text-[8px] font-bold">
                               {history.users.name.charAt(0).toUpperCase()}
                             </span>
                             {history.users.name}
                           </span>
                         )}
                       </div>
                     </div>
                   </div>
                   
                   <button 
                     onClick={() => handleDeleteHistory(history.id, history.file_name)}
                     className="px-3 py-2 bg-error-container/30 text-error rounded hover:bg-error-container cursor-pointer transition-colors flex items-center gap-2 text-xs font-bold"
                     title={`Excluir registros de ${history.file_name}`}
                   >
                     <Trash2 className="w-4 h-4" /> Excluir Lote
                   </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
