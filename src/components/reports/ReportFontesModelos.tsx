import React, { forwardRef } from 'react';
import { FONTE_DISCARD_REASONS, FonteDiscardReason } from '../../types';

export interface ModelStatItem {
  model: string;
  isCustom?: boolean;
  customName?: string;
  testadas: number;
  aprovadas: number;
  descartadas: number;
  motivos: Record<FonteDiscardReason, number>;
}

export interface ReportFontesModelosProps {
  modelStats: ModelStatItem[];
  totals: {
    totalTestadas: number;
    totalAprovadas: number;
    totalDescartadas: number;
    taxaDescarte: number;
    totalPorMotivo: Record<FonteDiscardReason, number>;
  };
  periodoLabel: string;
  dataGeracao: string;
}

const ReportFontesModelos = forwardRef<HTMLDivElement, ReportFontesModelosProps>(
  ({ modelStats, totals, periodoLabel, dataGeracao }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          width: '1180px',
          fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
          backgroundColor: '#FFFFFF',
          color: '#1E293B',
          padding: '0',
          margin: '0',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {/* ===== HEADER EXECUTIVO ===== */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
            padding: '38px 46px 32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative radial gradients */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundImage:
                'radial-gradient(circle at 15% 85%, rgba(99,102,241,0.2) 0%, transparent 50%), radial-gradient(circle at 85% 15%, rgba(244,63,94,0.15) 0%, transparent 50%)',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '22px', position: 'relative', zIndex: 1 }}>
            <img
              src="/images/redfoquinho.png"
              alt="Redfox Logo"
              style={{ width: '80px', height: '80px', objectFit: 'contain' }}
              crossOrigin="anonymous"
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span
                  style={{
                    backgroundColor: 'rgba(99, 102, 241, 0.3)',
                    color: '#C7D2FE',
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '1.5px',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    textTransform: 'uppercase',
                    border: '1px solid rgba(199, 210, 254, 0.2)',
                  }}
                >
                  Fechamento do Setor
                </span>
                <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 600 }}>• Laboratório de Testes</span>
              </div>
              <h1
                style={{
                  fontSize: '28px',
                  fontWeight: 900,
                  color: '#FFFFFF',
                  margin: '0 0 4px 0',
                  letterSpacing: '-0.5px',
                  lineHeight: '1.15',
                }}
              >
                RELAÇÃO DE FONTES POR MODELO
              </h1>
              <p
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#CBD5E1',
                  margin: 0,
                }}
              >
                Consolidação completa de fontes testadas, aprovadas, descartadas e motivos de descarte
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'right', position: 'relative', zIndex: 1 }}>
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '14px',
                padding: '12px 18px',
                display: 'inline-block',
              }}
            >
              <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>
                Período de Análise
              </div>
              <div style={{ fontSize: '15px', color: '#FFFFFF', fontWeight: 800 }}>
                {periodoLabel}
              </div>
              <div style={{ fontSize: '10px', color: '#818CF8', fontWeight: 600, marginTop: '4px' }}>
                Emissão: {dataGeracao}
              </div>
            </div>
          </div>
        </div>

        {/* ===== CONTEÚDO PRINCIPAL ===== */}
        <div style={{ padding: '34px 46px 40px' }}>
          {/* KPI CARDS RESUMO */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '16px',
              marginBottom: '26px',
            }}
          >
            {/* Total Testadas */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderTop: '4px solid #6366F1',
                borderRadius: '16px',
                padding: '18px 20px',
              }}
            >
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                Total de Fontes Testadas
              </div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#1E293B', lineHeight: '1' }}>
                {totals.totalTestadas.toLocaleString('pt-BR')}
              </div>
              <div style={{ fontSize: '11px', color: '#6366F1', fontWeight: 600, marginTop: '6px' }}>
                100% da amostragem do período
              </div>
            </div>

            {/* Total Aprovadas */}
            <div
              style={{
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderTop: '4px solid #10B981',
                borderRadius: '16px',
                padding: '18px 20px',
              }}
            >
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                Total Aprovadas
              </div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#15803D', lineHeight: '1' }}>
                {totals.totalAprovadas.toLocaleString('pt-BR')}
              </div>
              <div style={{ fontSize: '11px', color: '#16A34A', fontWeight: 700, marginTop: '6px' }}>
                {totals.totalTestadas > 0 ? ((totals.totalAprovadas / totals.totalTestadas) * 100).toFixed(1) : '0.0'}% de aproveitamento
              </div>
            </div>

            {/* Total Descartadas */}
            <div
              style={{
                backgroundColor: '#FFF1F2',
                border: '1px solid #FECDD3',
                borderTop: '4px solid #F43F5E',
                borderRadius: '16px',
                padding: '18px 20px',
              }}
            >
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#9F1239', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                Total Descartadas
              </div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#BE123C', lineHeight: '1' }}>
                {totals.totalDescartadas.toLocaleString('pt-BR')}
              </div>
              <div style={{ fontSize: '11px', color: '#E11D48', fontWeight: 700, marginTop: '6px' }}>
                {totals.taxaDescarte.toFixed(1)}% taxa de descarte
              </div>
            </div>

            {/* Taxa de Descarte Destacada */}
            <div
              style={{
                backgroundColor: '#0F172A',
                border: '1px solid #1E293B',
                borderTop: '4px solid #FB923C',
                borderRadius: '16px',
                padding: '18px 20px',
                color: '#FFFFFF',
              }}
            >
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                Índice de Perda (Descarte)
              </div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#FB923C', lineHeight: '1' }}>
                {totals.taxaDescarte.toFixed(1)}%
              </div>
              <div style={{ fontSize: '11px', color: '#CBD5E1', fontWeight: 500, marginTop: '6px' }}>
                {totals.totalDescartadas} descartes / {totals.totalTestadas} testes
              </div>
            </div>
          </div>

          {/* ===== RESUMO POR MOTIVO DE DESCARTE ===== */}
          <div
            style={{
              backgroundColor: '#FAFAFD',
              border: '1px solid #E2E8F0',
              borderRadius: '18px',
              padding: '20px 24px',
              marginBottom: '26px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#F43F5E',
                  }}
                />
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Consolidação dos Motivos de Descarte
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                Total de descartes com motivo catalogado: <strong>{totals.totalDescartadas} unidades</strong>
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
              {FONTE_DISCARD_REASONS.map((reason) => {
                const count = totals.totalPorMotivo[reason] || 0;
                const pct = totals.totalDescartadas > 0 ? (count / totals.totalDescartadas) * 100 : 0;
                return (
                  <div
                    key={reason}
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                      {reason}
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 900, color: count > 0 ? '#E11D48' : '#94A3B8' }}>
                      {count}
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', marginTop: '2px' }}>
                      {pct.toFixed(0)}% dos descartes
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ===== TABELA DETALHADA POR MODELO ===== */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '18px',
              overflow: 'hidden',
              boxShadow: '0 4px 15px -3px rgba(0,0,0,0.03)',
            }}
          >
            <div
              style={{
                backgroundColor: '#F8FAFC',
                padding: '16px 24px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Detalhamento por Modelo de Fonte
                </h3>
                <p style={{ fontSize: '11px', color: '#64748B', margin: '2px 0 0 0' }}>
                  Relação completa de todos os modelos avaliados no período
                </p>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#4338CA',
                  backgroundColor: '#EEF2FF',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  border: '1px solid #E0E7FF',
                }}
              >
                {modelStats.length} Modelo{modelStats.length !== 1 ? 's' : ''} Listado{modelStats.length !== 1 ? 's' : ''}
              </span>
            </div>

            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '11px',
                textAlign: 'left',
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: '#F1F5F9',
                    color: '#475569',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    fontSize: '9.5px',
                    letterSpacing: '0.5px',
                    borderBottom: '2px solid #CBD5E1',
                  }}
                >
                  <th style={{ padding: '12px 18px', width: '22%' }}>Modelo da Fonte</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center', width: '9%' }}>Testadas</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center', width: '9%' }}>Aprovadas</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center', width: '9%' }}>Descartadas</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center', width: '8%', color: '#9F1239' }}>Suja</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center', width: '9%', color: '#9F1239' }}>Muita Tinta</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center', width: '8%', color: '#9F1239' }}>Queimada</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center', width: '9%', color: '#9F1239' }}>Descascada</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center', width: '8%', color: '#9F1239' }}>Avarias</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', width: '9%' }}>% Descarte</th>
                </tr>
              </thead>
              <tbody>
                {modelStats.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '32px', textAlign: 'center', color: '#94A3B8', fontWeight: 600 }}>
                      Nenhum registro de teste de fontes no período selecionado.
                    </td>
                  </tr>
                ) : (
                  modelStats.map((item, idx) => {
                    const rowPct = item.testadas > 0 ? (item.descartadas / item.testadas) * 100 : 0;
                    const isEven = idx % 2 === 0;

                    return (
                      <tr
                        key={item.model + idx}
                        style={{
                          backgroundColor: isEven ? '#FFFFFF' : '#FAFAFD',
                          borderBottom: '1px solid #E2E8F0',
                        }}
                      >
                        {/* Nome do Modelo */}
                        <td style={{ padding: '11px 18px', fontWeight: 700, color: '#1E293B' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{item.customName || item.model}</span>
                            {item.isCustom && (
                              <span
                                style={{
                                  fontSize: '8.5px',
                                  fontWeight: 800,
                                  backgroundColor: '#EEF2FF',
                                  color: '#4F46E5',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  border: '1px solid #C7D2FE',
                                  textTransform: 'uppercase',
                                }}
                              >
                                Aleatória
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Testadas */}
                        <td style={{ padding: '11px 10px', textAlign: 'center', fontWeight: 800, color: '#334155' }}>
                          {item.testadas}
                        </td>

                        {/* Aprovadas */}
                        <td style={{ padding: '11px 10px', textAlign: 'center', fontWeight: 800, color: '#16A34A' }}>
                          <span style={{ backgroundColor: '#DCFCE7', padding: '2px 8px', borderRadius: '6px' }}>
                            {item.aprovadas}
                          </span>
                        </td>

                        {/* Descartadas */}
                        <td style={{ padding: '11px 10px', textAlign: 'center', fontWeight: 800, color: item.descartadas > 0 ? '#E11D48' : '#94A3B8' }}>
                          <span style={{ backgroundColor: item.descartadas > 0 ? '#FFE4E6' : '#F1F5F9', padding: '2px 8px', borderRadius: '6px' }}>
                            {item.descartadas}
                          </span>
                        </td>

                        {/* Suja */}
                        <td style={{ padding: '11px 8px', textAlign: 'center', fontWeight: item.motivos.SUJA > 0 ? 800 : 500, color: item.motivos.SUJA > 0 ? '#BE123C' : '#94A3B8' }}>
                          {item.motivos.SUJA || 0}
                        </td>

                        {/* Muita Tinta */}
                        <td style={{ padding: '11px 8px', textAlign: 'center', fontWeight: item.motivos['MUITA TINTA'] > 0 ? 800 : 500, color: item.motivos['MUITA TINTA'] > 0 ? '#BE123C' : '#94A3B8' }}>
                          {item.motivos['MUITA TINTA'] || 0}
                        </td>

                        {/* Queimada */}
                        <td style={{ padding: '11px 8px', textAlign: 'center', fontWeight: item.motivos.QUEIMADA > 0 ? 800 : 500, color: item.motivos.QUEIMADA > 0 ? '#BE123C' : '#94A3B8' }}>
                          {item.motivos.QUEIMADA || 0}
                        </td>

                        {/* Descascada */}
                        <td style={{ padding: '11px 8px', textAlign: 'center', fontWeight: item.motivos.DESCASCADA > 0 ? 800 : 500, color: item.motivos.DESCASCADA > 0 ? '#BE123C' : '#94A3B8' }}>
                          {item.motivos.DESCASCADA || 0}
                        </td>

                        {/* Avarias */}
                        <td style={{ padding: '11px 8px', textAlign: 'center', fontWeight: item.motivos.AVARIAS > 0 ? 800 : 500, color: item.motivos.AVARIAS > 0 ? '#BE123C' : '#94A3B8' }}>
                          {item.motivos.AVARIAS || 0}
                        </td>

                        {/* % Descarte */}
                        <td style={{ padding: '11px 16px', textAlign: 'right', fontWeight: 800, color: rowPct > 0 ? '#BE123C' : '#16A34A' }}>
                          {rowPct.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* TOTAIS GERAIS NO FOOTER */}
              <tfoot>
                <tr
                  style={{
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    fontWeight: 900,
                    fontSize: '11px',
                    borderTop: '2px solid #334155',
                  }}
                >
                  <td style={{ padding: '14px 18px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    TOTAIS GERAIS
                  </td>
                  <td style={{ padding: '14px 10px', textAlign: 'center', fontSize: '13px', color: '#FFFFFF' }}>
                    {totals.totalTestadas.toLocaleString('pt-BR')}
                  </td>
                  <td style={{ padding: '14px 10px', textAlign: 'center', fontSize: '13px', color: '#4ADE80' }}>
                    {totals.totalAprovadas.toLocaleString('pt-BR')}
                  </td>
                  <td style={{ padding: '14px 10px', textAlign: 'center', fontSize: '13px', color: '#FB7185' }}>
                    {totals.totalDescartadas.toLocaleString('pt-BR')}
                  </td>
                  <td style={{ padding: '14px 8px', textAlign: 'center', color: '#FECDD3' }}>
                    {totals.totalPorMotivo.SUJA || 0}
                  </td>
                  <td style={{ padding: '14px 8px', textAlign: 'center', color: '#FECDD3' }}>
                    {totals.totalPorMotivo['MUITA TINTA'] || 0}
                  </td>
                  <td style={{ padding: '14px 8px', textAlign: 'center', color: '#FECDD3' }}>
                    {totals.totalPorMotivo.QUEIMADA || 0}
                  </td>
                  <td style={{ padding: '14px 8px', textAlign: 'center', color: '#FECDD3' }}>
                    {totals.totalPorMotivo.DESCASCADA || 0}
                  </td>
                  <td style={{ padding: '14px 8px', textAlign: 'center', color: '#FECDD3' }}>
                    {totals.totalPorMotivo.AVARIAS || 0}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', color: '#FB923C' }}>
                    {totals.taxaDescarte.toFixed(1)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ===== RODAPÉ INSTITUCIONAL ===== */}
          <div
            style={{
              marginTop: '28px',
              paddingTop: '16px',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '10px',
              color: '#94A3B8',
              fontWeight: 600,
            }}
          >
            <div>
              <span>Sistema de Monitoramento e Gestão de Equipe</span>
              <span style={{ margin: '0 8px' }}>•</span>
              <span>Laboratório de Testes & Manutenção</span>
            </div>
            <div>
              <span>Documento gerado automaticamente para fins de fechamento e prestação de contas</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ReportFontesModelos.displayName = 'ReportFontesModelos';

export default ReportFontesModelos;
