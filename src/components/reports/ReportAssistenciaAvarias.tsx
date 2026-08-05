import React, { forwardRef } from 'react';

interface ReportAssistenciaAvariasProps {
  avariasKpis: {
    totalEntradas: number;
    totalMovimentado: number;
    movimentado: { qtd: number; pct: number };
    sucata: { qtd: number; pct: number };
    consertoMinas: { qtd: number; pct: number };
    rma: { qtd: number; pct: number };
  };
  periodoLabel: string;
  dataGeracao: string;
}

const ReportAssistenciaAvarias = forwardRef<HTMLDivElement, ReportAssistenciaAvariasProps>(
  ({ avariasKpis, periodoLabel, dataGeracao }, ref) => {

    // Donut chart data
    const donutData = [
      { label: 'Recuperados', value: avariasKpis.movimentado.qtd, pct: avariasKpis.movimentado.pct, color: '#059669' },
      { label: 'Sucata', value: avariasKpis.sucata.qtd, pct: avariasKpis.sucata.pct, color: '#DC2626' },
      { label: 'Conserto Minas', value: avariasKpis.consertoMinas.qtd, pct: avariasKpis.consertoMinas.pct, color: '#F59E0B' },
      { label: 'RMA', value: avariasKpis.rma.qtd, pct: avariasKpis.rma.pct, color: '#8B5CF6' },
    ];

    const total = avariasKpis.totalEntradas;

    // Build donut segments as SVG
    const donutSegments = buildDonutSegments(donutData.map(d => d.value), donutData.map(d => d.color));

    return (
      <div
        ref={ref}
        style={{
          width: '1080px',
          fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
          backgroundColor: '#FFFFFF',
          color: '#1E293B',
          padding: '0',
          margin: '0',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {/* ===== HEADER ===== */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%)',
          padding: '40px 48px 36px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            top: 0, right: 0, bottom: 0, left: 0,
            backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(59,130,246,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(147,197,253,0.1) 0%, transparent 50%)',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', position: 'relative', zIndex: 1 }}>
            <img
              src="/images/redfoquinho.png"
              alt="Redfoquinho"
              style={{ width: '80px', height: '80px', objectFit: 'contain' }}
              crossOrigin="anonymous"
            />
            <div>
              <h1 style={{
                fontSize: '26px',
                fontWeight: 800,
                color: '#FFFFFF',
                margin: '0 0 4px 0',
                letterSpacing: '-0.5px',
                lineHeight: '1.2',
              }}>
                RELATÓRIO DE ASSISTÊNCIA & AVARIAS
              </h1>
              <p style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#94A3B8',
                margin: '8px 0 0 0',
              }}>
                Análise das entradas e destinos dos equipamentos no setor.
              </p>
              <p style={{
                fontSize: '13px',
                fontWeight: 500,
                color: '#64748B',
                margin: '4px 0 0 0',
              }}>
                Setor: Laboratório de Testes
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'right', position: 'relative', zIndex: 1 }}>
            <div style={{
              background: 'rgba(37,99,235,0.25)',
              border: '1px solid rgba(147,197,253,0.3)',
              borderRadius: '16px',
              padding: '14px 24px',
              marginBottom: '12px',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#93C5FD', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>
                Período
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', textTransform: 'uppercase' }}>
                {periodoLabel}
              </div>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              justifyContent: 'flex-end',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#94A3B8' }}>
                Gerado em {dataGeracao}
              </span>
            </div>
          </div>
        </div>

        {/* ===== KPI CARDS ===== */}
        <div style={{
          padding: '32px 48px',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '16px',
        }}>
          {/* Total Entradas */}
          <KPICard
            icon={<InboxIcon />}
            label="Total de Entradas no Setor"
            value={avariasKpis.totalEntradas.toLocaleString('pt-BR')}
            subtitle="Equipamentos"
            accentColor="#4F46E5"
            accentBg="#EEF2FF"
          />

          {/* Recuperados */}
          <KPICard
            icon={<CheckIcon />}
            label="Recuperados"
            value={avariasKpis.movimentado.qtd.toLocaleString('pt-BR')}
            badge={`${avariasKpis.movimentado.pct.toFixed(1)}%`}
            badgeColor="#059669"
            badgeBg="#ECFDF5"
            badgeBorder="#A7F3D0"
            subtitle="do total de entradas"
            accentColor="#059669"
            accentBg="#ECFDF5"
          />

          {/* Sucata */}
          <KPICard
            icon={<TrashIcon />}
            label="Sucata"
            value={avariasKpis.sucata.qtd.toLocaleString('pt-BR')}
            badge={`${avariasKpis.sucata.pct.toFixed(1)}%`}
            badgeColor="#DC2626"
            badgeBg="#FEF2F2"
            badgeBorder="#FECACA"
            subtitle="do total de entradas"
            accentColor="#DC2626"
            accentBg="#FEF2F2"
          />

          {/* Conserto Minas */}
          <KPICard
            icon={<WrenchIcon />}
            label="Conserto Minas"
            value={avariasKpis.consertoMinas.qtd.toLocaleString('pt-BR')}
            badge={`${avariasKpis.consertoMinas.pct.toFixed(1)}%`}
            badgeColor="#D97706"
            badgeBg="#FFFBEB"
            badgeBorder="#FDE68A"
            subtitle="do total de entradas"
            accentColor="#D97706"
            accentBg="#FFFBEB"
          />

          {/* RMA */}
          <KPICard
            icon={<ShieldIcon />}
            label="RMA"
            value={avariasKpis.rma.qtd.toLocaleString('pt-BR')}
            badge={`${avariasKpis.rma.pct.toFixed(1)}%`}
            badgeColor="#7C3AED"
            badgeBg="#F5F3FF"
            badgeBorder="#DDD6FE"
            subtitle="do total de entradas"
            accentColor="#7C3AED"
            accentBg="#F5F3FF"
          />
        </div>

        {/* ===== BOTTOM: Donut Chart + Summary ===== */}
        <div style={{
          padding: '0 48px 40px',
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: '24px',
          alignItems: 'start',
        }}>
          {/* Donut Chart */}
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '20px',
            padding: '28px 32px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{ marginBottom: '8px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1E293B', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Destino dos Equipamentos
              </h3>
              <p style={{ fontSize: '12px', fontWeight: 500, color: '#94A3B8', margin: 0 }}>
                Proporção dos equipamentos por destino
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '32px', marginTop: '24px' }}>
              {/* SVG Donut */}
              <div style={{ position: 'relative', width: '220px', height: '220px', flexShrink: 0 }}>
                <svg viewBox="0 0 220 220" width="220" height="220">
                  {donutSegments}
                </svg>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#1E293B', lineHeight: '1' }}>
                    {total.toLocaleString('pt-BR')}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', marginTop: '4px' }}>
                    Total de entradas
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                {donutData.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: item.color,
                      flexShrink: 0,
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                          {item.label}
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#1E293B', marginLeft: '8px' }}>
                          {item.pct.toFixed(1)}%
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 500, color: '#94A3B8' }}>
                        {item.value.toLocaleString('pt-BR')} equipamentos
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Resumo do Período */}
          <div style={{
            background: 'linear-gradient(135deg, #EFF6FF 0%, #F0F9FF 100%)',
            border: '1px solid #BFDBFE',
            borderRadius: '20px',
            padding: '28px 28px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                backgroundColor: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#1E293B', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Resumo do Período
              </h3>
            </div>

            <div style={{ fontSize: '14px', fontWeight: 500, color: '#475569', lineHeight: '1.7' }}>
              <p style={{ margin: '0 0 16px 0' }}>
                No período selecionado,{' '}
                <strong style={{ color: '#059669' }}>{avariasKpis.movimentado.pct.toFixed(1)}%</strong>{' '}
                dos equipamentos recebidos foram recuperados e retornaram à operação.
              </p>

              {avariasKpis.sucata.qtd > 0 && (
                <p style={{ margin: '0 0 16px 0' }}>
                  <strong style={{ color: '#DC2626' }}>{avariasKpis.sucata.qtd.toLocaleString('pt-BR')}</strong>{' '}
                  equipamentos ({avariasKpis.sucata.pct.toFixed(1)}%) foram enviados para sucata.
                </p>
              )}

              {avariasKpis.consertoMinas.qtd > 0 && (
                <p style={{ margin: '0 0 16px 0' }}>
                  <strong style={{ color: '#D97706' }}>{avariasKpis.consertoMinas.qtd.toLocaleString('pt-BR')}</strong>{' '}
                  equipamentos ({avariasKpis.consertoMinas.pct.toFixed(1)}%) foram destinados a Conserto Minas.
                </p>
              )}

              <div style={{
                marginTop: '20px',
                padding: '16px',
                backgroundColor: 'rgba(255,255,255,0.7)',
                borderRadius: '12px',
                border: '1px solid #DBEAFE',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>
                  Total de entradas analisadas
                </div>
                <div style={{ fontSize: '32px', fontWeight: 900, color: '#1E293B' }}>
                  {avariasKpis.totalEntradas.toLocaleString('pt-BR')}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 500, color: '#94A3B8' }}>
                  equipamentos
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== FOOTER ===== */}
        <div style={{
          padding: '20px 48px',
          borderTop: '1px solid #E2E8F0',
          backgroundColor: '#F8FAFC',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8' }}>
              Relatório gerado com base nos filtros aplicados na aba "Fechamento Setor".
            </span>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8' }}>
            Dados atualizados em: {dataGeracao}
          </span>
        </div>
      </div>
    );
  }
);

ReportAssistenciaAvarias.displayName = 'ReportAssistenciaAvarias';
export default ReportAssistenciaAvarias;


// ============== HELPER COMPONENTS ==============

function KPICard({ icon, label, value, badge, badgeColor, badgeBg, badgeBorder, subtitle, accentColor, accentBg }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  badge?: string;
  badgeColor?: string;
  badgeBg?: string;
  badgeBorder?: string;
  subtitle?: string;
  accentColor: string;
  accentBg: string;
}) {
  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: '20px',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '14px',
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          backgroundColor: accentBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accentColor,
        }}>
          {icon}
        </div>
        <span style={{
          fontSize: '10px',
          fontWeight: 700,
          color: '#64748B',
          textTransform: 'uppercase',
          letterSpacing: '0.7px',
          lineHeight: '1.3',
        }}>
          {label}
        </span>
      </div>
      <div style={{
        fontSize: '34px',
        fontWeight: 900,
        color: '#1E293B',
        lineHeight: '1',
        letterSpacing: '-1px',
      }}>
        {value}
      </div>
      {badge && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '13px',
            fontWeight: 800,
            color: badgeColor,
            backgroundColor: badgeBg,
            border: `1px solid ${badgeBorder}`,
            padding: '3px 8px',
            borderRadius: '8px',
          }}>
            {badge}
          </span>
          {subtitle && (
            <span style={{ fontSize: '10px', fontWeight: 500, color: '#94A3B8' }}>
              {subtitle}
            </span>
          )}
        </div>
      )}
      {!badge && subtitle && (
        <div style={{ fontSize: '10px', fontWeight: 500, color: '#94A3B8', marginTop: '6px' }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}


// ============== DONUT CHART BUILDER ==============

function buildDonutSegments(values: number[], colors: string[]): React.ReactNode[] {
  const total = values.reduce((sum, v) => sum + v, 0);
  if (total === 0) {
    return [
      <circle key="empty" cx="110" cy="110" r="80" fill="none" stroke="#E2E8F0" strokeWidth="35" />
    ];
  }

  const segments: React.ReactNode[] = [];
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  let cumulativeOffset = 0;

  values.forEach((value, index) => {
    if (value === 0) return;
    const proportion = value / total;
    const dashLength = proportion * circumference;
    const gapLength = circumference - dashLength;

    segments.push(
      <circle
        key={index}
        cx="110"
        cy="110"
        r={radius}
        fill="none"
        stroke={colors[index]}
        strokeWidth="35"
        strokeDasharray={`${dashLength} ${gapLength}`}
        strokeDashoffset={-cumulativeOffset}
        transform="rotate(-90 110 110)"
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
    );

    cumulativeOffset += dashLength;
  });

  return segments;
}


// ============== SVG ICONS ==============

function InboxIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}
