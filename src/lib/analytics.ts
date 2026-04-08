import { MonitoringRecord } from "../context/DataContext";

export type TimeFilter = "dia" | "semana" | "mes" | "ano" | "custom";

export interface KPIData {
  totalAuditorias: number;
  totalAuditoriasTrend: number;
  taxaAprovacao: number;
  taxaAprovacaoTrend: number;
  tempoMedio: number;
  tempoMedioTrend: number;
  volumeDiario: { name: string; volume: number; fullLabel?: string }[];
  statusDistribution: { status: string; count: number; percent: number }[];
  categoryDistribution: {
    category: string;
    total: number;
    aprovadoSemDiv: number;
    comDivergencia: number;
    [key: string]: string | number; // For dynamic auditor counts
  }[];
  auditorsRanking: AuditorRanking[];
  rawCurrentRecords: (MonitoringRecord & { isApprovedSemDiv: boolean; isFinalizada: boolean })[];
  heatmapData: { day: number; hour: number; value: number }[];
  slaMetrics: { mediaLeadTimeHours: number };
  wordCloudData: { text: string; value: number }[];
  treemapData: { name: string; size?: number; children?: any[] }[];
}

export interface AuditorRanking {
  name: string;
  total: number;
  rate: number;
  trend: string;
  time: string;
  status: string;
  level: string;
  avatar: string;
}

// Parses common string date formats from BR Excel
const parseDateString = (val: string | number | undefined): Date | null => {
  if (!val) return null;
  if (typeof val === "number") {
    // Excel date numeric (days since 1900)
    const utcMs = Math.round((val - 25569) * 86400 * 1000);
    const d = new Date(utcMs);
    return new Date(d.getTime() + d.getTimezoneOffset() * 60000);
  }

  const str = String(val).trim();

  // Try dd/mm/yyyy hh:mm:ss (or dd/mm/yy)
  const brRegex =
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/;
  const matchBr = str.match(brRegex);
  if (matchBr) {
    const d = parseInt(matchBr[1], 10);
    const m = parseInt(matchBr[2], 10) - 1;
    let y = parseInt(matchBr[3], 10);
    if (y < 100) y += 2000;
    const h = matchBr[4] ? parseInt(matchBr[4], 10) : 0;
    const min = matchBr[5] ? parseInt(matchBr[5], 10) : 0;
    const s = matchBr[6] ? parseInt(matchBr[6], 10) : 0;
    return new Date(y, m, d, h, min, s);
  }

  // Try yyyy-mm-dd hh:mm:ss (from dateNF or Excel ISO output)
  const isoRegex =
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/;
  const matchIso = str.match(isoRegex);
  if (matchIso) {
    const y = parseInt(matchIso[1], 10);
    const m = parseInt(matchIso[2], 10) - 1;
    const d = parseInt(matchIso[3], 10);
    const h = matchIso[4] ? parseInt(matchIso[4], 10) : 0;
    const min = matchIso[5] ? parseInt(matchIso[5], 10) : 0;
    const s = matchIso[6] ? parseInt(matchIso[6], 10) : 0;
    return new Date(y, m, d, h, min, s);
  }

  const standardDate = new Date(str);
  if (!isNaN(standardDate.getTime())) return standardDate;

  return null;
};

const getLatestDate = (data: MonitoringRecord[]): Date => {
  let latest = 0;
  for (const row of data) {
    const d = parseDateString(row["DATA/HORA_FECHAMENTO"]);
    if (d && d.getTime() > latest) {
      latest = d.getTime();
    }
  }
  return latest > 0 ? new Date(latest) : new Date();
};

const getPreviousPeriodDate = (d: Date, period: TimeFilter): Date => {
  const prev = new Date(d.getTime());
  if (period === "dia") {
    prev.setDate(prev.getDate() - 1);
    // Skips Sunday (0) to compare with Saturday (6)
    if (prev.getDay() === 0) {
      prev.setDate(prev.getDate() - 1);
    }
  } else if (period === "semana") {
    prev.setDate(prev.getDate() - 7);
  } else if (period === "mes") {
    prev.setMonth(prev.getMonth() - 1);
  } else if (period === "ano") {
    prev.setFullYear(prev.getFullYear() - 1);
  }
  return prev;
};

// Computes gross minutes between two dates for gap calculation. Fast numerical fallback.
const getMinutesBetween = (d1: Date, d2: Date): number => {
  const rawDiffMs = Math.abs(d2.getTime() - d1.getTime());
  let rawMin = Math.floor(rawDiffMs / 60000);

  // If they are on different days functionally, subtract 14 hours per day over gap
  // Using pure math for performance
  const days1 = Math.floor(
    (d1.getTime() - d1.getTimezoneOffset() * 60000) / 86400000,
  );
  const days2 = Math.floor(
    (d2.getTime() - d2.getTimezoneOffset() * 60000) / 86400000,
  );
  if (days1 !== days2) {
    rawMin -= 840 * Math.abs(days2 - days1);
    if (rawMin < 0) rawMin = 0;
  }
  return rawMin;
};

export function calculateMetrics(
  data: MonitoringRecord[],
  periodFilter: TimeFilter,
  customStart?: Date,
  customEnd?: Date,
  statusFilter: "all" | "aprovado" | "divergencia" = "all"
): KPIData {
  if (!data || data.length === 0) {
    return {
      totalAuditorias: 0,
      totalAuditoriasTrend: 0,
      taxaAprovacao: 0,
      taxaAprovacaoTrend: 0,
      tempoMedio: 0,
      tempoMedioTrend: 0,
      volumeDiario: [],
      statusDistribution: [],
      categoryDistribution: [],
      auditorsRanking: [],
      rawCurrentRecords: [],
      heatmapData: [],
      slaMetrics: { mediaLeadTimeHours: 0 },
      wordCloudData: [],
      treemapData: [],
    };
  }

  const currentDate = getLatestDate(data);
  const prevDate = getPreviousPeriodDate(currentDate, periodFilter);

  const getWindow = (baseDate: Date, period: string) => {
    const d = new Date(baseDate.getTime());
    let start = new Date(d.getTime());
    let end = new Date(d.getTime());

    if (period === "dia") {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (period === "semana") {
      const day = d.getDay();
      const diffStart = d.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diffStart);
      start.setHours(0, 0, 0, 0);
      end = new Date(start.getTime());
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (period === "mes") {
      start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (period === "ano") {
      start.setFullYear(start.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else {
      // Default to day if unexpected
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }
    return { start: start.getTime(), end: end.getTime() };
  };

  let currentRange = { start: 0, end: 0 };
  let prevRange = { start: 0, end: 0 };

  if (periodFilter === "custom" && customStart && customEnd) {
    const s = new Date(customStart.getTime());
    s.setHours(0, 0, 0, 0);
    const e = new Date(customEnd.getTime());
    e.setHours(23, 59, 59, 999);
    currentRange = { start: s.getTime(), end: e.getTime() };

    const winSize = currentRange.end - currentRange.start;
    const prevEndMs = currentRange.start - 1;
    const prevStartDate = new Date(prevEndMs - winSize);
    prevStartDate.setHours(0, 0, 0, 0);
    prevRange = { start: prevStartDate.getTime(), end: prevEndMs };
  } else {
    currentRange = getWindow(currentDate, periodFilter);
    prevRange = getWindow(prevDate, periodFilter);
  }

  // --- NOVA LÓGICA DE BUCKETS DO GRÁFICO (LINHA DO TEMPO P/ AREA CHART) ---
  const generateBuckets = (start: number, end: number) => {
    const buckets: { name: string; volume: number; fullLabel?: string }[] = [];
    const bucketMap = new Map<string, number>();
    const msInDay = 86400000;

    if (end - start <= msInDay * 1.5) {
      // 24 hours
      const dStart = new Date(start);
      const dayStr = `${String(dStart.getDate()).padStart(2, "0")}/${String(dStart.getMonth() + 1).padStart(2, "0")}`;
      for (let i = 0; i < 24; i++) {
        const name = `${String(i).padStart(2, "0")}:00`;
        buckets.push({ name, volume: 0, fullLabel: `${dayStr} - ${name}` });
        bucketMap.set(name, i);
      }
      return { buckets, bucketMap, type: "hour" as const };
    }
    
    if (end - start > msInDay * 62) {
      // Monthly buckets
      let curDate = new Date(start);
      curDate.setDate(1);
      curDate.setHours(12, 0, 0, 0);
      const endMid = new Date(end);
      let index = 0;
      while (curDate.getTime() <= endMid.getTime()) {
        const name = `${String(curDate.getMonth() + 1).padStart(2, "0")}/${curDate.getFullYear()}`;
        buckets.push({ name, volume: 0 });
        bucketMap.set(name, index++);
        curDate.setMonth(curDate.getMonth() + 1);
      }
      return { buckets, bucketMap, type: "month" as const };
    }

    // Multi day timeline
    let curDate = new Date(start);
    curDate.setHours(12, 0, 0, 0);
    const endMid = new Date(end);
    endMid.setHours(12, 0, 0, 0);

    let index = 0;
    while (curDate.getTime() <= endMid.getTime()) {
      const name = `${String(curDate.getDate()).padStart(2, "0")}/${String(curDate.getMonth() + 1).padStart(2, "0")}`;
      buckets.push({ name, volume: 0 });
      bucketMap.set(name, index++);
      curDate.setDate(curDate.getDate() + 1);
    }
    return { buckets, bucketMap, type: "day" as const };
  };

  const {
    buckets: volumeDiario,
    bucketMap,
    type: chartType,
  } = generateBuckets(currentRange.start, currentRange.end);

  let currentAuditsUnfiltered = 0;
  let currentAudits = 0;
  let prevAudits = 0;
  let currentApproved = 0;
  let currentApprovedSemDiv = 0;
  let prevApproved = 0;
  let prevApprovedSemDiv = 0;

  // For time averages
  const auditorTimestampsCurrent: Record<string, number[]> = {};
  const auditorTimestampsPrev: Record<string, number[]> = {};
  const auditorStats: Record<string, { apr: number; semDiv: number }> = {};
  const auditorStatsPrev: Record<string, { apr: number; semDiv: number }> = {};
  const categoryStats: Record<
    string,
    { total: number; aprSemDiv: number; comDiv: number; byAuditor: Record<string, { apr: number; div: number; tot: number }> }
  > = {};
  
  const rawCurrentRecords: (MonitoringRecord & { isApprovedSemDiv: boolean; isFinalizada: boolean })[] = [];

  const dist = { aprovado: 0, reprovado: 0 };

  // --- Analises Avancadas ---
  const heatmapGrid = Array.from({ length: 7 }, () => Array(24).fill(0));
  let slaTotalHours = 0;
  let slaCount = 0;
  const wordCounts: Record<string, number> = {};
  const STOP_WORDS = new Set(["a", "o", "as", "os", "de", "do", "da", "dos", "das", "em", "no", "na", "nos", "nas", "por", "para", "com", "um", "uma", "uns", "umas", "que", "e", "é", "ao", "aos", "se", "nao", "não"]);
  const treemapStats: Record<string, { aprovado: number, divergencia: number }> = {};

  const getBusinessHoursGap = (startD: Date, endD: Date): number => {
    if (endD < startD) return 0;
    const totalHours = (endD.getTime() - startD.getTime()) / 3600000;
    if (startD.getDay() === endD.getDay() && (endD.getDay() === 0 || endD.getDay() === 6) && totalHours < 24) {
        return totalHours;
    }
    let hours = 0;
    let current = new Date(startD.getTime());
    let safety = 30 * 24; 
    while(current < endD && safety > 0) {
        safety--;
        const day = current.getDay();
        const hour = current.getHours();
        const isWeekend = day === 0 || day === 6;
        const isEndWeekend = isWeekend && endD.getDay() === day && endD.getDate() === current.getDate();
        const isBusinessHour = hour >= 8 && hour < 18;
        if ((!isWeekend || isEndWeekend) && isBusinessHour) hours++;
        current.setHours(current.getHours() + 1);
    }
    return hours;
  };

  type RecordClassified = MonitoringRecord & { dateObj: Date };
  const classifiedData: RecordClassified[] = [];

  for (const row of data) {
    const d = parseDateString(row["DATA/HORA_FECHAMENTO"]);
    if (!d || isNaN(d.getTime())) continue;
    classifiedData.push({ ...row, dateObj: d });
  }

  // Sort chronological for gaps
  classifiedData.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  for (const row of classifiedData) {
    const d = row.dateObj;
    const t = d.getTime();
    const isCurrent = t >= currentRange.start && t <= currentRange.end;
    const isPrev = t >= prevRange.start && t <= prevRange.end;
    const isFinalizada =
      (row["STATUS_MENSAGEM_OS"] || "").trim().toLowerCase() === "finalizada";

    // taxa aprovação "aprovadas que não tiveram divergencia"
    const nextTask = (row["PROXIMA_TAREFA"] || "").trim().toLowerCase();
    
    const hasDivergenceKeyword = nextTask.includes("divergência") || nextTask.includes("divergencia");
    const isExplicitlyWithoutDivergence = 
      nextTask.includes("sem divergência") || 
      nextTask.includes("sem divergencia") ||
      nextTask.includes("não houve divergência") ||
      nextTask.includes("não houve divergencia") ||
      nextTask.includes("nao houve divergência") ||
      nextTask.includes("nao houve divergencia") ||
      nextTask.includes("divergência na isenção de taxa") ||
      nextTask.includes("divergencia na isenção de taxa") ||
      nextTask.includes("divergencia na isencao de taxa");
    
    const semDivergencia = !hasDivergenceKeyword || isExplicitlyWithoutDivergence;

    let aprovedFlag = false;
    if (isFinalizada) aprovedFlag = true;

    if (isCurrent && isFinalizada) {
      currentAuditsUnfiltered++;
      if (semDivergencia) dist.aprovado++;
      else dist.reprovado++;

      if (statusFilter === "aprovado" && !semDivergencia) continue;
      if (statusFilter === "divergencia" && semDivergencia) continue;

      currentAudits++;
      if (!auditorStats[row.AUDITOR])
        auditorStats[row.AUDITOR] = { apr: 0, semDiv: 0 };

      if (aprovedFlag) {
        currentApproved++;
        auditorStats[row.AUDITOR].apr++;
        if (semDivergencia) {
          currentApprovedSemDiv++;
          auditorStats[row.AUDITOR].semDiv++;
        }
      }

      if (chartType === "hour") {
        const h = d.getHours();
        if (h >= 0 && h < 24) volumeDiario[h].volume++;
      } else if (chartType === "month") {
        const name = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
        const bIndex = bucketMap.get(name);
        if (bIndex !== undefined) volumeDiario[bIndex].volume++;
      } else {
        const name = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
        const bIndex = bucketMap.get(name);
        if (bIndex !== undefined) volumeDiario[bIndex].volume++;
      }

      // Category aggregation
      const category = (row["ASSUNTO_OS"] || "Não Categorizado").trim();
      if (!categoryStats[category]) {
        categoryStats[category] = { total: 0, aprSemDiv: 0, comDiv: 0, byAuditor: {} };
      }
      categoryStats[category].total++;
      if (!categoryStats[category].byAuditor[row.AUDITOR]) {
        categoryStats[category].byAuditor[row.AUDITOR] = { apr: 0, div: 0, tot: 0 };
      }
      categoryStats[category].byAuditor[row.AUDITOR].tot++;

      if (semDivergencia) {
        categoryStats[category].aprSemDiv++;
        categoryStats[category].byAuditor[row.AUDITOR].apr++;
      } else {
        categoryStats[category].comDiv++;
        categoryStats[category].byAuditor[row.AUDITOR].div++;
      }

      // Heatmap, WordCloud, Treemap, SLA logic
      const closeDateStr = row["DATA/HORA_FECHAMENTO"];
      const closeD = parseDateString(closeDateStr);
      if (closeD) {
        const day = closeD.getDay();
        const hour = closeD.getHours();
        if (day >= 0 && day <= 6 && hour >= 0 && hour <= 23) {
          heatmapGrid[day][hour]++;
        }
      }

      const openDateStr = row["DATA/HORA_ABERTURA"];
      const openD = parseDateString(openDateStr);
      if (openD && closeD) {
        const leadTime = getBusinessHoursGap(openD, closeD);
        if (leadTime > 0) {
          slaTotalHours += leadTime;
          slaCount++;
        }
      }

      const diagStr = (row["DIAGNOSTICO_MENSAGEM_OS"] || "").toString();
      const msgStr = (row["MENSAGEM_OS"] || "").toString();
      const combinedMsg = `${diagStr} ${msgStr}`.toLowerCase();
      
      if (!semDivergencia && combinedMsg.trim().length > 0) {
        const words = combinedMsg.match(/[a-záéíóúãõç]+/g) || [];
        for (const w of words) {
          if (w.length > 2 && !STOP_WORDS.has(w)) {
            wordCounts[w] = (wordCounts[w] || 0) + 1;
          }
        }
      }

      if (!treemapStats[category]) {
        treemapStats[category] = { aprovado: 0, divergencia: 0 };
      }
      if (semDivergencia) treemapStats[category].aprovado++;
      else treemapStats[category].divergencia++;

      if (!auditorTimestampsCurrent[row.AUDITOR])
        auditorTimestampsCurrent[row.AUDITOR] = [];
      auditorTimestampsCurrent[row.AUDITOR].push(d.getTime());
      
      rawCurrentRecords.push({
        ...row,
        isApprovedSemDiv: semDivergencia,
        isFinalizada: isFinalizada
      });
    }

    if (isPrev && isFinalizada) {
      prevAudits++;
      if (!auditorStatsPrev[row.AUDITOR])
        auditorStatsPrev[row.AUDITOR] = { apr: 0, semDiv: 0 };

      if (aprovedFlag) {
        prevApproved++;
        auditorStatsPrev[row.AUDITOR].apr++;
        if (semDivergencia) {
          prevApprovedSemDiv++;
          auditorStatsPrev[row.AUDITOR].semDiv++;
        }
      }
      
      if (!auditorTimestampsPrev[row.AUDITOR])
        auditorTimestampsPrev[row.AUDITOR] = [];
      auditorTimestampsPrev[row.AUDITOR].push(d.getTime());
    }
  }

  const calcAvgGaps = (timestampsObj: Record<string, number[]>) => {
    let totalGaps = 0;
    let gapCount = 0;
    const auditorAvgs: Record<string, number> = {};

    for (const [auditor, times] of Object.entries(timestampsObj)) {
      let auditorTotalGaps = 0;
      let auditorGapCount = 0;

      // Sort times just in case they are out of order
      times.sort((a, b) => a - b);

      for (let i = 1; i < times.length; i++) {
        const minGap = getMinutesBetween(
          new Date(times[i - 1]),
          new Date(times[i]),
        );
        // Avoid absurd gaps if schedule math is naïve
        if (minGap >= 0 && minGap < 600) {
          auditorTotalGaps += minGap;
          auditorGapCount++;
          totalGaps += minGap;
          gapCount++;
        }
      }
      auditorAvgs[auditor] =
        auditorGapCount > 0 ? auditorTotalGaps / auditorGapCount : 0;
    }

    return {
      overall: gapCount > 0 ? totalGaps / gapCount : 0,
      auditorAvgs,
    };
  };

  const currentGaps = calcAvgGaps(auditorTimestampsCurrent);
  const prevGaps = calcAvgGaps(auditorTimestampsPrev);

  const totalTrend =
    prevAudits > 0 ? ((currentAudits - prevAudits) / prevAudits) * 100 : 0;

  const currentRate =
    currentApproved > 0 ? (currentApprovedSemDiv / currentApproved) * 100 : 0;
  const prevRate =
    prevApproved > 0 ? (prevApprovedSemDiv / prevApproved) * 100 : 0;
  const rateTrend = currentRate - prevRate;

  const currentAvgHrs = currentGaps.overall / 60;
  const prevAvgHrs = prevGaps.overall / 60;
  const hrTrend = currentAvgHrs - prevAvgHrs; // Negative is better (faster)

  // Removed simplistic dist object mapping because it is now dynamically tallied in the loop
  // dist object needs to be initialized before the loop!

  // Find highest volume for relative status calculation
  let maxVolume = 0;
  for (const auditor of Object.keys(auditorStats)) {
    if (auditorStats[auditor].apr > maxVolume) {
      maxVolume = auditorStats[auditor].apr;
    }
  }

  // Auditors ranking
  const ranking: AuditorRanking[] = [];
  for (const auditor of Object.keys(auditorStats)) {
    const statsObj = auditorStats[auditor];
    const prevObj = auditorStatsPrev[auditor] || { apr: 0, semDiv: 0 };
    
    const rate = statsObj.apr > 0 ? (statsObj.semDiv / statsObj.apr) * 100 : 0;
    const prevRate = prevObj.apr > 0 ? (prevObj.semDiv / prevObj.apr) * 100 : 0;
    
    // Trend logic (Recent Momentum)
    // Se a visualização for anual (chartType = month), agrupa por mês ao invés de dia
    let volumeTrendDelta = 0;
    let hasEnoughPoints = false;
    
    if (auditorTimestampsCurrent[auditor] && auditorTimestampsCurrent[auditor].length > 0) {
      const timeCount: Record<string, number> = {};
      auditorTimestampsCurrent[auditor].forEach(ts => {
        const d = new Date(ts);
        const key = chartType === "month" 
          ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        timeCount[key] = (timeCount[key] || 0) + 1;
      });
      
      const sortedKeys = Object.keys(timeCount).sort();
      if (sortedKeys.length >= 2) {
        hasEnoughPoints = true;
        const lastCount = timeCount[sortedKeys[sortedKeys.length - 1]];
        const prevCount = timeCount[sortedKeys[sortedKeys.length - 2]];
        volumeTrendDelta = prevCount > 0 ? ((lastCount - prevCount) / prevCount) * 100 : 0;
      }
    }

    let trendStr = "+0%";
    if (hasEnoughPoints) {
      trendStr = `${volumeTrendDelta > 0 ? "+" : ""}${volumeTrendDelta.toFixed(1)}%`;
    }
    
    // Format minutes into Xh Ym
    let avgGapStr = "--";
    if (currentGaps.auditorAvgs[auditor]) {
      const minutes = Math.round(currentGaps.auditorAvgs[auditor]);
      if (minutes < 60) {
        avgGapStr = `${minutes}m`;
      } else {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        avgGapStr = m > 0 ? `${h}h ${m}m` : `${h}h`;
      }
    }

    // Determine Dynamic Status based purely on Volume relative to the top performer
    let statusLabel = "ATENÇÃO";
    if (maxVolume > 0) {
      const relativePerf = statsObj.apr / maxVolume;
      if (relativePerf >= 0.85) statusLabel = "EXCELENTE";
      else if (relativePerf >= 0.60) statusLabel = "ALTA PERFORMANCE";
    }

    ranking.push({
      name: auditor,
      total: statsObj.apr,
      rate: Number(rate.toFixed(1)),
      trend: trendStr,
      time: avgGapStr,
      status: statusLabel,
      level: "Nível III",
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(auditor)}&background=random`,
    });
  }

  ranking.sort((a, b) => b.total - a.total);

  const categoryDist = Object.entries(categoryStats)
    .map(([cat, stats]) => {
      const obj: any = {
        category: cat,
        total: stats.total,
        aprovadoSemDiv: stats.aprSemDiv,
        comDivergencia: stats.comDiv,
      };
      
      // Merge unique auditors counts back into the top level for Recharts Area mapping
      for (const [auditorName, counts] of Object.entries(stats.byAuditor)) {
         obj[`${auditorName}_apr`] = counts.apr;
         obj[`${auditorName}_div`] = counts.div;
         obj[`${auditorName}_tot`] = counts.tot;
      }
      return obj;
    })
    .sort((a, b) => b.total - a.total);

  // Generate Advanced Structures
  const heatmapData = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      heatmapData.push({ day: d, hour: h, value: heatmapGrid[d][h] });
    }
  }

  const wordCloudData = Object.entries(wordCounts)
    .map(([text, value]) => ({ text, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 150); // Top 150 words

  const treemapData = Object.entries(treemapStats)
    .map(([name, stats]) => ({
      name,
      children: [
        { name: "Aprovado", size: stats.aprovado },
        { name: "Divergência", size: stats.divergencia }
      ]
    }))
    .filter(cat => cat.children[0].size > 0 || cat.children[1].size > 0);

  return {
    totalAuditorias: currentAudits,
    totalAuditoriasTrend: totalTrend,
    taxaAprovacao: currentRate,
    taxaAprovacaoTrend: rateTrend,
    tempoMedio: currentAvgHrs,
    tempoMedioTrend: hrTrend,
    volumeDiario: volumeDiario,
    statusDistribution: [
      {
        status: "Aprovado",
        count: dist.aprovado,
        percent: dist.aprovado ? (dist.aprovado / currentAuditsUnfiltered) * 100 : 0,
      },
      {
        status: "Com Divergência",
        count: dist.reprovado,
        percent: dist.reprovado ? (dist.reprovado / currentAuditsUnfiltered) * 100 : 0,
      },
    ],
    categoryDistribution: categoryDist,
    auditorsRanking: ranking,
    rawCurrentRecords,
    heatmapData,
    slaMetrics: { mediaLeadTimeHours: slaCount > 0 ? (slaTotalHours / slaCount) : 0 },
    wordCloudData,
    treemapData,
  };
}
