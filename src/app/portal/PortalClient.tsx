'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentPartner, clearCurrentPartner } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import nextDynamic from 'next/dynamic'

const IndsPorMesChart = nextDynamic(() => import('@/components/PortalCharts').then(m => ({ default: m.IndsPorMesChart })), { ssr: false })
const StatusPieChart = nextDynamic(() => import('@/components/PortalCharts').then(m => ({ default: m.StatusPieChart })), { ssr: false })
const RepasseAreaChart = nextDynamic(() => import('@/components/PortalCharts').then(m => ({ default: m.RepasseAreaChart })), { ssr: false })

const G='#069E6E', N='#2D2E47', S='#3E7996', C='#00BAB4'
const COLORS = [G, S, C, '#F59E0B', '#8B5CF6', '#EF4444']

const STATUS_CFG: Record<string, {label:string, color:string, bg:string, icon:string}> = {
  aguardando:  {label:'Aguardando contato', color:'#92400E', bg:'#FEF3C7', icon:'⏳'},
  agendado:    {label:'Agendado',           color:'#1E40AF', bg:'#EFF6FF', icon:'📅'},
  avaliado:    {label:'Avaliação realizada',color:'#166534', bg:'#DCFCE7', icon:'✅'},
  tratamento:  {label:'Em tratamento',      color:'#065F46', bg:'#CCFBF1', icon:'🦷'},
  finalizado:  {label:'Finalizado',         color:'#4C1D95', bg:'#EDE9FE', icon:'🏁'},
}

type Tab = 'dashboard'|'pacientes'|'nova'|'conta'

type Partner = {
  id: string; nome: string; email: string; tipo: string;
  especialidade: string; segmento: string; unidade_id: string | null;
}
type Indicacao = {
  id: string; paciente_nome: string; paciente_telefone: string;
  observacoes: string; status: string; data_indicacao: string;
  pdf_url: string | null; valor_repasse: number | null;
}

function KpiCard({ label, value, sub, color, icon }: { label:string; value:string|number; sub?:string; color:string; icon:string }) {
  return (
    <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'18px 20px', display:'flex', gap:14, alignItems:'flex-start' }}>
      <div style={{ width:44, height:44, borderRadius:12, background:color+'15', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{icon}</div>
      <div>
        <div style={{ fontSize:26, fontWeight:800, color, lineHeight:1 }}>{value}</div>
        <div style={{ fontSize:13, fontWeight:600, color:'#334155', marginTop:4 }}>{label}</div>
        {sub && <div style={{ fontSize:11, color:'#94A3B8', marginTop:2 }}>{sub}</div>}
      </div>
    </div>
  )
}

export default function Portal() {
  const router = useRouter()
  const [partner, setPartner] = useState<Partner|null>(null)
  const [mounted, setMounted] = useState(false)
  const [indicacoes, setIndicacoes] = useState<Indicacao[]>([])
  const [tab, setTab] = useState<Tab>('dashboard')
  const [loading, setLoading] = useState(true)
  const [pdfModal, setPdfModal] = useState<Indicacao|null>(null)

  const [novaForm, setNovaForm] = useState({ nome:'', telefone:'', obs:'' })
  const [novaSaving, setNovaSaving] = useState(false)
  const [novaOk, setNovaOk] = useState(false)
  const [novaErro, setNovaErro] = useState('')
  const [tipoInd, setTipoInd] = useState<'s1'|'s2'|''>('')
  const [dataIni, setDataIni] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
  })
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().split('T')[0])

  const loadIndicacoes = useCallback(async (id: string) => {
    const { data } = await supabase.from('indicacoes').select('*')
      .eq('parceiro_id', id).order('data_indicacao', { ascending: false })
    setIndicacoes(data || [])
  }, [])

  const [lastUpdated, setLastUpdated] = useState<Date|null>(null)
  const partnerRef = useRef<Partner|null>(null)

  useEffect(() => {
    const p = getCurrentPartner()
    if (!p) { router.push('/login'); return }
    setPartner(p)
    partnerRef.current = p
    loadIndicacoes(p.id).finally(() => { setLoading(false); setLastUpdated(new Date()); setMounted(true) })

    // Atualiza status automaticamente a cada 30s
    const interval = setInterval(async () => {
      if (partnerRef.current) {
        await loadIndicacoes(partnerRef.current.id)
        setLastUpdated(new Date())
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [router, loadIndicacoes])

  async function enviarIndicacao() {
    if (!novaForm.nome || !novaForm.telefone) { setNovaErro('Nome e telefone são obrigatórios.'); return }
    if (!tipoInd) { setNovaErro('Selecione o tipo de indicação.'); return }
    setNovaSaving(true); setNovaErro('')
    const { error } = await supabase.from('indicacoes').insert({
      parceiro_id: partner!.id,
      unidade_id: partner!.unidade_id,
      paciente_nome: novaForm.nome.trim(),
      paciente_telefone: novaForm.telefone.trim(),
      observacoes: novaForm.obs.trim(),
      status: 'aguardando',
      valor_repasse: tipoInd === 's2' ? 150 : null,
    })
    setNovaSaving(false)
    if (error) { setNovaErro('Erro ao enviar indicação.'); return }
    setNovaOk(true)
    setNovaForm({ nome:'', telefone:'', obs:'' })
    setTipoInd('')
    await loadIndicacoes(partner!.id)
    setTimeout(() => { setNovaOk(false); setTab('pacientes') }, 2000)
  }

  function sair() { clearCurrentPartner(); router.push('/login') }

  // ── dados calculados ──
  const totalRepasse = indicacoes
    .filter(i => i.valor_repasse && ['avaliado','tratamento','finalizado'].includes(i.status))
    .reduce((sum, i) => sum + (i.valor_repasse||0), 0)

  const indsPorMes = (() => {
    const map: Record<string,number> = {}
    indicacoes.forEach(i => {
      const d = new Date(i.data_indicacao)
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      map[key] = (map[key]||0)+1
    })
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    return Object.entries(map).sort().slice(-6).map(([k,v]) => {
      const [y,m] = k.split('-')
      return { mes: meses[parseInt(m)-1]+'/'+y.slice(2), total: v }
    })
  })()

  const statusData = Object.entries(STATUS_CFG).map(([key,cfg]) => ({
    name: cfg.label, value: indsFiltradas.filter(i=>i.status===key).length,
    color: cfg.color, icon: cfg.icon,
  })).filter(d => d.value > 0)

  const repassePorMes = (() => {
    const map: Record<string,number> = {}
    indicacoes
      .filter(i => i.valor_repasse && ['avaliado','tratamento','finalizado'].includes(i.status))
      .forEach(i => {
        const d = new Date(i.data_indicacao)
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
        map[key] = (map[key]||0)+(i.valor_repasse||0)
      })
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    return Object.entries(map).sort().slice(-6).map(([k,v]) => {
      const [y,m] = k.split('-')
      return { mes: meses[parseInt(m)-1]+'/'+y.slice(2), valor: v }
    })
  })()

  const indsFiltradas = indicacoes.filter(i => {
    const d = i.data_indicacao.split('T')[0]
    return d >= dataIni && d <= dataFim
  })

  const taxaConversao = indicacoes.length
    ? Math.round(indicacoes.filter(i=>['avaliado','tratamento','finalizado'].includes(i.status)).length / indicacoes.length * 100)
    : 0

  const ultimasInds = indicacoes.slice(0, 5)

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <p style={{ color:'#64748B' }}>Carregando...</p>
    </div>
  )
  if (!partner) return null

  return (
    <div style={{ minHeight:'100vh', background:'#F1F5F9' }}>

      {/* HEADER */}
      <header style={{ background:N, padding:'0 20px' }}>
        <div style={{ maxWidth:1000, margin:'0 auto', height:56, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <img src="/logo-mdc.png" alt="MDC" style={{ height:32 }} />
            <div>
              <div style={{ color:'#fff', fontSize:13, fontWeight:600 }}>Portal do Parceiro</div>
              <div style={{ color:C, fontSize:11 }}>{partner.especialidade}</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ color:'#fff', fontSize:13 }}>{partner.nome}</span>
            {lastUpdated && <span style={{ color:'#64748B', fontSize:11 }}>↻ {lastUpdated.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span>}
            <button onClick={() => setTab('nova')} style={{ background:G, border:'none', color:'#fff', padding:'6px 14px', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer' }}>+ Indicar paciente</button>
            <button onClick={sair} style={{ background:'none', border:'1px solid #2F6C82', color:'#B0E8E6', padding:'5px 12px', borderRadius:7, fontSize:12, cursor:'pointer' }}>Sair</button>
          </div>
        </div>
      </header>

      {/* NAV */}
      <div style={{ background:'#fff', borderBottom:'1px solid #E2E8F0' }}>
        <div style={{ maxWidth:1000, margin:'0 auto', display:'flex', padding:'0 20px' }}>
          {([['dashboard','📊 Dashboard'],['pacientes','📋 Meus Pacientes'],['nova','➕ Nova Indicação'],['conta','👤 Minha Conta']] as const).map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding:'14px 18px', border:'none', background:'none', cursor:'pointer', fontSize:13, fontWeight:600,
              color: tab===id ? G : '#64748B',
              borderBottom: tab===id ? `2px solid ${G}` : '2px solid transparent',
            }}>{label}</button>
          ))}
        </div>
      </div>

      <main style={{ maxWidth:1000, margin:'0 auto', padding:'24px 16px' }}>

        {/* ══════════════ DASHBOARD ══════════════ */}
        {tab === 'dashboard' && (
          <div>
            {/* FILTRO DE DATA */}
            <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E2E8F0', padding:'12px 18px', marginBottom:18, display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
              <span style={{ fontSize:13, fontWeight:600, color:'#475569' }}>Período:</span>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input type="date" value={dataIni} onChange={e=>setDataIni(e.target.value)}
                  style={{ padding:'6px 10px', borderRadius:8, border:'1.5px solid #CBD5E1', fontSize:13, color:N, outline:'none' }} />
                <span style={{ color:'#94A3B8', fontSize:13 }}>até</span>
                <input type="date" value={dataFim} onChange={e=>setDataFim(e.target.value)}
                  style={{ padding:'6px 10px', borderRadius:8, border:'1.5px solid #CBD5E1', fontSize:13, color:N, outline:'none' }} />
              </div>
              <span style={{ fontSize:12, color:'#94A3B8' }}>
                {indsFiltradas.length} indicaç{indsFiltradas.length===1?'ão':'ões'} no período
              </span>
            </div>
            {/* KPIs */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:12 }}>
              <KpiCard label="Total de Indicações" value={indicacoes.length} icon="📋" color={N} />
              <KpiCard label="Avaliações Realizadas" value={indicacoes.filter(i=>['avaliado','tratamento','finalizado'].includes(i.status)).length} sub={`${taxaConversao}% de conversão`} icon="✅" color={G} />
              <KpiCard label="A Receber" value={`R$ ${totalRepasse}`} sub="indicações qualificadas" icon="💰" color={S} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12, marginBottom:24 }}>
              <KpiCard label="Consultoria em Domicílio" value={indicacoes.filter(i=>!i.valor_repasse).length} sub="orientação e treinamento" icon="🏠" color={'#065F46'} />
              <KpiCard label="Avaliação em Parceria" value={indicacoes.filter(i=>!!i.valor_repasse).length} sub="com repasse de R$ 150" icon="🤝" color={S} />
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>

              {/* Indicações por mês */}
              <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'20px' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:14 }}>Minhas indicações por mês</div>
                {indsPorMes.length === 0
                  ? <p style={{ color:'#94A3B8', fontSize:13, textAlign:'center', padding:'30px 0' }}>Sem indicações ainda. <button onClick={()=>setTab('nova')} style={{ color:G, background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>Faça a primeira →</button></p>
                  : <IndsPorMesChart data={indsPorMes} />
                }
              </div>

              {/* Status dos pacientes */}
              <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'20px' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:14 }}>Status dos meus pacientes</div>
                {statusData.length === 0
                  ? <p style={{ color:'#94A3B8', fontSize:13, textAlign:'center', padding:'30px 0' }}>Sem dados ainda.</p>
                  : <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                      <StatusPieChart data={statusData} />
                      <div style={{ flex:1 }}>
                        {statusData.map((d,i) => (
                          <div key={d.name} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
                            <div style={{ width:9, height:9, borderRadius:'50%', background:COLORS[i%COLORS.length], flexShrink:0 }} />
                            <span style={{ fontSize:11, color:'#475569', flex:1 }}>{d.icon} {d.name}</span>
                            <span style={{ fontSize:12, fontWeight:700, color:N }}>{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                }
              </div>
            </div>

            {/* Repasse por mês */}
            {repassePorMes.length > 0 && (
              <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'20px', marginBottom:20 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:14 }}>Repasse financeiro por mês (R$)</div>
                <RepasseAreaChart data={repassePorMes} />
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

              {/* Progresso dos status */}
              <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'20px' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:16 }}>Funil de atendimento</div>
                {indicacoes.length === 0
                  ? <p style={{ color:'#94A3B8', fontSize:13 }}>Sem dados ainda.</p>
                  : Object.entries(STATUS_CFG).map(([key, cfg]) => {
                      const qtd = indicacoes.filter(i=>i.status===key).length
                      const pct = Math.round(qtd / indicacoes.length * 100)
                      return (
                        <div key={key} style={{ marginBottom:12 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                            <span style={{ fontSize:12, color:'#475569' }}>{cfg.icon} {cfg.label}</span>
                            <span style={{ fontSize:12, fontWeight:700, color:N }}>{qtd} <span style={{ color:'#94A3B8', fontWeight:400 }}>({pct}%)</span></span>
                          </div>
                          <div style={{ height:7, background:'#F1F5F9', borderRadius:4 }}>
                            <div style={{ height:7, borderRadius:4, background:cfg.color, width:`${pct}%`, transition:'width .4s' }} />
                          </div>
                        </div>
                      )
                    })
                }
              </div>

              {/* Últimas indicações */}
              <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'20px' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:14 }}>Últimas indicações</div>
                {ultimasInds.length === 0
                  ? <p style={{ color:'#94A3B8', fontSize:13 }}>Sem indicações ainda.</p>
                  : ultimasInds.map((ind, i) => {
                      const st = STATUS_CFG[ind.status]||STATUS_CFG.aguardando
                      return (
                        <div key={ind.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom: i<ultimasInds.length-1?'1px solid #F1F5F9':'none' }}>
                          <div style={{ width:32, height:32, borderRadius:'50%', background:st.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>{st.icon}</div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:13, fontWeight:600, color:N }}>{ind.paciente_nome}</div>
                            <div style={{ fontSize:11, color:'#94A3B8' }}>{new Date(ind.data_indicacao).toLocaleDateString('pt-BR')}</div>
                          </div>
                          <span style={{ fontSize:11, padding:'3px 9px', borderRadius:20, background:st.bg, color:st.color, fontWeight:500 }}>{st.label}</span>
                        </div>
                      )
                    })
                }
                {indicacoes.length > 5 && (
                  <button onClick={()=>setTab('pacientes')} style={{ marginTop:10, fontSize:12, color:G, background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>Ver todos →</button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ PACIENTES ══════════════ */}
        {tab === 'pacientes' && (
          <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', overflow:'hidden' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1.8fr 1fr 1.5fr 90px', gap:8, padding:'10px 16px', background:'#F8FAFC', borderBottom:'1px solid #E2E8F0' }}>
              {['Paciente','Data','Status','Proposta'].map(h => (
                <div key={h} style={{ fontSize:11, fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.05em' }}>{h}</div>
              ))}
            </div>
            {indicacoes.length === 0 && (
              <div style={{ padding:'40px 20px', textAlign:'center', color:'#94A3B8', fontSize:14 }}>
                Nenhuma indicação ainda.{' '}
                <button onClick={()=>setTab('nova')} style={{ color:G, background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>Faça a primeira →</button>
              </div>
            )}
            {indicacoes.map((ind, i) => {
              const st = STATUS_CFG[ind.status]||STATUS_CFG.aguardando
              return (
                <div key={ind.id} style={{ display:'grid', gridTemplateColumns:'1.8fr 1fr 1.5fr 90px', gap:8, padding:'12px 16px', borderBottom:i<indicacoes.length-1?'1px solid #F1F5F9':'none', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:N }}>{ind.paciente_nome}</div>
                    {ind.paciente_telefone && <div style={{ fontSize:11, color:'#94A3B8' }}>{ind.paciente_telefone}</div>}
                    <span style={{ display:'inline-block', marginTop:4, padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:600,
                      background: ind.valor_repasse ? '#EFF6FF' : '#E4F5F3',
                      color: ind.valor_repasse ? '#1E40AF' : '#065F46'
                    }}>{ind.valor_repasse ? '🤝 Avaliação em Parceria' : '🏠 Consultoria em Domicílio'}</span>
                  </div>
                  <div style={{ fontSize:12, color:'#64748B' }}>{new Date(ind.data_indicacao).toLocaleDateString('pt-BR')}</div>
                  <div>
                    <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:500, color:st.color, background:st.bg }}>{st.icon} {st.label}</span>
                  </div>
                  <div>
                    {ind.pdf_url
                      ? <button onClick={()=>setPdfModal(ind)} style={{ border:'1px solid #CBD5E1', background:'#fff', color:'#475569', padding:'4px 10px', borderRadius:7, fontSize:12, cursor:'pointer' }}>📄 Ver PDF</button>
                      : <span style={{ fontSize:12, color:'#CBD5E1' }}>—</span>
                    }
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ══════════════ NOVA INDICAÇÃO ══════════════ */}
        {tab === 'nova' && (
          <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'28px 24px', maxWidth:520 }}>
            <h3 style={{ fontSize:17, fontWeight:700, color:N, marginBottom:4 }}>Nova indicação</h3>
            <p style={{ fontSize:13, color:'#64748B', marginBottom:22 }}>Preencha os dados do paciente que deseja indicar ao MDC.</p>

            {novaOk && (
              <div style={{ background:'#DCFCE7', border:'1px solid #86EFAC', borderRadius:10, padding:'12px 16px', marginBottom:16, color:'#166534', fontSize:13, fontWeight:500 }}>
                ✅ Indicação enviada! Entraremos em contato em breve.
              </div>
            )}

            <div style={{ marginBottom:18 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:8 }}>Tipo de indicação *</label>
              {[
                { val:'s1', icon:'🏠', t:'Consultoria em Domicílio', color:G, d:'Vamos até a casa do paciente e oferecemos uma consultoria completa de orientação de higiene bucal para treinamento do familiar e cuidadores.' },
                { val:'s2', icon:'💰', t:'Avaliação em Parceria', color:S, tag:'R$ 150 para você', d:'Fazemos a avaliação e tratamento com um acompanhamento mútuo do paciente (o paciente ganha o Kit de Higiene Bucal).' },
              ].map(opt => {
                const sel = tipoInd===opt.val
                return (
                  <button key={opt.val} onClick={()=>setTipoInd(opt.val as 's1'|'s2')} style={{
                    display:'block', width:'100%', padding:0, marginBottom:10,
                    border:`1.5px solid ${sel?opt.color:'#CBD5E1'}`, borderRadius:12, cursor:'pointer', textAlign:'left',
                    background: sel ? opt.color+'12' : '#fff',
                  }}>
                    <div style={{ padding:'10px 14px', borderBottom:`1px solid ${sel?opt.color+'40':'#E2E8F0'}`, display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:16 }}>{opt.icon}</span>
                      <span style={{ fontSize:13, fontWeight:600, color:opt.color }}>{opt.t}</span>
                      {opt.tag && <span style={{ marginLeft:'auto', padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600, background:opt.color+'20', color:opt.color }}>{opt.tag}</span>}
                    </div>
                    <p style={{ padding:'8px 14px', fontSize:12, color:'#64748B', margin:0, lineHeight:1.5 }}>{opt.d}</p>
                  </button>
                )
              })}
            </div>

            {[
              { label:'Nome do paciente *', key:'nome', ph:'Nome completo' },
              { label:'Telefone de contato *', key:'telefone', ph:'(61) 99999-9999' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom:14 }}>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:5 }}>{f.label}</label>
                <input value={(novaForm as any)[f.key]} onChange={e=>setNovaForm(p=>({...p,[f.key]:e.target.value}))}
                  placeholder={f.ph} style={{ width:'100%', padding:'10px 13px', borderRadius:10, border:'1.5px solid #CBD5E1', fontSize:14, color:N, outline:'none' }} />
              </div>
            ))}

            <div style={{ marginBottom:18 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:5 }}>Observações clínicas (opcional)</label>
              <textarea value={novaForm.obs} onChange={e=>setNovaForm(p=>({...p,obs:e.target.value}))}
                placeholder="Contexto clínico, diagnóstico, necessidades especiais..." rows={3}
                style={{ width:'100%', padding:'10px 13px', borderRadius:10, border:'1.5px solid #CBD5E1', fontSize:14, color:N, outline:'none', resize:'vertical' }} />
            </div>

            {tipoInd==='s2' && (
              <div style={{ background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#1E40AF' }}>
                💰 Você receberá <strong>R$ 150</strong> após a avaliação ser realizada.
              </div>
            )}

            {novaErro && <p style={{ color:'#EF4444', fontSize:13, marginBottom:10 }}>{novaErro}</p>}

            <button onClick={enviarIndicacao} disabled={novaSaving} style={{
              width:'100%', padding:'12px', borderRadius:10, border:'none',
              background:novaSaving?'#CBD5E1':G, color:'#fff', fontWeight:600, fontSize:14, cursor:novaSaving?'not-allowed':'pointer',
            }}>{novaSaving?'Enviando...':'Enviar indicação →'}</button>
          </div>
        )}

        {/* ══════════════ MINHA CONTA ══════════════ */}
        {tab === 'conta' && (
          <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'28px 24px', maxWidth:500 }}>
            <h3 style={{ fontSize:17, fontWeight:700, color:N, marginBottom:20 }}>Minha conta</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
              {[
                ['Nome', partner.nome],
                ['E-mail', partner.email],
                ['Especialidade', partner.especialidade],
                ['Modelos disponíveis', 'Consultoria · Avaliação em Parceria'],
              ].map(([label,val]) => (
                <div key={label}>
                  <div style={{ fontSize:11, fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>{label}</div>
                  <div style={{ fontSize:14, color:N, fontWeight:500 }}>{val}</div>
                </div>
              ))}
            </div>
            {/* Mini resumo */}
            <div style={{ background:'#F8FAFC', borderRadius:12, padding:'14px 16px', marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:10 }}>Resumo da sua parceria</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:22, fontWeight:800, color:N }}>{indicacoes.length}</div>
                  <div style={{ fontSize:11, color:'#64748B' }}>Indicações</div>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:22, fontWeight:800, color:G }}>{taxaConversao}%</div>
                  <div style={{ fontSize:11, color:'#64748B' }}>Conversão</div>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:22, fontWeight:800, color:S }}>R$ {totalRepasse}</div>
                  <div style={{ fontSize:11, color:'#64748B' }}>A receber</div>
                </div>
              </div>
            </div>
            <button onClick={sair} style={{ width:'100%', padding:'11px', borderRadius:10, border:'1.5px solid #CBD5E1', background:'#fff', color:'#475569', fontSize:13, fontWeight:500, cursor:'pointer' }}>Sair do portal</button>
          </div>
        )}
      </main>

      {/* MODAL PDF */}
      {pdfModal && (
        <div onClick={()=>setPdfModal(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:20 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:16, padding:'24px', maxWidth:420, width:'100%' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'start', marginBottom:16 }}>
              <div>
                <div style={{ fontSize:11, color:'#94A3B8', fontWeight:600, marginBottom:4 }}>PROPOSTA DE TRATAMENTO</div>
                <div style={{ fontSize:17, fontWeight:600, color:N }}>{pdfModal.paciente_nome}</div>
              </div>
              <button onClick={()=>setPdfModal(null)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#94A3B8' }}>×</button>
            </div>
            <div style={{ background:'#F8FAFC', borderRadius:10, padding:14, marginBottom:16 }}>
              {[['Data', new Date(pdfModal.data_indicacao).toLocaleDateString('pt-BR')],['Status', STATUS_CFG[pdfModal.status]?.label||pdfModal.status]].map(([k,v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #E2E8F0', fontSize:13 }}>
                  <span style={{ color:'#64748B' }}>{k}</span>
                  <span style={{ fontWeight:600, color:N }}>{v}</span>
                </div>
              ))}
            </div>
            {pdfModal.pdf_url
              ? <a href={pdfModal.pdf_url} target="_blank" rel="noreferrer" style={{ display:'block', width:'100%', padding:'12px', borderRadius:10, background:G, color:'#fff', textAlign:'center', textDecoration:'none', fontWeight:600, fontSize:14 }}>📥 Baixar PDF completo</a>
              : <p style={{ textAlign:'center', fontSize:13, color:'#94A3B8' }}>PDF ainda não disponível.</p>
            }
          </div>
        </div>
      )}
    </div>
  )
}
