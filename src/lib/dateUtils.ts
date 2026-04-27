/**
 * Date Utilities - Padrão Interno: ISO YYYY-MM-DD. 
 * Formatação de Exibição: DD/MM/AAAA.
 */

// 1. Tenta converter qualquer formato agressivo (Excel int, DD/MM/YYYY, MM/DD/YYYY) para YYYY-MM-DD
export function normalizeDateToISO(rawValue: any): string | null {
  if (!rawValue) return null;

  // Se for Data do Excel (Número de dias desde 1900)
  if (typeof rawValue === "number") {
    const tempDate = new Date((rawValue - 25569) * 86400 * 1000);
    const d = String(tempDate.getUTCDate()).padStart(2, "0");
    const m = String(tempDate.getUTCMonth() + 1).padStart(2, "0");
    const y = tempDate.getUTCFullYear();
    return `${y}-${m}-${d}`;
  }

  const dtStr = String(rawValue).trim().substring(0, 10);

  // Já é ISO?
  if (/^\d{4}-\d{2}-\d{2}$/.test(dtStr)) {
    return dtStr;
  }

  // Verificar se tem formato DD/MM/YYYY, D/M/YY, MM/DD/YYYY, etc
  const dateMatch = dtStr.match(/^(\d{1,4})[\/\-](\d{1,2})[\/\-](\d{1,4})/);
  if (dateMatch) {
    let p1 = dateMatch[1];
    let p2 = dateMatch[2].padStart(2, "0");
    let p3 = dateMatch[3];

    // Formato Brasileiro: DD/MM/YYYY
    if (p3.length >= 4 && p1.length <= 2) {
      p1 = p1.padStart(2, "0");
      // Se p2 (mês) vir com um erro trocado de formatação > 12, sabemos que o usuário inverteu americano
      if (Number(p2) > 12) {
        return `${p3}-${p1}-${p2}`; // p1 é o mês
      }
      return `${p3}-${p2}-${p1}`; // YYYY-MM-DD
    }
  }

  // Fallback para native parser em ultimo caso se puder
  try {
     const native = new Date(dtStr);
     if (!isNaN(native.getTime())) {
        return native.toISOString().split("T")[0];
     }
  } catch (e) {}

  return null; // Formato não reconhecido
}

// 2. Converte ISO YYYY-MM-DD para o display padrão BR DD/MM/AAAA
export function formatToBR(isoString: string | null | undefined): string {
  if (!isoString) return "";
  const parts = isoString.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoString; // Retorna como é se der erro
}

// 3. Checar a interseção (match) baseado no valor de um filtro
export type DateFilterMode = "Todas" | "Ano" | "Mes" | "Dia" | "Range";

export function isDateMatch(
  dateISO: string, // YYYY-MM-DD
  mode: DateFilterMode,
  filterValue: string, // Pode ser YYYY, YYYY-MM, YYYY-MM-DD ou YYYY-MM-DD_TO_YYYY-MM-DD
): boolean {
  if (mode === "Todas" || !filterValue || !dateISO) return true;

  switch (mode) {
    case "Ano":
      // filterValue = YYYY
      return dateISO.startsWith(filterValue);
    
    case "Mes":
      // filterValue = YYYY-MM
      return dateISO.startsWith(filterValue);
      
    case "Dia":
      // filterValue = YYYY-MM-DD
      return dateISO === filterValue;
      
    case "Range":
      // filterValue = "YYYY-MM-DD|YYYY-MM-DD"
      const [start, end] = filterValue.split("|");
      if (!start || !end) return true;
      const targetDate = new Date(dateISO).getTime();
      const startDate = new Date(start).getTime();
      const endDate = new Date(end).getTime();
      return targetDate >= startDate && targetDate <= endDate;
  }
  
  return true;
}

export function filterByDate<T>(
  data: T[],
  mode: DateFilterMode,
  filterValue: string,
  dateField: keyof T
): T[] {
  if (mode === "Todas" || !filterValue) return data;
  return data.filter(item => {
    const isoString = item[dateField] as unknown as string;
    return isDateMatch(isoString, mode, filterValue);
  });
}
