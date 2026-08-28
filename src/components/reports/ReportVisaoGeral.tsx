import React, { forwardRef } from 'react';

interface ReportVisaoGeralProps {
  kpis: {
    total: number;
    comodato: number;
    taxa: number;
    totalFontesTestadas: number;
    totalFontesAprovadas?: number;
    totalFontesDescartadas: number;
  };
  top5Equipamentos: Array<{ name: string; count: number }>;
  periodoLabel: string;
  dataGeracao: string;
}

const ReportVisaoGeral = forwardRef<HTMLDivElement, ReportVisaoGeralProps>(
  ({ kpis, top5Equipamentos, periodoLabel, dataGeracao }, ref) => {
    const taxaComodato = kpis.total > 0 ? ((kpis.comodato / kpis.total) * 100) : 0;
    const fontesAprovadas = kpis.totalFontesAprovadas ?? (kpis.totalFontesTestadas - kpis.totalFontesDescartadas);
    const taxaFontesDescartadas = kpis.totalFontesTestadas > 0
      ? ((kpis.totalFontesDescartadas / kpis.totalFontesTestadas) * 100)
      : 0;

    const maxCount = top5Equipamentos.length > 0 ? Math.max(...top5Equipamentos.map(e => e.count)) : 1;
    const barColors = ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'];

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
          {/* Decorative pattern */}
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
                RELATÓRIO DE FECHAMENTO SETOR
              </h1>
              <h2 style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#93C5FD',
                margin: '0 0 8px 0',
                textTransform: 'uppercase',
                letterSpacing: '2px',
              }}>
                Visão Geral
              </h2>
              <p style={{
                fontSize: '13px',
                fontWeight: 500,
                color: '#94A3B8',
                margin: 0,
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

        {/* ===== SUBTITLE BAR ===== */}
        <div style={{
          padding: '16px 48px',
          backgroundColor: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
        }}>
          <p style={{ fontSize: '14px', fontWeight: 500, color: '#64748B', margin: 0 }}>
            Painel analítico das movimentações entre o Laboratório de Testes e Base Principal.
          </p>
        </div>

        {/* ===== KPI CARDS (5 Totais Gerais) ===== */}
        <div style={{
          padding: '32px 48px',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '16px',
        }}>
          {/* Total Movimentado */}
          <KPICard
            icon={<BoxIcon />}
            label="Total Equipamentos Movimentados"
            value={kpis.total.toLocaleString('pt-BR')}
            badge="100%"
            badgeColor="#059669"
            badgeBg="#ECFDF5"
            badgeBorder="#A7F3D0"
            subtitle="no período"
            accentColor="#4F46E5"
            accentBg="#EEF2FF"
          />

          {/* Aprovados em Comodato */}
          <KPICard
            icon={<CheckIcon />}
            label="Aprovados (Comodato)"
            value={kpis.comodato.toLocaleString('pt-BR')}
            badge={`${taxaComodato.toFixed(1)}%`}
            badgeColor="#059669"
            badgeBg="#ECFDF5"
            badgeBorder="#A7F3D0"
            subtitle="das movimentações"
            accentColor="#059669"
            accentBg="#ECFDF5"
          />

          {/* Fontes Testadas */}
          <KPICard
            icon={<MonitorIcon />}
            label="Fontes Testadas"
            value={kpis.totalFontesTestadas.toLocaleString('pt-BR')}
            accentColor="#2563EB"
            accentBg="#EFF6FF"
          />

          {/* Fontes Aprovadas */}
          <KPICard
            icon={<CheckIcon />}
            label="Fontes Aprovadas"
            value={fontesAprovadas.toLocaleString('pt-BR')}
            accentColor="#059669"
            accentBg="#ECFDF5"
          />

          {/* Fontes Descartadas */}
          <KPICard
            icon={<TrashIcon />}
            label="Fontes Descartadas"
            value={kpis.totalFontesDescartadas.toLocaleString('pt-BR')}
            badge={`${taxaFontesDescartadas.toFixed(1)}%`}
            badgeColor="#DC2626"
            badgeBg="#FEF2F2"
            badgeBorder="#FECACA"
            subtitle="das fontes testadas"
            accentColor="#DC2626"
            accentBg="#FEF2F2"
          />
        </div>

        {/* ===== BOTTOM SECTION: Chart + Highlights ===== */}
        <div style={{
          padding: '0 48px 40px',
          display: 'grid',
          gridTemplateColumns: '1.6fr 1fr',
          gap: '24px',
          alignItems: 'start',
        }}>
          {/* Top 5 Chart */}
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '20px',
            padding: '28px 32px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{ marginBottom: '8px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1E293B', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Top 5 Equipamentos Mais Movimentados
              </h3>
              <p style={{ fontSize: '12px', fontWeight: 500, color: '#94A3B8', margin: 0 }}>
                Quantidade de movimentações no período
              </p>
            </div>
            
            <div style={{ marginTop: '24px' }}>
              {top5Equipamentos.map((equip, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  marginBottom: idx < top5Equipamentos.length - 1 ? '16px' : '0',
                }}>
                  <div style={{
                    width: '160px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#475569',
                    textAlign: 'right',
                    flexShrink: 0,
                    lineHeight: '1.3',
                  }}>
                    {equip.name}
                  </div>
                  <div style={{
                    flex: 1,
                    height: '32px',
                    backgroundColor: '#F1F5F9',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    position: 'relative',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.max((equip.count / maxCount) * 100, 8)}%`,
                      background: `linear-gradient(90deg, ${barColors[idx] || '#2563EB'}, ${barColors[Math.min(idx + 1, barColors.length - 1)]})`,
                      borderRadius: '8px',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                  <div style={{
                    fontSize: '15px',
                    fontWeight: 900,
                    color: '#1E293B',
                    minWidth: '50px',
                    textAlign: 'right',
                  }}>
                    {equip.count.toLocaleString('pt-BR')}
                  </div>
                </div>
              ))}
              
              {top5Equipamentos.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8', fontSize: '14px' }}>
                  Sem dados disponíveis
                </div>
              )}
            </div>
          </div>

          {/* Destaques do Período */}
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
                Destaques do Período
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <HighlightItem
                icon={<BoxIcon size={16} />}
                iconBg="#4F46E5"
                text={<>Total de movimentações<br /><strong style={{ fontSize: '18px', color: '#1E293B' }}>{kpis.total.toLocaleString('pt-BR')} equipamentos</strong></>}
              />
              <HighlightItem
                icon={<CheckIcon size={16} />}
                iconBg="#059669"
                text={<>Aprovados em comodato<br /><strong style={{ fontSize: '18px', color: '#1E293B' }}>{taxaComodato.toFixed(1)}% do total movimentado</strong></>}
              />
              <HighlightItem
                icon={<MonitorIcon size={16} />}
                iconBg="#2563EB"
                text={<>Fontes testadas<br /><strong style={{ fontSize: '18px', color: '#1E293B' }}>{kpis.totalFontesTestadas.toLocaleString('pt-BR')} unidades</strong></>}
              />
              <HighlightItem
                icon={<TrashIcon size={16} />}
                iconBg="#DC2626"
                text={<>Fontes descartadas<br /><strong style={{ fontSize: '18px', color: '#1E293B' }}>{taxaFontesDescartadas.toFixed(1)}% em relação às fontes boas</strong></>}
              />
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

ReportVisaoGeral.displayName = 'ReportVisaoGeral';
export default ReportVisaoGeral;


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
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '16px',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          backgroundColor: accentBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accentColor,
        }}>
          {icon}
        </div>
        <span style={{
          fontSize: '11px',
          fontWeight: 700,
          color: '#64748B',
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          lineHeight: '1.3',
        }}>
          {label}
        </span>
      </div>
      <div style={{
        fontSize: '38px',
        fontWeight: 900,
        color: '#1E293B',
        lineHeight: '1',
        marginBottom: badge ? '8px' : '0',
        letterSpacing: '-1px',
      }}>
        {value}
      </div>
      {badge && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
          <span style={{
            fontSize: '14px',
            fontWeight: 800,
            color: badgeColor,
            backgroundColor: badgeBg,
            border: `1px solid ${badgeBorder}`,
            padding: '4px 10px',
            borderRadius: '8px',
          }}>
            {badge}
          </span>
          {subtitle && (
            <span style={{ fontSize: '11px', fontWeight: 500, color: '#94A3B8' }}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function HighlightItem({ icon, iconBg, text }: { icon: React.ReactNode; iconBg: string; text: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
      <div style={{
        width: '28px',
        height: '28px',
        borderRadius: '8px',
        backgroundColor: iconBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginTop: '2px',
      }}>
        {icon}
      </div>
      <div style={{ fontSize: '13px', fontWeight: 500, color: '#64748B', lineHeight: '1.5' }}>
        {text}
      </div>
    </div>
  );
}


// ============== SVG ICONS ==============

function BoxIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
      <path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
    </svg>
  );
}

function CheckIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  );
}

function MonitorIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>
    </svg>
  );
}

function TrashIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
    </svg>
  );
}
