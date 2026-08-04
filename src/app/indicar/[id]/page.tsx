'use client'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const TEAL = '#008194'
const ORANGE = '#F59D17'
const DARK = '#1E293B'

type Parceiro = {
  id: string
  nome: string
  especialidade: string
  unidade_id: string
}

type Step = 'loading' | 'form' | 'success' | 'error'

const BENEFICIO_CFG = {
  consultoria: {
    titulo: 'Consultoria em Domicílio',
    descricao: 'Implantação de protocolo de cuidados bucais e treinamento do cuidador',
    cor: TEAL,
  },
  avaliacao: {
    titulo: 'Avaliação Odontológica',
    descricao: 'Avaliação odontológica completa com Kit de Higiene Bucal — no conforto do lar',
    cor: TEAL,
  },
}

export default function IndicarPage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const beneficio = (searchParams.get('beneficio') || 'avaliacao') as 'consultoria' | 'avaliacao'

  const [step, setStep] = useState<Step>('loading')
  const [parceiro, setParceiro] = useState<Parceiro | null>(null)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [obs, setObs] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const cfg = BENEFICIO_CFG[beneficio] ?? BENEFICIO_CFG.avaliacao

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('parceiros')
        .select('id, nome, especialidade, unidade_id')
        .eq('id', id)
        .eq('status', 'ativo')
        .single()

      if (!data) { setStep('error'); return }
      setParceiro(data)
      setStep('form')
    }
    load()
  }, [id])

  function formatTel(v: string) {
    const d = v.replace(/\D/g, '').slice(0, 11)
    if (d.length <= 2) return d
    if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`
    return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!parceiro) return
    setError('')

    const tel = telefone.replace(/\D/g, '')
    if (!nome.trim()) { setError('Por favor, informe o nome do paciente.'); return }
    if (tel.length < 10) { setError('Informe um telefone válido com DDD.'); return }

    setSaving(true)
    const { error: err } = await supabase.from('indicacoes').insert({
      paciente_nome: nome.trim(),
      paciente_telefone: tel,
      observacoes: obs.trim() || null,
      status: 'aguardando',
      modelo: beneficio,
      parceiro_id: parceiro.id,
      unidade_id: parceiro.unidade_id,
      data_indicacao: new Date().toISOString(),
    })

    setSaving(false)
    if (err) { setError('Erro ao enviar. Tente novamente.'); return }
    setStep('success')
  }

  /* ── LOADING ── */
  if (step === 'loading') return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F0F9FA' }}>
      <div style={{ color:TEAL, fontSize:14 }}>Carregando...</div>
    </div>
  )

  /* ── ERROR ── */
  if (step === 'error') return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#F0F9FA', padding:24, textAlign:'center' }}>
      <div style={{ fontSize:48, marginBottom:16 }}>😕</div>
      <div style={{ fontSize:18, fontWeight:700, color:DARK, marginBottom:8 }}>Link não encontrado</div>
      <div style={{ fontSize:14, color:'#64748B' }}>Este link pode ser inválido ou o profissional não está mais ativo.</div>
    </div>
  )

  /* ── SUCCESS ── */
  if (step === 'success') return (
    <div style={{ minHeight:'100vh', background:'#F0F9FA', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ background:'#fff', borderRadius:20, padding:'36px 28px', maxWidth:420, width:'100%', textAlign:'center', boxShadow:'0 4px 24px rgba(0,129,148,.12)' }}>
        <div style={{ width:64, height:64, borderRadius:'50%', background:'#E0F5F7', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:30 }}>✓</div>
        <div style={{ fontSize:20, fontWeight:700, color:TEAL, marginBottom:8 }}>Solicitação enviada!</div>
        <div style={{ fontSize:14, color:'#64748B', lineHeight:1.6, marginBottom:20 }}>
          Recebemos sua solicitação de <strong>{cfg.titulo}</strong>.<br />
          Nossa equipe entrará em contato em breve pelo número informado.
        </div>
        <div style={{ background:'#F8FAFC', borderRadius:10, padding:'12px 16px', fontSize:12, color:'#94A3B8' }}>
          Indicado por: <strong style={{ color:TEAL }}>{parceiro?.nome}</strong>
        </div>
        {/* Logo */}
        <div style={{ marginTop:28, paddingTop:20, borderTop:'1px solid #F1F5F9' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mdc.png" alt="Meu Dentista em Casa" style={{ height:36 }} />
          <div style={{ fontSize:11, color:'#CBD5E1', marginTop:6 }}>meudentistaemcasa.com.br</div>
        </div>
      </div>
    </div>
  )

  /* ── FORM ── */
  return (
    <div style={{ minHeight:'100vh', background:'#F0F9FA' }}>

      {/* Header */}
      <div style={{ background:TEAL, padding:'0 20px' }}>
        <div style={{ maxWidth:480, margin:'0 auto', paddingTop:20, paddingBottom:20, display:'flex', alignItems:'center', gap:12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mdc.png" alt="Meu Dentista em Casa" style={{ height:36, filter:'brightness(0) invert(1)' }} />
        </div>
      </div>

      <div style={{ maxWidth:480, margin:'0 auto', padding:'24px 20px' }}>

        {/* Benefit Card */}
        <div style={{ background:'#fff', borderRadius:16, padding:'20px', marginBottom:20, border:`2px solid ${ORANGE}30`, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:0, left:0, width:5, bottom:0, background:ORANGE }} />
          <div style={{ paddingLeft:10 }}>
            <div style={{ fontSize:10, fontWeight:700, color:ORANGE, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:4 }}>Benefício especial</div>
            <div style={{ fontSize:18, fontWeight:700, color:TEAL, marginBottom:4 }}>{cfg.titulo}</div>
            <div style={{ fontSize:13, color:'#64748B', lineHeight:1.5 }}>{cfg.descricao}</div>
          </div>
        </div>

        {/* Form */}
        <div style={{ background:'#fff', borderRadius:16, padding:'24px 20px', boxShadow:'0 2px 12px rgba(0,0,0,.06)' }}>
          <div style={{ fontSize:16, fontWeight:700, color:DARK, marginBottom:4 }}>Solicitar benefício</div>
          <div style={{ fontSize:13, color:'#64748B', marginBottom:20 }}>
            Preencha os dados do paciente. Nossa equipe entrará em contato para agendar.
          </div>

          <form onSubmit={enviar}>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:5 }}>
                Nome do paciente *
              </label>
              <input
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Nome completo"
                required
                style={{ width:'100%', padding:'11px 14px', borderRadius:10, border:'1.5px solid #E2E8F0', fontSize:14, color:DARK, outline:'none', boxSizing:'border-box' }}
                onFocus={e => { e.currentTarget.style.borderColor = TEAL }}
                onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0' }}
              />
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:5 }}>
                Telefone / WhatsApp *
              </label>
              <input
                value={telefone}
                onChange={e => setTelefone(formatTel(e.target.value))}
                placeholder="(61) 99999-9999"
                inputMode="tel"
                required
                style={{ width:'100%', padding:'11px 14px', borderRadius:10, border:'1.5px solid #E2E8F0', fontSize:14, color:DARK, outline:'none', boxSizing:'border-box' }}
                onFocus={e => { e.currentTarget.style.borderColor = TEAL }}
                onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0' }}
              />
            </div>

            <div style={{ marginBottom:20 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:5 }}>
                Observações (opcional)
              </label>
              <textarea
                value={obs}
                onChange={e => setObs(e.target.value)}
                placeholder="Ex: mora em lar de idosos, tem dificuldade de locomoção..."
                rows={3}
                style={{ width:'100%', padding:'11px 14px', borderRadius:10, border:'1.5px solid #E2E8F0', fontSize:13, color:DARK, outline:'none', resize:'none', boxSizing:'border-box', lineHeight:1.5 }}
                onFocus={e => { e.currentTarget.style.borderColor = TEAL }}
                onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0' }}
              />
            </div>

            {error && (
              <div style={{ background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#DC2626', marginBottom:14 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              style={{ width:'100%', padding:'13px', borderRadius:12, border:'none', background:saving ? '#94A3B8' : TEAL, color:'#fff', fontSize:15, fontWeight:700, cursor:saving ? 'not-allowed' : 'pointer' }}
            >
              {saving ? 'Enviando...' : 'Solicitar benefício →'}
            </button>
          </form>
        </div>

        {/* Parceiro footer */}
        <div style={{ textAlign:'center', marginTop:20, fontSize:12, color:'#94A3B8' }}>
          Indicado por <strong style={{ color:'#64748B' }}>{parceiro?.nome}</strong> · {parceiro?.especialidade}
        </div>
      </div>
    </div>
  )
}
