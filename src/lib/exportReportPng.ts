import { toPng } from 'html-to-image';

/**
 * Renders a given DOM node to a high-resolution PNG and triggers a download.
 * @param node - The DOM element to render
 * @param filename - The output filename (without extension)
 */
export async function exportNodeToPng(node: HTMLElement, filename: string): Promise<void> {
  try {
    const dataUrl = await toPng(node, {
      quality: 1,
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: '#ffffff',
      style: {
        transform: 'scale(1)',
        transformOrigin: 'top left',
      },
    });

    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Erro ao gerar relatório PNG:', error);
    throw error;
  }
}

/**
 * Returns a formatted period label from the filter state.
 */
export function getFilterPeriodLabel(filterMode: string, filterValue: string): string {
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  if (filterMode === 'Todas' || !filterValue) return 'Todo o Período';

  if (filterMode === 'Ano') return filterValue;

  if (filterMode === 'Mes') {
    const parts = filterValue.split('-');
    if (parts.length === 2) {
      const mesIdx = parseInt(parts[1], 10) - 1;
      return `${meses[mesIdx] || parts[1]} de ${parts[0]}`;
    }
    return filterValue;
  }

  if (filterMode === 'Dia') {
    const parts = filterValue.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return filterValue;
  }

  if (filterMode === 'Range') {
    const [start, end] = filterValue.split('|');
    if (start && end) {
      const fmtStart = start.split('-').reverse().join('/');
      const fmtEnd = end.split('-').reverse().join('/');
      return `${fmtStart} a ${fmtEnd}`;
    }
    return filterValue;
  }

  return filterValue;
}

/**
 * Generates the filename for a report based on type and period.
 */
export function getReportFilename(reportType: 'VisaoGeral' | 'AssistenciaAvarias' | 'MonitoramentoEquipe' | string, filterMode: string, filterValue: string): string {
  const meses = [
    'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  let periodSuffix = 'TodoPeriodo';
  
  if (filterMode === 'Mes' && filterValue) {
    const parts = filterValue.split('-');
    if (parts.length === 2) {
      const mesIdx = parseInt(parts[1], 10) - 1;
      periodSuffix = `${meses[mesIdx] || parts[1]}_${parts[0]}`;
    }
  } else if (filterMode === 'Ano' && filterValue) {
    periodSuffix = filterValue;
  } else if (filterMode === 'Dia' && filterValue) {
    periodSuffix = filterValue.replace(/-/g, '');
  }

  return `Relatorio_${reportType}_${periodSuffix}`;
}

