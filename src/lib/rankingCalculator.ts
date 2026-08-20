import { normalizeDisplayName } from "./nameAliasMap";
import { isDateMatch, normalizeDateToISO, DateFilterMode } from "./dateUtils";
import { ProductionEntry, AttendanceRecord } from "../types";

export interface OfficialRankingItem {
  id: string;
  name: string;
  score: number;
  efficiency: number;
  limpos: number;
  testados: number;
  manutEquip: number;
  manutEscada: number;
  fontesAprovadas: number;
  fontesDescarte: number;
  photoUrl?: string;
}

/**
 * Determines the latest active month from the dataset or falls back to the current date.
 */
export function getLatestActiveMonth(
  productionEntries: ProductionEntry[] = [],
  monitoringData: any[] = []
): { monthKey: string; label: string } {
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const allMonths: string[] = [];
  productionEntries.forEach(e => {
    const iso = normalizeDateToISO(e.date);
    if (iso && iso.length >= 7) allMonths.push(iso.substring(0, 7));
  });
  monitoringData.forEach(m => {
    const iso = normalizeDateToISO(m.data_registro);
    if (iso && iso.length >= 7) allMonths.push(iso.substring(0, 7));
  });

  allMonths.sort();

  let monthKey = "";
  if (allMonths.length > 0) {
    monthKey = allMonths[allMonths.length - 1]; // e.g. "2026-08"
  } else {
    const now = new Date();
    monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  const parts = monthKey.split("-");
  let label = monthKey;
  if (parts.length === 2) {
    const mesIdx = parseInt(parts[1], 10) - 1;
    label = `${meses[mesIdx] || parts[1]} de ${parts[0]}`;
  }

  return { monthKey, label };
}

/**
 * Calculates the official Ranking score using the exact rules and data of the Ranking Geral page.
 */
export function calculateOfficialRanking(params: {
  productionEntries: ProductionEntry[];
  monitoringData: any[];
  attendanceData: AttendanceRecord[];
  auditors: any[];
  users: any[];
  filterMode?: DateFilterMode;
  filterValue?: string;
}): OfficialRankingItem[] {
  const {
    productionEntries = [],
    monitoringData = [],
    attendanceData = [],
    auditors = [],
    users = [],
    filterMode = "Mes",
    filterValue
  } = params;

  // Resolve filterValue if not passed
  const resolvedFilterValue = filterValue || getLatestActiveMonth(productionEntries, monitoringData).monthKey;

  const isMatchDate = (rawValue: any) => {
    const normDate = normalizeDateToISO(rawValue);
    return isDateMatch(normDate || "", filterMode, resolvedFilterValue);
  };

  // Merge monitoringData with productionEntries for full reactivity and deduplication
  const prodKeys = new Set<string>();
  const mergedMonitoring = [
    ...productionEntries.map(e => {
      const isoDate = normalizeDateToISO(e.date) || e.date;
      const resolvedName = normalizeDisplayName(e.user_name || "");
      prodKeys.add(`${resolvedName}|${isoDate}`);
      return {
        data_registro: isoDate,
        funcionario: resolvedName,
        limpos: Number(e.limpos) || 0,
        testados: Number(e.testados) || 0,
      };
    }),
    ...monitoringData
      .filter(r => {
        const resolvedName = normalizeDisplayName(r.funcionario || "");
        const key = `${resolvedName}|${r.data_registro}`;
        return !prodKeys.has(key);
      })
      .map(r => ({
        data_registro: r.data_registro,
        funcionario: normalizeDisplayName(r.funcionario || ""),
        limpos: Number(r.limpos) || 0,
        testados: Number(r.testados) || 0,
      })),
  ];

  const filteredAttendance = attendanceData.filter(r => isMatchDate(r.DATA_REGISTRO));
  const filteredMonitoring = mergedMonitoring.filter(r => isMatchDate(r.data_registro));

  // 1. Calculate Delays
  const delayMap = new Map<string, { totalDelay: number; faltas: number }>();
  filteredAttendance.forEach(r => {
    const collabName = normalizeDisplayName(r.COLABORADOR || "");
    if (!delayMap.has(collabName)) delayMap.set(collabName, { totalDelay: 0, faltas: 0 });

    const stat = delayMap.get(collabName)!;
    const status = (r.STATUS || "").toUpperCase().trim();
    if (status === "FALTA") {
      stat.faltas += 1;
    }

    const isJustified = r.OBERVAÇÃO && r.OBERVAÇÃO.toUpperCase().trim() !== "OK" && r.OBERVAÇÃO.toUpperCase().trim() !== "SEM JUSTIFICATIVA";
    const auditorConfig = auditors.find(a => a.name.toUpperCase().trim() === collabName);

    if (auditorConfig && !isJustified && status !== "FALTA") {
      let escalaDia: any = auditorConfig.escala;

      let regDate: Date;
      if (typeof r.DATA_REGISTRO === "number") {
        regDate = new Date((r.DATA_REGISTRO - 25569) * 86400 * 1000);
      } else {
        const parts = String(r.DATA_REGISTRO).split("-");
        if (parts.length === 3) {
          regDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else {
          regDate = new Date(r.DATA_REGISTRO);
        }
      }
      const regDay = regDate.getDay();

      if (auditorConfig.tipoEscala === "ALTERNADA" && auditorConfig.escalaAlternada) {
        const alt = auditorConfig.escalaAlternada;
        const refParts = alt.dataReferenciaSabadoTrabalhado.split("-");
        const refDate = new Date(parseInt(refParts[0]), parseInt(refParts[1]) - 1, parseInt(refParts[2]));

        const refWeekStart = new Date(refDate);
        refWeekStart.setDate(refDate.getDate() - refDate.getDay());

        const regWeekStart = new Date(regDate);
        regWeekStart.setDate(regDate.getDate() - regDate.getDay());

        const diffTime = regWeekStart.getTime() - refWeekStart.getTime();
        const diffWeeks = Math.floor(Math.abs(diffTime) / (1000 * 60 * 60 * 24 * 7));
        const isWeekWithSabado = diffWeeks % 2 === 0;

        escalaDia = null;
        if (isWeekWithSabado) {
          if (regDay === 6) escalaDia = alt.semanaComSabado.sabado;
          else if (regDay >= 1 && regDay <= 5) escalaDia = alt.semanaComSabado.segSex;
        } else {
          if (regDay >= 1 && regDay <= 5) escalaDia = alt.semanaSemSabado.segSex;
        }
      }

      if (escalaDia) {
        const parseTime = (timeStr?: string) => {
          if (!timeStr) return null;
          const p = timeStr.split(":");
          return parseInt(p[0]) * 60 + parseInt(p[1]);
        };

        const escE = parseTime(escalaDia.entrada);
        const recE = parseTime(r.ENTRADA);
        if (recE && escE && recE > escE) stat.totalDelay += recE - escE;

        const escVA = parseTime(escalaDia.saidaAlmoco);
        const recVA = parseTime(r.SAIDA_ALMOÇO);
        if (recVA && escVA && recVA > escVA) stat.totalDelay += recVA - escVA;
      }
    }
  });

  // 2. Count Monitoring Productivity
  const productionMap = new Map<
    string,
    {
      limpos: number;
      testados: number;
      manutEquip: number;
      manutEscada: number;
      fontesAprovadas: number;
      fontesDescarte: number;
      extraActivitiesScore: number;
    }
  >();

  filteredMonitoring.forEach(r => {
    const aud = normalizeDisplayName(r.funcionario || "");
    if (!productionMap.has(aud)) {
      productionMap.set(aud, {
        limpos: 0,
        testados: 0,
        manutEquip: 0,
        manutEscada: 0,
        fontesAprovadas: 0,
        fontesDescarte: 0,
        extraActivitiesScore: 0,
      });
    }
    const stat = productionMap.get(aud)!;
    stat.limpos += Number(r.limpos) || 0;
    stat.testados += Number(r.testados) || 0;
  });

  // 2b. Integrate production entries
  const filteredProdEntries = productionEntries.filter(r => isMatchDate(r.date));
  filteredProdEntries.forEach(r => {
    const aud = normalizeDisplayName(r.user_name || "");
    if (!productionMap.has(aud)) {
      productionMap.set(aud, {
        limpos: 0,
        testados: 0,
        manutEquip: 0,
        manutEscada: 0,
        fontesAprovadas: 0,
        fontesDescarte: 0,
        extraActivitiesScore: 0,
      });
    }
    const stat = productionMap.get(aud)!;
    stat.manutEquip += Number(r.manutencao_equipamento) || 0;
    stat.manutEscada += Number(r.manutencao_escada) || 0;
    stat.fontesAprovadas += Number(r.fontes_aprovadas) || 0;
    stat.fontesDescarte += Number(r.fontes_descarte) || 0;

    let extraScore = 0;
    const extras = r.atividades_extras || [];
    if (extras.includes("Sucata")) extraScore += 30;
    if (extras.includes("Conserto Minas")) extraScore += 30;
    if (extras.includes("RMA")) extraScore += 40;
    stat.extraActivitiesScore += extraScore;
  });

  // 3. Final score calculation
  const activeNames = Array.from(productionMap.keys());

  const leadersList: OfficialRankingItem[] = activeNames.map(nameUpper => {
    const isConfiguredAuditor = auditors.find(a => a.name.toUpperCase().trim() === nameUpper);
    const delayData = delayMap.get(nameUpper) || { totalDelay: 0, faltas: 0 };
    const prodData = productionMap.get(nameUpper) || {
      limpos: 0,
      testados: 0,
      manutEquip: 0,
      manutEscada: 0,
      fontesAprovadas: 0,
      fontesDescarte: 0,
      extraActivitiesScore: 0,
    };

    const baseScore = 500;
    const productionPoints = prodData.limpos * 3 + prodData.testados * 1;
    const maintenancePoints = prodData.manutEquip * 3 + prodData.manutEscada * 10;
    const fontesAprovadasPoints = prodData.fontesAprovadas * 0.5;
    const extraActivitiesPoints = prodData.extraActivitiesScore;
    const delayPenalties = Math.round(delayData.totalDelay * 1.383);
    const faltaPenalties = delayData.faltas * 500;

    let finalScore = baseScore + productionPoints + maintenancePoints + fontesAprovadasPoints + extraActivitiesPoints - delayPenalties - faltaPenalties;
    if (finalScore < 0) finalScore = 0;
    finalScore = Math.round(finalScore * 100) / 100;

    const possiblePoints = baseScore + productionPoints + maintenancePoints + fontesAprovadasPoints + extraActivitiesPoints;
    const efficiency = possiblePoints > 0 ? Number(((finalScore / possiblePoints) * 100).toFixed(1)) : 0;

    const displayName = isConfiguredAuditor ? isConfiguredAuditor.name : nameUpper;
    const id = isConfiguredAuditor ? isConfiguredAuditor.id : `collab-${nameUpper}`;

    const userWithPhoto = users.find(u => u.name.trim().toLowerCase() === displayName.trim().toLowerCase());
    const photoUrl = userWithPhoto?.photoUrl;

    return {
      id,
      name: displayName,
      score: finalScore,
      efficiency,
      limpos: prodData.limpos,
      testados: prodData.testados,
      manutEquip: prodData.manutEquip,
      manutEscada: prodData.manutEscada,
      fontesAprovadas: prodData.fontesAprovadas,
      fontesDescarte: prodData.fontesDescarte,
      photoUrl,
    };
  });

  return leadersList.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

/**
 * Format score helper with singular/plural Portuguese grammar.
 */
export function formatPointsLabel(points: number): string {
  const rounded = Math.round(points);
  if (rounded === 1) return "1 ponto";
  return `${rounded.toLocaleString("pt-BR")} pontos`;
}

/**
 * Generates dynamic, motivational ranking announcement text comparing 1st and 2nd places.
 */
export function generateRankingAnnouncementData(
  rankingList: OfficialRankingItem[],
  periodoLabel: string = "do Período"
) {
  if (!rankingList || rankingList.length === 0) {
    return {
      titulo: "🏆 Ranking Geral — Sem Registros",
      mensagem: "Ainda não há registros de produção suficientes para gerar o ranking do período.",
      firstPlace: null,
      secondPlace: null,
      diff: 0,
      leaderPhoto: undefined,
      runnerUpPhoto: undefined,
    };
  }

  const firstPlace = rankingList[0];
  const secondPlace = rankingList.length > 1 ? rankingList[1] : null;

  const score1 = Math.round(firstPlace.score);
  const score2 = secondPlace ? Math.round(secondPlace.score) : 0;
  const diff = Math.max(0, score1 - score2);

  const nome1 = firstPlace.name;
  const pontos1Str = formatPointsLabel(score1);

  let titulo = `🏆 ${nome1.toUpperCase()} ESTÁ NA LIDERANÇA!`;
  let mensagem = "";

  if (secondPlace && secondPlace.score > 0) {
    const nome2 = secondPlace.name;
    const pontos2Str = formatPointsLabel(score2);
    const diffStr = formatPointsLabel(diff);

    // Se a diferença for muito pequena (<= 30 pontos ou <= 5% da pontuação do 1º)
    const isVeryClose = diff <= 30 || (score1 > 0 && diff / score1 <= 0.05);

    if (isVeryClose) {
      titulo = `🔥 A liderança está por um fio!`;
      mensagem = `${nome1} permanece em 1º lugar no Ranking Geral (${periodoLabel}) com ${pontos1Str}, mas ${nome2} está apenas ${diffStr} atrás (com ${pontos2Str})!\n\n🚀 Falta apenas ${diffStr} para ${nome2} ultrapassar ${nome1} e assumir o topo da tabela!\n\nQuem vai levar a melhor? A disputa continua acirrada! 🔥`;
    } else {
      titulo = `🏆 ${nome1.toUpperCase()} ESTÁ NA LIDERANÇA!`;
      mensagem = `${nome1} está atualmente em 1º lugar no Ranking Geral (${periodoLabel}), acumulando ${pontos1Str}!\n\nMas a disputa segue aberta! 🔥\n${nome2} ocupa o 2º lugar com ${pontos2Str}.\n\n🚀 Faltam ${diffStr} para ${nome2} alcançar o 1º lugar!\n\nSerá que ${nome2} consegue buscar essa diferença? Acompanhe o ranking! 🚀`;
    }
  } else {
    mensagem = `Parabéns a ${nome1} por conquistar o 1º lugar no Ranking Geral (${periodoLabel}) com um total de ${pontos1Str}!\n\nContinue assim acelerando a produção! 🚀`;
  }

  return {
    titulo,
    mensagem,
    firstPlace,
    secondPlace,
    diff,
    leaderPhoto: firstPlace.photoUrl,
    runnerUpPhoto: secondPlace?.photoUrl,
  };
}
