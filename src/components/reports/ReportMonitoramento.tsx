import React, { forwardRef } from 'react';

export interface EmployeeProductionStat {
  name: string;
  limpos: number;
  testados: number;
  total: number;
}

export interface ReportMonitoramentoProps {
  kpis: {
    total: number;
    limpos: number;
    testados: number;
  };
  dataByFuncionario: EmployeeProductionStat[];
  periodoLabel: string;
  dataGeracao: string;
}

const ReportMonitoramento = forwardRef<HTMLDivElement, ReportMonitoramentoProps>(
  ({ kpis, dataByFuncionario, periodoLabel, dataGeracao }, ref) => {
    // Determine highlights from dataByFuncionario
    const topProducer = dataByFuncionario.length > 0 
      ? [...dataByFuncionario].sort((a, b) => b.total - a.total)[0] 
      : null;
      
    const topCleaner = dataByFuncionario.length > 0 
      ? [...dataByFuncionario].sort((a, b) => b.limpos - a.limpos)[0] 
      : null;
      
    const topTester = dataByFuncionario.length > 0 
      ? [...dataByFuncionario].sort((a, b) => b.testados - a.testados)[0] 
      : null;

    const maxTotal = dataByFuncionario.length > 0
      ? Math.max(...dataByFuncionario.map(d => d.total), 1)
      : 1;

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
              alt="Logo"
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
                RELATÓRIO DE MONITORAMENTO DA EQUIPE
              </h1>
              <h2 style={{
                fontSize: '16px',
                fontWeight: 700,
                color: '#93C5FD',
                margin: '0 0 6px 0',
                letterSpacing: '1.5px',
              }}>
                Produtividade • Laboratório de Testes
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
            Painel analítico de produtividade individual, equipamentos limpos e testados no Laboratório de Testes.
          </p>
        </div>

        {/* ===== 3 MAIN KPI CARDS ===== */}
        <div style={{
          padding: '32px 48px',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px',
        }}>
          {/* Produção Geral */}
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '20px',
            padding: '24px 28px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
          }}>
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: '4px',
              backgroundColor: '#3B82F6',
            }} />
            <div style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '10px',
            }}>
              Produção Geral
            </div>
            <div style={{
              fontSize: '44px',
              fontWeight: 900,
              color: '#1E293B',
              lineHeight: '1',
              letterSpacing: '-1px',
            }}>
              {kpis.total.toLocaleString('pt-BR')}
            </div>
          </div>

          {/* Equipamentos Limpos */}
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '20px',
            padding: '24px 28px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
          }}>
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: '4px',
              backgroundColor: '#10B981',
            }} />
            <div style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '10px',
            }}>
              Equipamentos Limpos
            </div>
            <div style={{
              fontSize: '44px',
              fontWeight: 900,
              color: '#1E293B',
              lineHeight: '1',
              letterSpacing: '-1px',
            }}>
              {kpis.limpos.toLocaleString('pt-BR')}
            </div>
          </div>

          {/* Equipamentos Testados */}
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '20px',
            padding: '24px 28px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
          }}>
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: '4px',
              backgroundColor: '#F59E0B',
            }} />
            <div style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '10px',
            }}>
              Equipamentos Testados
            </div>
            <div style={{
              fontSize: '44px',
              fontWeight: 900,
              color: '#1E293B',
              lineHeight: '1',
              letterSpacing: '-1px',
            }}>
              {kpis.testados.toLocaleString('pt-BR')}
            </div>
          </div>
        </div>

        {/* ===== BOTTOM SECTION: Employee Chart + Highlights ===== */}
        <div style={{
          padding: '0 48px 40px',
          display: 'grid',
          gridTemplateColumns: '1.6fr 1fr',
          gap: '24px',
          alignItems: 'start',
        }}>
          {/* Chart by Employee */}
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '20px',
            padding: '28px 32px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1E293B', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                PRODUÇÃO POR COLABORADOR
              </h3>
              <p style={{ fontSize: '12px', fontWeight: 500, color: '#94A3B8', margin: 0 }}>
                Comparativo entre equipamentos limpos e testados
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {dataByFuncionario.slice(0, 8).map((collab, idx) => {
                const pctLimpos = maxTotal > 0 ? (collab.limpos / maxTotal) * 100 : 0;
                const pctTestados = maxTotal > 0 ? (collab.testados / maxTotal) * 100 : 0;

                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '140px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#475569',
                      textAlign: 'left',
                      flexShrink: 0,
                      textTransform: 'uppercase',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }} title={collab.name}>
                      {collab.name}
                    </div>

                    <div style={{
                      flex: 1,
                      height: '24px',
                      backgroundColor: '#F1F5F9',
                      borderRadius: '12px',
                      display: 'flex',
                      overflow: 'hidden',
                      position: 'relative',
                    }}>
                      {/* Limpos bar */}
                      {collab.limpos > 0 && (
                        <div style={{
                          height: '100%',
                          width: `${pctLimpos}%`,
                          backgroundColor: '#10B981',
                          borderTopLeftRadius: '12px',
                          borderBottomLeftRadius: '12px',
                          borderTopRightRadius: collab.testados === 0 ? '12px' : '0',
                          borderBottomRightRadius: collab.testados === 0 ? '12px' : '0',
                        }} />
                      )}
                      {/* Testados bar */}
                      {collab.testados > 0 && (
                        <div style={{
                          height: '100%',
                          width: `${pctTestados}%`,
                          backgroundColor: '#F59E0B',
                          borderTopLeftRadius: collab.limpos === 0 ? '12px' : '0',
                          borderBottomLeftRadius: collab.limpos === 0 ? '12px' : '0',
                          borderTopRightRadius: '12px',
                          borderBottomRightRadius: '12px',
                        }} />
                      )}
                    </div>

                    <div style={{
                      fontSize: '13px',
                      fontWeight: 800,
                      color: '#334155',
                      minWidth: '85px',
                      textAlign: 'right',
                    }}>
                      {collab.total.toLocaleString('pt-BR')} <span style={{ fontSize: '11px', fontWeight: 500, color: '#94A3B8' }}>total</span>
                    </div>
                  </div>
                );
              })}

              {dataByFuncionario.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8', fontSize: '13px' }}>
                  Nenhum registro de produção encontrado no período selecionado.
                </div>
              )}
            </div>

            {/* Chart Legend */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '24px',
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid #F1F5F9',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Limpos</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Testados</span>
              </div>
            </div>
          </div>

          {/* Destaques do Mês / Período */}
          <div style={{
            background: 'linear-gradient(135deg, #EFF6FF 0%, #F0F9FF 100%)',
            border: '1px solid #BFDBFE',
            borderRadius: '20px',
            padding: '28px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                backgroundColor: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-2.34"/><path d="M14 14.66V17c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-2.34"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
                </svg>
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#1E293B', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                DESTAQUES DO MÊS
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Maior produção */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  backgroundColor: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#FFFFFF', flexShrink: 0, marginTop: '2px',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>Maior produção</div>
                  <div style={{ fontSize: '14px', fontWeight: 900, color: '#1E293B', textTransform: 'uppercase' }}>
                    {topProducer ? topProducer.name : "Nenhum"}
                  </div>
                  {topProducer && (
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#2563EB' }}>
                      {topProducer.total.toLocaleString('pt-BR')} equipamentos
                    </div>
                  )}
                </div>
              </div>

              {/* Maior volume de limpezas */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  backgroundColor: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#FFFFFF', flexShrink: 0, marginTop: '2px',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>Maior volume de limpezas</div>
                  <div style={{ fontSize: '14px', fontWeight: 900, color: '#1E293B', textTransform: 'uppercase' }}>
                    {topCleaner ? topCleaner.name : "Nenhum"}
                  </div>
                  {topCleaner && (
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#10B981' }}>
                      {topCleaner.limpos.toLocaleString('pt-BR')} equipamentos
                    </div>
                  )}
                </div>
              </div>

              {/* Maior volume de testes */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  backgroundColor: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#FFFFFF', flexShrink: 0, marginTop: '2px',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>Maior volume de testes</div>
                  <div style={{ fontSize: '14px', fontWeight: 900, color: '#1E293B', textTransform: 'uppercase' }}>
                    {topTester ? topTester.name : "Nenhum"}
                  </div>
                  {topTester && (
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#F59E0B' }}>
                      {topTester.testados.toLocaleString('pt-BR')} equipamentos
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{
              marginTop: '28px',
              paddingTop: '16px',
              borderTop: '1px solid #BFDBFE',
              fontSize: '11px',
              color: '#64748B',
              fontStyle: 'italic',
            }}>
              Indicadores apresentados com base no fechamento mensal de produtividade.
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8' }}>
              Relatório gerado com base nos filtros aplicados na aba "Monitoramento da Equipe".
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

ReportMonitoramento.displayName = 'ReportMonitoramento';
export default ReportMonitoramento;
