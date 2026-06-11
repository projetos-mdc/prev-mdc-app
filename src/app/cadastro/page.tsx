'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const G='#069E6E', N='#2D2E47', S='#3E7996'

const PROF_SEGS = [
  {val:'Médico / Geriatra',          icon:'🩺'},
  {val:'Fonoaudiólogo(a)',            icon:'🗣️'},
  {val:'Enfermeiro(a)',               icon:'💉'},
  {val:'Fisioterapeuta',              icon:'🏃'},
  {val:'Nutricionista',               icon:'🥗'},
  {val:'Psicólogo(a)',                icon:'🧠'},
  {val:'Terapeuta Ocupacional',       icon:'🤲'},
  {val:'Assistente Social',           icon:'🤝'},
  {val:'Dentista',                    icon:'🦷'},
  {val:'Técnico de Enfermagem',       icon:'🩹'},
  {val:'Outro profissional de saúde', icon:'👩‍⚕️'},
]

function Prog({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 5, marginBottom: 20 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          flex: 1, height: 3, borderRadius: 2,
          background: i <= step ? G : '#E2E8F0', transition: 'background .2s',
        }} />
      ))}
    </div>
  )
}

export default function Cadastro() {
  const router = useRouter()
  const [step, setStep]     = useState(0)
  const [loading, setLoading] = useState(false)
  const [erro, setErro]     = useState('')
  const [unidades, setUnidades] = useState<{id:string;nome:string}[]>([])

  useEffect(() => {
    supabase.from('unidades').select('id, nome').order('nome').then(({ data }) => {
      if (data) setUnidades(data)
    })
  }, [])

  const [form, setForm] = useState({
    nome: '', email: '', whatsapp: '', senha: '',
    especialidade: '', unidade_id: '',
  })

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const total = 2 // passo 0 e passo 1 visíveis

  async function finalizar() {
    setLoading(true)
    setErro('')
    const { error } = await supabase.from('parceiros').insert({
      nome:         form.nome.trim(),
      email:        form.email.toLowerCase().trim(),
      whatsapp:     form.whatsapp.trim(),
      senha:        form.senha,
      tipo:         'profissional',
      especialidade: form.especialidade,
      segmento:     's1',
      status:       'pendente',
      unidade_id:   form.unidade_id || null,
    })
    setLoading(false)
    if (error) {
      if (error.code === '23505') setErro('Este e-mail já está cadastrado.')
      else setErro('Erro ao salvar. Tente novamente.')
      return
    }
    setStep(2) // sucesso
  }

  const inp = (label: string, key: string, type = 'text', ph = '') => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>{label}</label>
      <input
        type={type}
        value={(form as any)[key]}
        onChange={e => set(key, e.target.value)}
        placeholder={ph}
        style={{
          width: '100%', padding: '10px 13px', borderRadius: 10,
          border: '1.5px solid #CBD5E1', fontSize: 14, color: N, outline: 'none',
          background: '#F8FAFC', boxSizing: 'border-box',
        }}
      />
    </div>
  )

  const card = (children: React.ReactNode) => (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '28px 24px' }}>
      {children}
    </div>
  )

  const primBtn = (label: string, onClick: () => void, disabled = false) => (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', padding: '12px', borderRadius: 10, border: 'none',
      background: disabled ? '#CBD5E1' : G, color: '#fff',
      fontWeight: 600, fontSize: 14, cursor: disabled ? 'not-allowed' : 'pointer', marginTop: 8,
    }}>{label}</button>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F1F5F9', padding: '24px 16px' }}>

      {/* Header */}
      <div style={{ maxWidth: 500, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/"><img src="/logo-mdc.png" alt="MDC" style={{ height: 28 }} /></Link>
        <Link href="/login" style={{ fontSize: 13, color: '#64748B', textDecoration: 'none' }}>Já tenho conta →</Link>
      </div>

      <div style={{ maxWidth: 500, margin: '0 auto' }}>
        {step < 2 && <Prog step={step} total={total} />}

        {/* ─── PASSO 0 — Dados básicos ─────────────────────────────── */}
        {step === 0 && card(<>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: N, marginBottom: 4 }}>Vamos começar</h2>
          <p style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>Preencha seus dados para criar seu acesso.</p>

          {inp('Nome completo', 'nome', 'text', 'Seu nome')}
          {inp('E-mail', 'email', 'email', 'seu@email.com')}
          {inp('WhatsApp', 'whatsapp', 'tel', '(61) 99999-9999')}
          {inp('Senha de acesso', 'senha', 'password', 'Mínimo 6 caracteres')}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>Unidade MDC</label>
            <select
              value={form.unidade_id}
              onChange={e => set('unidade_id', e.target.value)}
              style={{
                width: '100%', padding: '10px 13px', borderRadius: 10,
                border: '1.5px solid #CBD5E1', fontSize: 14,
                color: form.unidade_id ? N : '#94A3B8', outline: 'none', background: '#fff',
              }}
            >
              <option value="">Selecione sua unidade</option>
              {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>

          {erro && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 8 }}>{erro}</p>}

          {primBtn('Continuar →', () => {
            if (!form.nome || !form.email || !form.senha) { setErro('Preencha nome, e-mail e senha.'); return }
            if (form.senha.length < 6) { setErro('A senha deve ter no mínimo 6 caracteres.'); return }
            setErro(''); setStep(1)
          })}
        </>)}

        {/* ─── PASSO 1 — Especialidade ─────────────────────────────── */}
        {step === 1 && card(<>
          <button onClick={() => setStep(0)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0 }}>← Voltar</button>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: N, marginBottom: 4 }}>Qual é a sua especialidade?</h2>
          <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>Selecione a opção que melhor descreve sua atuação.</p>

          {PROF_SEGS.map(s => {
            const sel = form.especialidade === s.val
            return (
              <button key={s.val} onClick={() => set('especialidade', s.val)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '11px 14px', borderRadius: 10, marginBottom: 8,
                border: `1.5px solid ${sel ? G : '#CBD5E1'}`,
                background: sel ? '#E4F5F3' : '#fff', cursor: 'pointer', textAlign: 'left',
              }}>
                <span style={{ fontSize: 20 }}>{s.icon}</span>
                <span style={{ fontSize: 13, fontWeight: sel ? 600 : 400, color: sel ? N : '#475569' }}>{s.val}</span>
                {sel && <span style={{ marginLeft: 'auto', color: G, fontWeight: 700 }}>✓</span>}
              </button>
            )
          })}

          {erro && <p style={{ color: '#EF4444', fontSize: 13, marginTop: 8 }}>{erro}</p>}

          {primBtn(loading ? 'Enviando...' : 'Confirmar cadastro →', () => {
            if (!form.especialidade) { setErro('Selecione sua especialidade.'); return }
            setErro(''); finalizar()
          }, loading)}
        </>)}

        {/* ─── SUCESSO ─────────────────────────────────────────────── */}
        {step === 2 && card(<>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>⏳</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: N, marginBottom: 8 }}>Cadastro recebido!</h2>
            <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.7, marginBottom: 8 }}>
              Olá, <strong>{form.nome.split(' ')[0]}</strong>! Seu cadastro foi enviado com sucesso.
            </p>
            <div style={{ background: '#FEF9EC', border: '1px solid #FDE68A', borderRadius: 12, padding: '14px 18px', marginBottom: 24, textAlign: 'left' }}>
              <p style={{ fontSize: 13, color: '#92400E', margin: 0, lineHeight: 1.6 }}>
                <strong>Aguardando aprovação do gestor.</strong><br />
                Você receberá o acesso ao portal assim que sua conta for aprovada. Em caso de dúvidas, entre em contato com a equipe MDC.
              </p>
            </div>
            <button onClick={() => router.push('/login')} style={{
              width: '100%', padding: '13px', borderRadius: 10, border: 'none',
              background: G, color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer',
            }}>Ir para o login →</button>
          </div>
        </>)}

      </div>
    </div>
  )
}
