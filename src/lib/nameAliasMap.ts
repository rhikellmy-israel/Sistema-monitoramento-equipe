/**
 * nameAliasMap.ts
 * 
 * Módulo centralizado para resolução de nomes de colaboradores.
 * Após o crash do banco de dados, novas credenciais foram criadas com nomes
 * ligeiramente diferentes dos originais. Este módulo mapeia nomes antigos
 * para os nomes ativos atuais, consolidando toda a produção.
 * 
 * REGRA: Apenas estagiários são normalizados. Moderadores e admins passam intactos.
 */

// Lista canônica dos nomes ativos (credenciais atuais em uso)
export const ACTIVE_INTERN_NAMES: string[] = [
  "ARTHUR DE SOUZA",
  "LUCAS DINIZ",
  "BRENO MENEZES",
  "GUILHERME PALHETA ALENCAR REIS",
  "SAMUEL OLIVEIRA",
  "CAWAN ROBSON",
  "RAFAEL FERNANDES",
];

// Set otimizado para lookup rápido
const activeNamesSet = new Set(ACTIVE_INTERN_NAMES.map(n => n.toUpperCase().trim()));

// Cache de resolução para evitar recálculos repetidos
const resolutionCache = new Map<string, string | null>();

// Mapeamento manual de apelidos ou variações de escrita específicas (pós-crash do banco)
const MANUAL_OVERRIDES: Record<string, string> = {
  "CAUA ROBSON": "CAWAN ROBSON",
  "CAWAN ROBSON FERREIRA": "CAWAN ROBSON",
};

/**
 * Resolve um nome qualquer para o nome ativo correspondente.
 * 
 * Lógica de matching (em ordem de prioridade):
 * 0. Overrides manuais específicos (ex: CAWAN ROBSON -> CAUA ROBSON)
 * 1. Match exato → retorna o próprio nome ativo
 * 2. Nome ativo é prefixo do rawName → retorna o nome ativo
 *    Ex: "RAFAEL FERNANDES" é prefixo de "RAFAEL FERNANDES DA SILVA"
 * 3. rawName é prefixo do nome ativo → retorna o nome ativo
 *    Ex: "RAFAEL" seria prefixo de "RAFAEL FERNANDES" (mas isso é raro)
 * 4. Matching por primeiras 2 palavras (nome + sobrenome principal)
 *    Ex: "BRENO MENEZES SILVA" → match com "BRENO MENEZES"
 * 
 * @param rawName - Nome bruto vindo dos dados (pode ser antigo ou novo)
 * @returns O nome ativo correspondente, ou null se não houver match com nenhum estagiário
 */
export function resolveActiveName(rawName: string): string | null {
  if (!rawName) return null;

  const normalized = rawName.toUpperCase().trim();
  if (!normalized) return null;

  // Verificar cache
  if (resolutionCache.has(normalized)) {
    return resolutionCache.get(normalized)!;
  }

  let result: string | null = null;

  // 0. Overrides manuais específicos
  if (MANUAL_OVERRIDES[normalized]) {
    result = MANUAL_OVERRIDES[normalized];
  }

  // 1. Match exato
  if (!result && activeNamesSet.has(normalized)) {
    result = normalized;
  }

  // 2. Nome ativo é prefixo do rawName (caso mais comum pós-crash)
  // Ex: "RAFAEL FERNANDES" é prefixo de "RAFAEL FERNANDES DA SILVA"
  if (!result) {
    for (const activeName of ACTIVE_INTERN_NAMES) {
      const activeUpper = activeName.toUpperCase().trim();
      // Verifica que o prefixo termina em boundary de palavra
      if (normalized.startsWith(activeUpper) && 
          (normalized.length === activeUpper.length || normalized[activeUpper.length] === ' ')) {
        result = activeUpper;
        break;
      }
    }
  }

  // 3. rawName é prefixo de um nome ativo
  // Ex: "GUILHERME PALHETA" seria prefixo de "GUILHERME PALHETA ALENCAR REIS"
  if (!result) {
    for (const activeName of ACTIVE_INTERN_NAMES) {
      const activeUpper = activeName.toUpperCase().trim();
      if (activeUpper.startsWith(normalized) && 
          (activeUpper.length === normalized.length || activeUpper[normalized.length] === ' ')) {
        result = activeUpper;
        break;
      }
    }
  }

  // 4. Matching por primeiras 2 palavras (nome + primeiro sobrenome)
  if (!result) {
    const rawWords = normalized.split(/\s+/);
    // Pegar as 2 primeiras palavras significativas (ignorar preposições como DE, DA, DOS)
    const significantWords = rawWords.filter(w => !['DE', 'DA', 'DO', 'DOS', 'DAS'].includes(w));
    
    if (significantWords.length >= 2) {
      const firstTwoSignificant = significantWords.slice(0, 2).join(' ');
      
      for (const activeName of ACTIVE_INTERN_NAMES) {
        const activeUpper = activeName.toUpperCase().trim();
        const activeWords = activeUpper.split(/\s+/).filter(w => !['DE', 'DA', 'DO', 'DOS', 'DAS'].includes(w));
        const activeFirstTwo = activeWords.slice(0, 2).join(' ');
        
        if (firstTwoSignificant === activeFirstTwo) {
          result = activeUpper;
          break;
        }
      }
    }
  }

  // Salvar no cache
  resolutionCache.set(normalized, result);
  return result;
}

/**
 * Verifica se um nome é exatamente um dos nomes ativos.
 */
export function isActiveName(name: string): boolean {
  return activeNamesSet.has((name || "").toUpperCase().trim());
}

/**
 * Normaliza um nome: se for um estagiário (ativo ou antigo), retorna o nome ativo.
 * Se não for estagiário (admin, moderador, etc), retorna o nome original sem alteração.
 * 
 * Útil para exibição — nunca retorna null, sempre retorna algo legível.
 */
export function normalizeDisplayName(rawName: string): string {
  const resolved = resolveActiveName(rawName);
  // Se resolveu para um ativo, usa o nome ativo
  if (resolved) return resolved;
  // Se não resolveu, retorna o original (pode ser admin/moderador)
  return (rawName || "").toUpperCase().trim();
}
