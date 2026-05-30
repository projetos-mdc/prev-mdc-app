'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const G='#069E6E', N='#2D2E47', S='#3E7996', T='#2F6C82', C='#00BAB4'

const STATUS_CFG: Record<string, {label:string,color:string,bg:string}> = {
  aguardando: {label:'Aguardando contato', color:'#92400E', bg:'#FEF3C7'},
  agendado:   {label:'Agendado',           color:'#1E40AF', bg:'#EFF6FF'},
  avaliado:   {label:'Avaliação realizada',color:'#166534', bg:'#DCFCE7'},
  tratamento: {label:'Em tratamento',      color:'#065F46', bg:'#CCFBF1'},
  finalizado: {label:'Finalizado',         color:'#4C1D95', bg:'#EDE9FE'},
}

type Gestor = {
  id:string; nome:string; email:string; role:string;
  unidade_id:string; unidades:{nome:string}|null
}
type Indicacao = {
  id:string; paciente_nome:string; paciente_telefone:string;
  observacoes:string|null; status:string; data_indicacao:string;
  pdf_url:string|null; valor_repasse:number|null;
  parceiros:{nome:string;especialidade:string}|null
}
type Parceiro = {
  id:string; nome:string; email:string; whatsapp:string;
  tipo:string; especialidade:string; segmento:string;
  status:string; data_cadastro:string
}

export default function GestorDashboard() {
  const router = useRouter()
  const [gestor, setGestor] = useState<Gestor|null>(null)
  const [indicacoes, setIndicacoes] = useState<Indicacao[]>([])
  const [parceiros, setParceiros] = useState<Parceiro[]>([])
  const [tab, setTab] = useState<'indicacoes'|'parceiros'>('indicacoes')
  const [loading, setLoading] = useState(true)

  // PDF modal
  const [pdfModal, setPdfModal] = useState<{id:string, url:string}|null>(null)
  const [pdfInput, setPdfInput] = useState('')
  const [pdfSaving, setPdfSaving] = useState(false)

  const loadData = useCallback(async (g: Gestor) => {
    const unidadeId = g.unidade_id

    const [{ data: inds }, { data: parts }] = await Promise.all([
      supabase
        .from('indicacoes')
        .select('*, parceiros(nome, especialidade)')
        .eq('unidade_id', unidadeId)
        .order('data_indicacao', { ascending: false }),
      supabase
        .from('parceiros')
        .select('*')
        .eq('unidade_id', unidadeId)
        .order('data_cadastro', { ascending: false }),
    ])

    setIndicacoes(inds || [])
    setParceiros(parts || [])
  }, [])

  useEffect(() => {
    const raw = localStorage.getItem('gestor_session')
    if (!raw) { router.push('/login'); return }
    const g = JSON.parse(raw) as Gestor
    setGestor(g)
    loadData(g).finally(() => setLoading(false))
  }, [router, loadData])

  async function updateStatus(id: string, novoStatus: string) {
    await supabase.from('indicacoes').update({ status: novoStatus }).eq('id', id)
    setIndicacoes(prev => prev.map(i => i.id === id ? { ...i, status: novoStatus } : i))
  }

  async function salvarPdf() {
    if (!pdfModal) return
    setPdfSaving(true)
    await supabase.from('indicacoes').update({ pdf_url: pdfInput.trim() || null }).eq('id', pdfModal.id)
    setIndicacoes(prev => prev.map(i => i.id === pdfModal.id ? { ...i, pdf_url: pdfInput.trim() || null } : i))
    setPdfSaving(false)
    setPdfModal(null)
  }

  function sair() { localStorage.removeItem('gestor_session'); router.push('/login') }

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <p style={{ color:'#64748B' }}>Carregando...</p>
    </div>
  )
  if (!gestor) return null

  const unidadeNome = gestor.unidades?.nome || 'Minha Unidade'

  const stats = [
    { label: 'Total indicações', value: String(indicacoes.length), color: N },
    { label: 'Aguardando',       value: String(indicacoes.filter(i => i.status === 'aguardando').length), color: '#92400E' },
    { label: 'Avaliações',       value: String(indicacoes.filter(i => ['avaliado','tratamento','finalizado'].includes(i.status)).length), color: G },
    { label: 'Parceiros ativos', value: String(parceiros.length), color: S },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'#F1F5F9' }}>

      {/* HEADER */}
      <header style={{ background: N, padding: '0 20px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
            <img src="/logo-mdc.png" alt="MDC" style={{ height:32, filter:'brightness(0) invert(1)' }} />
            <div>
              <div style={{ color:'#fff', fontSize:13, fontWeight:600 }}>Painel do Gestor</div>
              <div style={{ color:C, fontSize:11 }}>{unidadeNome}</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
            <div style={{ color:'#fff', fontSize:13 }}>{gestor.nome}</div>
            <button onClick={sair} style={{ background:'none', border:'1px solid #2F6C82', color:'#B0E8E6', padding:'5px 12px', borderRadius:7, fontSize:12, cursor:'pointer' }}>Sair</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 16px' }}>

        {/* STATS */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
          {stats.map(s => (
            <div key={s.label} style={{ background:'#fff', borderRadius:12, border:'1px solid #E2E8F0', padding:'14px 16px' }}>
              <div style={{ fontSize:22, fontWeight:700, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:12, color:'#64748B', marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div style={{ display:'flex', gap:4, background:'#fff', borderRadius:10, padding:3, border:'1px solid #E2E8F0', width:'fit-content', marginBottom:18 }}>
          {([['indicacoes','📋 Indicações'],['parceiros','👥 Parceiros']] as const).map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding:'7px 18px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13,
              background: tab===id ? G : 'transparent',
              color: tab===id ? '#fff' : '#64748B',
              fontWeight: tab===id ? 600 : 400,
            }}>{label}</button>
          ))}
        </div>

        {/* TAB: INDICAÇÕES */}
        {tab === 'indicacoes' && (
          <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', overflow:'hidden' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1.2fr 1fr 1.6fr 100px 90px', gap:8, padding:'10px 16px', background:'#F8FAFC', borderBottom:'1px solid #E2E8F0' }}>
              {['Paciente','Parceiro','Data','Status','Repasse','PDF'].map(h => (
                <div key={h} style={{ fontSize:11, fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.05em' }}>{h}</div>
              ))}
            </div>

            {indicacoes.length === 0 && (
              <div style={{ padding:'40px 20px', textAlign:'center', color:'#94A3B8', fontSize:14 }}>
                Nenhuma indicação ainda para esta unidade.
              </div>
            )}

            {indicacoes.map((ind, i) => {
              const st = STATUS_CFG[ind.status] || STATUS_CFG.aguardando
              const data = new Date(ind.data_indicacao).toLocaleDateString('pt-BR')
              return (
                <div key={ind.id} style={{ display:'grid', gridTemplateColumns:'1.5fr 1.2fr 1fr 1.6fr 100px 90px', gap:8, padding:'12px 16px', borderBottom: i < indicacoes.length-1 ? '1px solid #F1F5F9' : 'none', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:N }}>{ind.paciente_nome}</div>
                    {ind.paciente_telefone && <div style={{ fontSize:11, color:'#94A3B8' }}>{ind.paciente_telefone}</div>}
                    {ind.observacoes && <div style={{ fontSize:11, color:'#94A3B8', marginTop:2, fontStyle:'italic' }} title={ind.observacoes}>{ind.observacoes.substring(0,40)}{ind.observacoes.length>40?'...':''}</div>}
                  </div>
                  <div>
                    <div style={{ fontSize:13, color:N }}>{ind.parceiros?.nome || '—'}</div>
                    <div style={{ fontSize:11, color:'#94A3B8' }}>{ind.parceiros?.especialidade || ''}</div>
                  </div>
                  <div style={{ fontSize:12, color:'#64748B' }}>{data}</div>
                  <div>
                    <select
                      value={ind.status}
                      onChange={e => updateStatus(ind.id, e.target.value)}
                      style={{ padding:'4px 8px', borderRadius:8, border:`1.5px solid ${st.color}40`, background:st.bg, color:st.color, fontSize:11, fontWeight:600, cursor:'pointer', outline:'none' }}
                    >
                      {Object.entries(STATUS_CFG).map(([val,cfg]) => (
                        <option key={val} value={val}>{cfg.label}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ fontSize:13, color: ind.valor_repasse ? G : '#CBD5E1', fontWeight: ind.valor_repasse ? 600 : 400 }}>
                    {ind.valor_repasse ? `R$ ${ind.valor_repasse}` : '—'}
                  </div>
                  <div>
                    <button
                      onClick={() => { setPdfModal({id:ind.id, url:ind.pdf_url||''}); setPdfInput(ind.pdf_url||'') }}
                      style={{ border:`1px solid ${ind.pdf_url ? G : '#CBD5E1'}`, background: ind.pdf_url ? '#E4F5F3' : '#fff', color: ind.pdf_url ? G : '#94A3B8', padding:'4px 10px', borderRadius:7, fontSize:11, cursor:'pointer', fontWeight:600 }}
                    >{ind.pdf_url ? '📄 Ver' : '+ PDF'}</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* TAB: PARCEIROS */}
        {tab === 'parceiros' && (
          <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', overflow:'hidden' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr 1fr 1fr 100px', gap:8, padding:'10px 16px', background:'#F8FAFC', borderBottom:'1px solid #E2E8F0' }}>
              {['Nome','Especialidade','Tipo','Contato','Cadastro'].map(h => (
                <div key={h} style={{ fontSize:11, fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.05em' }}>{h}</div>
              ))}
            </div>

            {parceiros.length === 0 && (
              <div style={{ padding:'40px 20px', textAlign:'center', color:'#94A3B8', fontSize:14 }}>
                Nenhum parceiro cadastrado nesta unidade ainda.
              </div>
            )}

            {parceiros.map((p, i) => (
              <div key={p.id} style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr 1fr 1fr 100px', gap:8, padding:'12px 16px', borderBottom: i < parceiros.length-1 ? '1px solid #F1F5F9' : 'none', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:N }}>{p.nome}</div>
                  <div style={{ fontSize:11, color:'#94A3B8' }}>{p.email}</div>
                </div>
                <div style={{ fontSize:13, color:'#64748B' }}>{p.especialidade}</div>
                <div style={{ fontSize:12, color:'#64748B' }}>{p.tipo === 'profissional' ? 'Profissional' : 'Empresa'}</div>
                <div style={{ fontSize:12, color:'#64748B' }}>{p.whatsapp}</div>
                <div style={{ fontSize:11, color:'#94A3B8' }}>{new Date(p.data_cadastro).toLocaleDateString('pt-BR')}</div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL PDF */}
      {pdfModal && (
        <div onClick={() => setPdfModal(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:16, padding:'24px', maxWidth:460, width:'100%' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h3 style={{ fontSize:16, fontWeight:700, color:N }}>Link do PDF</h3>
              <button onClick={() => setPdfModal(null)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#94A3B8' }}>×</button>
            </div>
            <p style={{ fontSize:13, color:'#64748B', marginBottom:12 }}>Cole abaixo o link do PDF da proposta de tratamento. O parceiro verá este link no portal dele.</p>
            <input
              value={pdfInput}
              onChange={e => setPdfInput(e.target.value)}
              placeholder="https://drive.google.com/..."
              style={{ width:'100%', padding:'10px 13px', borderRadius:10, border:'1.5px solid #CBD5E1', fontSize:14, color:N, outline:'none', marginBottom:14 }}
            />
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setPdfModal(null)} style={{ flex:1, padding:'10px', borderRadius:10, border:'1.5px solid #CBD5E1', background:'#fff', color:'#475569', fontSize:13, cursor:'pointer' }}>Cancelar</button>
              <button onClick={salvarPdf} disabled={pdfSaving} style={{ flex:2, padding:'10px', borderRadius:10, border:'none', background:pdfSaving?'#CBD5E1':G, color:'#fff', fontSize:13, fontWeight:600, cursor:pdfSaving?'not-allowed':'pointer' }}>
                {pdfSaving ? 'Salvando...' : 'Salvar link'}
              </button>
            </div>
            {pdfModal.url && (
              <a href={pdfModal.url} target="_blank" rel="noreferrer" style={{ display:'block', textAlign:'center', marginTop:12, fontSize:12, color:G }}>Abrir PDF atual →</a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
