'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCurrentPartner, clearCurrentPartner } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const G='#069E6E', N='#2D2E47', S='#3E7996', T='#2F6C82', C='#00BAB4'

const STATUS_CFG: Record<string, {label:string, color:string, bg:string}> = {
  aguardando:  {label:'Aguardando contato', color:'#92400E', bg:'#FEF3C7'},
  agendado:    {label:'Agendado',           color:'#1E40AF', bg:'#EFF6FF'},
  avaliado:    {label:'Avaliação realizada',color:'#166534', bg:'#DCFCE7'},
  tratamento:  {label:'Em tratamento',      color:'#065F46', bg:'#CCFBF1'},
  finalizado:  {label:'Finalizado',         color:'#4C1D95', bg:'#EDE9FE'},
}

type Partner = {
  id: string; nome: string; email: string; tipo: string;
  especialidade: string; segmento: string; unidade_id: string | null;
}

type Indicacao = {
  id: string; paciente_nome: string; paciente_telefone: string;
  observacoes: string; status: string; data_indicacao: string;
  pdf_url: string | null; valor_repasse: number | null;
}

export default function Portal() {
  const router = useRouter()
  const [partner, setPartner] = useState<Partner | null>(null)
  const [indicacoes, setIndicacoes] = useState<Indicacao[]>([])
  const [tab, setTab] = useState<'pacientes' | 'nova' | 'conta'>('pacientes')
  const [loading, setLoading] = useState(true)
  const [pdfModal, setPdfModal] = useState<Indicacao | null>(null)

  // Nova indicação
  const [novaForm, setNovaForm] = useState({ nome: '', telefone: '', obs: '' })
  const [novaSaving, setNovaSaving] = useState(false)
  const [novaOk, setNovaOk] = useState(false)
  const [novaErro, setNovaErro] = useState('')
  const [tipoInd, setTipoInd] = useState<'s1'|'s2'|''>('')

  const isProf = partner?.tipo === 'profissional'
  const isEmpresaS2 = !isProf && partner?.segmento === 's2'

  const loadIndicacoes = useCallback(async (id: string) => {
    const { data } = await supabase
      .from('indicacoes')
      .select('*')
      .eq('parceiro_id', id)
      .order('data_indicacao', { ascending: false })
    setIndicacoes(data || [])
  }, [])

  useEffect(() => {
    const p = getCurrentPartner()
    if (!p) { router.push('/login'); return }
    setPartner(p)
    loadIndicacoes(p.id).finally(() => setLoading(false))
  }, [router, loadIndicacoes])

  async function enviarIndicacao() {
    if (!novaForm.nome || !novaForm.telefone) { setNovaErro('Nome e telefone são obrigatórios.'); return }
    if (isProf && !tipoInd) { setNovaErro('Selecione o tipo de indicação.'); return }
    setNovaSaving(true); setNovaErro('')
    const { error } = await supabase.from('indicacoes').insert({
      parceiro_id: partner!.id,
      unidade_id: partner!.unidade_id,
      paciente_nome: novaForm.nome.trim(),
      paciente_telefone: novaForm.telefone.trim(),
      observacoes: novaForm.obs.trim(),
      status: 'aguardando',
      valor_repasse: isProf ? (tipoInd === 's2' ? 150 : null) : (isEmpresaS2 ? 150 : null),
    })
    setNovaSaving(false)
    if (error) { setNovaErro('Erro ao enviar indicação.'); return }
    setNovaOk(true)
    setNovaForm({ nome: '', telefone: '', obs: '' })
    setTipoInd('')
    await loadIndicacoes(partner!.id)
    setTimeout(() => { setNovaOk(false); setTab('pacientes') }, 2000)
  }

  function sair() { clearCurrentPartner(); router.push('/login') }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#64748B' }}>Carregando...</p>
    </div>
  )

  if (!partner) return null

  const totalRepasse = indicacoes
    .filter(i => i.valor_repasse && ['avaliado','tratamento','finalizado'].includes(i.status))
    .reduce((sum, i) => sum + (i.valor_repasse || 0), 0)

  const stats = [
    { label: 'Indicações', value: String(indicacoes.length), color: N },
    { label: 'Avaliações', value: String(indicacoes.filter(i => ['avaliado','tratamento','finalizado'].includes(i.status)).length), color: G },
    { label: 'Em tratamento', value: String(indicacoes.filter(i => i.status === 'tratamento').length), color: T },
    ...(isProf || isEmpresaS2 ? [{ label: 'A receber', value: `R$ ${totalRepasse}`, color: S }] : []),
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#F1F5F9' }}>

      {/* HEADER */}
      <header style={{ background: N, padding: '0 20px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo-mdc.png" alt="MDC" style={{ height: 32, filter: 'brightness(0) invert(1)' }} />
            <div>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>Portal do Parceiro</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{partner.nome}</div>
              <div style={{ color: C, fontSize: 11 }}>
                {partner.especialidade}
                {!isProf && ` · ${partner.segmento === 's3' ? 'Home Care' : partner.segmento === 's4' ? 'ILPI' : ''}`}
              </div>
            </div>
            <button onClick={sair} style={{ background: 'none', border: '1px solid #2F6C82', color: '#B0E8E6', padding: '5px 12px', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}>Sair</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '20px 16px' }}>

        {/* STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stats.length},1fr)`, gap: 10, marginBottom: 20 }}>
          {stats.map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '14px 16px' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: 4, background: '#fff', borderRadius: 10, padding: 3, border: '1px solid #E2E8F0', width: 'fit-content', marginBottom: 18 }}>
          {([['pacientes','Pacientes'], ['nova','+ Nova indicação'], ['conta','Minha conta']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13,
              background: tab === id ? G : 'transparent',
              color: tab === id ? '#fff' : '#64748B',
              fontWeight: tab === id ? 600 : 400,
            }}>{label}</button>
          ))}
        </div>

        {/* TAB: PACIENTES */}
        {tab === 'pacientes' && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            {/* Cabeçalho da tabela */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr 1.5fr 90px', gap: 8, padding: '10px 16px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              {['Paciente','Data','Status','Proposta'].map(h => (
                <div key={h} style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</div>
              ))}
            </div>
            {indicacoes.length === 0 && (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
                Nenhuma indicação ainda.{' '}
                <button onClick={() => setTab('nova')} style={{ color: G, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Faça a primeira →</button>
              </div>
            )}
            {indicacoes.map((ind, i) => {
              const st = STATUS_CFG[ind.status] || STATUS_CFG.aguardando
              const data = new Date(ind.data_indicacao).toLocaleDateString('pt-BR')
              return (
                <div key={ind.id} style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr 1.5fr 90px', gap: 8, padding: '12px 16px', borderBottom: i < indicacoes.length - 1 ? '1px solid #F1F5F9' : 'none', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: N }}>{ind.paciente_nome}</div>
                    {ind.paciente_telefone && <div style={{ fontSize: 11, color: '#94A3B8' }}>{ind.paciente_telefone}</div>}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>{data}</div>
                  <div>
                    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500, color: st.color, background: st.bg }}>
                      {st.label}
                    </span>
                  </div>
                  <div>
                    {ind.pdf_url ? (
                      <button onClick={() => setPdfModal(ind)} style={{ border: '1px solid #CBD5E1', background: '#fff', color: '#475569', padding: '4px 10px', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}>📄 Ver PDF</button>
                    ) : <span style={{ fontSize: 12, color: '#CBD5E1' }}>—</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* TAB: NOVA INDICAÇÃO */}
        {tab === 'nova' && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '24px 22px', maxWidth: 500 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: N, marginBottom: 4 }}>Nova indicação</h3>
            <p style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>Preencha os dados do paciente que deseja indicar ao MDC.</p>

            {novaOk && (
              <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#166534', fontSize: 13, fontWeight: 500 }}>
                ✅ Indicação enviada! Entraremos em contato em breve.
              </div>
            )}

            {isProf && (
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8 }}>Tipo de indicação *</label>
                {[
                  { val: 's1', icon: '🏠', t: 'Consultoria em Domicílio', color: G, d: 'Vamos até a casa do paciente e oferecemos uma consultoria completa de orientação de higiene bucal para treinamento do familiar e cuidadores.' },
                  { val: 's2', icon: '💰', t: 'Avaliação em Parceria', color: S, tag: 'R$ 150 para você', d: 'Fazemos a avaliação e tratamento com um acompanhamento mútuo do paciente (o paciente ganha o Kit de Higiene Bucal).' },
                ].map(opt => {
                  const sel = tipoInd === opt.val
                  return (
                    <button key={opt.val} onClick={() => setTipoInd(opt.val as 's1'|'s2')} style={{
                      display: 'block', width: '100%', padding: 0, marginBottom: 10,
                      border: `1.5px solid ${sel ? opt.color : '#CBD5E1'}`,
                      borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                      background: sel ? opt.color + '12' : '#fff',
                    }}>
                      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${sel ? opt.color + '40' : '#E2E8F0'}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>{opt.icon}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: opt.color }}>{opt.t}</span>
                        {(opt as any).tag && <span style={{ marginLeft: 'auto', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: opt.color + '20', color: opt.color }}>{(opt as any).tag}</span>}
                      </div>
                      <p style={{ padding: '8px 14px', fontSize: 12, color: '#64748B', margin: 0, lineHeight: 1.5 }}>{opt.d}</p>
                    </button>
                  )
                })}
              </div>
            )}

            {[
              { label: 'Nome do paciente *', key: 'nome', ph: 'Nome completo' },
              { label: 'Telefone de contato *', key: 'telefone', ph: '(61) 99999-9999' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>{f.label}</label>
                <input
                  value={(novaForm as any)[f.key]}
                  onChange={e => setNovaForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.ph}
                  style={{ width: '100%', padding: '10px 13px', borderRadius: 10, border: '1.5px solid #CBD5E1', fontSize: 14, color: N, outline: 'none' }}
                />
              </div>
            ))}

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>Observações clínicas (opcional)</label>
              <textarea
                value={novaForm.obs}
                onChange={e => setNovaForm(p => ({ ...p, obs: e.target.value }))}
                placeholder="Contexto clínico, diagnóstico, necessidades especiais..."
                rows={3}
                style={{ width: '100%', padding: '10px 13px', borderRadius: 10, border: '1.5px solid #CBD5E1', fontSize: 14, color: N, outline: 'none', resize: 'vertical' }}
              />
            </div>

            {(tipoInd === 's2' || isEmpresaS2) && (
              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#1E40AF' }}>
                💰 Você receberá <strong>R$ 150</strong> após a avaliação ser realizada.
              </div>
            )}

            {novaErro && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 10 }}>{novaErro}</p>}

            <button onClick={enviarIndicacao} disabled={novaSaving} style={{
              width: '100%', padding: '12px', borderRadius: 10, border: 'none',
              background: novaSaving ? '#CBD5E1' : G, color: '#fff',
              fontWeight: 600, fontSize: 14, cursor: novaSaving ? 'not-allowed' : 'pointer',
            }}>{novaSaving ? 'Enviando...' : 'Enviar indicação →'}</button>
          </div>
        )}

        {/* TAB: MINHA CONTA */}
        {tab === 'conta' && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '24px 22px', maxWidth: 500 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: N, marginBottom: 20 }}>Minha conta</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                ['Nome', partner.nome],
                ['E-mail', partner.email],
                ['Tipo de parceiro', partner.tipo === 'profissional' ? 'Profissional de Saúde' : 'Empresa / Instituição'],
                ['Especialidade', partner.especialidade],
                ...(isProf
                  ? [['Modelos disponíveis', 'Consultoria em Domicílio · Avaliação em Parceria']]
                  : [['Modelo de parceria', partner.segmento === 's3' ? 'Pacote Home Care' : partner.segmento === 's4' ? 'Pacote ILPI' : partner.segmento]]),
              ].map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 14, color: N, fontWeight: 500 }}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid #F1F5F9', marginTop: 20, paddingTop: 16 }}>
              <button onClick={sair} style={{
                width: '100%', padding: '11px', borderRadius: 10,
                border: '1.5px solid #CBD5E1', background: '#fff', color: '#475569',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}>Sair do portal</button>
            </div>
          </div>
        )}
      </main>

      {/* MODAL PDF */}
      {pdfModal && (
        <div onClick={() => setPdfModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: '24px', maxWidth: 420, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, marginBottom: 4 }}>PROPOSTA DE TRATAMENTO</div>
                <div style={{ fontSize: 17, fontWeight: 600, color: N }}>{pdfModal.paciente_nome}</div>
              </div>
              <button onClick={() => setPdfModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94A3B8' }}>×</button>
            </div>
            <div style={{ background: '#F8FAFC', borderRadius: 10, padding: 14, marginBottom: 16 }}>
              {[
                ['Data', new Date(pdfModal.data_indicacao).toLocaleDateString('pt-BR')],
                ['Status', STATUS_CFG[pdfModal.status]?.label || pdfModal.status],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #E2E8F0', fontSize: 13 }}>
                  <span style={{ color: '#64748B' }}>{k}</span>
                  <span style={{ fontWeight: 600, color: N }}>{v}</span>
                </div>
              ))}
            </div>
            {pdfModal.pdf_url ? (
              <a href={pdfModal.pdf_url} target="_blank" rel="noreferrer" style={{ display: 'block', width: '100%', padding: '12px', borderRadius: 10, background: G, color: '#fff', textAlign: 'center', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
                📥 Baixar PDF completo
              </a>
            ) : (
              <p style={{ textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>PDF ainda não disponível.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
