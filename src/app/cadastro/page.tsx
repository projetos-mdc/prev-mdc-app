'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const G='#069E6E', N='#2D2E47', S='#3E7996', T='#2F6C82', C='#00BAB4'

const PROF_SEGS = [
  {val:'geriatra',    label:'Geriatra / Médico',          icon:'🩺'},
  {val:'fono',        label:'Fonoaudiólogo(a)',            icon:'🗣️'},
  {val:'enfermeiro',  label:'Enfermeiro(a)',               icon:'💉'},
  {val:'fisio',       label:'Fisioterapeuta',              icon:'🏃'},
  {val:'nutri',       label:'Nutricionista',               icon:'🥗'},
  {val:'psicologo',   label:'Psicólogo(a)',                icon:'🧠'},
  {val:'terapeuta',   label:'Terapeuta Ocupacional',       icon:'🤲'},
  {val:'assistente',  label:'Assistente Social',           icon:'🤝'},
  {val:'outro',       label:'Outro profissional de saúde', icon:'👩‍⚕️'},
]

const EMP_SEGS = [
  {val:'homecare', label:'Empresa de Home Care',               icon:'🏠', seg:'s3'},
  {val:'agencia',  label:'Agência de Cuidadores',              icon:'👥', seg:'s3'},
  {val:'ilpi',     label:'ILPI / Longa Permanência',           icon:'🏛️', seg:'s4'},
  {val:'clinica',  label:'Clínica de Internação / Transição',  icon:'🏥', seg:'s4'},
]

const BENEFITS = {
  s1: {
    color: G, label: 'Segmento 1 — Consultoria em Domicílio',
    items: [
      {icon:'🦷', t:'Kit de Higiene Bucal KIN', d:'Enxaguante + pasta dental entregues ao seu paciente como benefício da parceria.'},
      {icon:'🩺', t:'Consultoria In Loco', d:'Nosso dentista vai até a residência do paciente, avalia e orienta o cuidador e a família.'},
      {icon:'📋', t:'Relatório personalizado', d:'Você recebe um relatório do status bucal do paciente após cada visita.'},
    ],
  },
  s2: {
    color: S, label: 'Segmento 2 — Avaliação em Parceria',
    items: [
      {icon:'💰', t:'R$ 150 por avaliação realizada', d:'Você indica o paciente, nosso dentista avalia e você recebe R$ 150 automaticamente.'},
      {icon:'📲', t:'Indicação simples pelo portal', d:'Registre nome e contato do paciente no seu portal. Nós cuidamos do resto.'},
      {icon:'📊', t:'Painel de acompanhamento', d:'Veja em tempo real o status de cada paciente e o valor acumulado a receber.'},
    ],
  },
  s3: {
    color: T, label: 'Segmento 3 — Pacote Home Care',
    items: [
      {icon:'🎓', t:'Curso Online com Certificação', d:'Treinamento completo para cuidadores com material didático e certificado ao final.'},
      {icon:'🩺', t:'Consultoria In Loco', d:'Dentista MDC visita e orienta sua equipe sobre as necessidades de cada paciente.'},
      {icon:'📋', t:'Relatório de demanda', d:'Mapeamento completo das necessidades odontológicas dos seus pacientes.'},
    ],
  },
  s4: {
    color: C, label: 'Segmento 4 — Pacote ILPI / Instituição',
    items: [
      {icon:'🔍', t:'Avaliações Gratuitas', d:'Triagem geral, avaliação de demanda semanal e avaliação de admissão — tudo incluso.'},
      {icon:'🎓', t:'Curso com Certificação', d:'Capacitação completa para toda a equipe de cuidadores e técnicos da instituição.'},
      {icon:'👐', t:'Educação na Prática', d:'Treinamento presencial com o dentista MDC diretamente com os residentes.'},
    ],
  },
}

type BenefitKey = keyof typeof BENEFITS

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
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const [form, setForm] = useState({
    nome: '', email: '', whatsapp: '', senha: '',
    tipo: '' as 'profissional' | 'empresa' | '',
    especialidade: '', segmento: '', escolha: '' as BenefitKey | '',
  })

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const isProf = form.tipo === 'profissional'
  const total = isProf ? 5 : 4

  const getBenefitKey = (): BenefitKey => {
    if (isProf) return (form.escolha || 's1') as BenefitKey
    const found = EMP_SEGS.find(s => s.val === form.especialidade)
    return (found?.seg || 's3') as BenefitKey
  }

  async function finalizar() {
    setLoading(true)
    setErro('')
    const segFinal = getBenefitKey()
    const { error } = await supabase.from('parceiros').insert({
      nome: form.nome.trim(),
      email: form.email.toLowerCase().trim(),
      whatsapp: form.whatsapp.trim(),
      senha: form.senha,          // Em prod: hash com bcrypt
      tipo: form.tipo,
      especialidade: form.especialidade,
      segmento: segFinal,
      status: 'ativo',
    })
    setLoading(false)
    if (error) {
      if (error.code === '23505') setErro('Este e-mail já está cadastrado.')
      else setErro('Erro ao salvar. Tente novamente.')
      return
    }
    setStep(step + 1) // sucesso
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
        }}
      />
    </div>
  )

  const optBtn = (val: string, label: string, icon: string, current: string, setter: (v: string) => void) => {
    const sel = current === val
    return (
      <button key={val} onClick={() => setter(val)} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: '100%', padding: '11px 14px', borderRadius: 10, marginBottom: 8,
        border: `1.5px solid ${sel ? G : '#CBD5E1'}`,
        background: sel ? '#E4F5F3' : '#fff', cursor: 'pointer',
        textAlign: 'left',
      }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: sel ? 600 : 400, color: sel ? N : '#475569' }}>{label}</span>
        {sel && <span style={{ marginLeft: 'auto', color: G, fontWeight: 700 }}>✓</span>}
      </button>
    )
  }

  const btn = (label: string, onClick: () => void, color = G, disabled = false) => (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', padding: '12px', borderRadius: 10, border: 'none',
      background: disabled ? '#CBD5E1' : color, color: '#fff',
      fontWeight: 600, fontSize: 14, cursor: disabled ? 'not-allowed' : 'pointer', marginTop: 8,
    }}>{label}</button>
  )

  const back = () => setStep(s => s - 1)

  const card = (children: React.ReactNode) => (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '28px 24px' }}>
      {children}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F1F5F9', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ maxWidth: 500, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ fontSize: 14, fontWeight: 600, color: N, textDecoration: 'none' }}>🦷 MDC</Link>
        <Link href="/login" style={{ fontSize: 13, color: '#64748B', textDecoration: 'none' }}>Já tenho conta →</Link>
      </div>

      <div style={{ maxWidth: 500, margin: '0 auto' }}>
        <Prog step={step} total={total} />

        {/* PASSO 0 — Dados básicos */}
        {step === 0 && card(<>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: N, marginBottom: 4 }}>Vamos começar</h2>
          <p style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>Preencha seus dados para receber sua proposta.</p>
          {inp('Nome completo', 'nome', 'text', 'Seu nome')}
          {inp('E-mail', 'email', 'email', 'seu@email.com')}
          {inp('WhatsApp', 'whatsapp', 'tel', '(61) 99999-9999')}
          {inp('Senha de acesso', 'senha', 'password', 'Mínimo 6 caracteres')}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8 }}>Você é:</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[{val:'profissional',label:'Profissional de saúde',icon:'👩‍⚕️'},{val:'empresa',label:'Empresa / Instituição',icon:'🏢'}].map(t => {
                const sel = form.tipo === t.val
                return (
                  <button key={t.val} onClick={() => set('tipo', t.val)} style={{
                    padding: '16px 10px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                    border: `1.5px solid ${sel ? G : '#CBD5E1'}`,
                    background: sel ? '#E4F5F3' : '#fff',
                  }}>
                    <div style={{ fontSize: 26, marginBottom: 6 }}>{t.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: sel ? 600 : 400, color: sel ? N : '#475569' }}>{t.label}</div>
                  </button>
                )
              })}
            </div>
          </div>
          {btn('Continuar →', () => {
            if (!form.nome || !form.email || !form.senha || !form.tipo) { setErro('Preencha todos os campos.'); return }
            setErro(''); setStep(1)
          })}
          {erro && <p style={{ color: '#EF4444', fontSize: 13, marginTop: 8 }}>{erro}</p>}
        </>)}

        {/* PASSO 1 — Especialidade / Segmento */}
        {step === 1 && card(<>
          <button onClick={back} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0 }}>← Voltar</button>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: N, marginBottom: 4 }}>{isProf ? 'Qual é a sua especialidade?' : 'Qual tipo de empresa?'}</h2>
          <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
            {isProf ? 'Fonoaudiólogos, fisioterapeutas, nutricionistas e outros profissionais de saúde são bem-vindos.' : 'Escolha o tipo que melhor descreve sua empresa.'}
          </p>
          {(isProf ? PROF_SEGS : EMP_SEGS).map(s => optBtn(s.val, s.label, s.icon, form.especialidade, v => set('especialidade', v)))}
          {btn('Continuar →', () => { if (!form.especialidade) { setErro('Selecione uma opção.'); return }; setErro(''); setStep(2) })}
          {erro && <p style={{ color: '#EF4444', fontSize: 13, marginTop: 8 }}>{erro}</p>}
        </>)}

        {/* PASSO 2 — Escolha do modelo (só profissional) */}
        {step === 2 && isProf && card(<>
          <button onClick={back} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0 }}>← Voltar</button>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: N, marginBottom: 4 }}>Escolha seu modelo de parceria</h2>
          <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>Dois formatos disponíveis. Escolha o que faz mais sentido para você.</p>
          {[
            {val:'s1', color:G, icon:'🏠', t:'Segmento 1 — Consultoria em Domicílio', tag:'Kit KIN incluso', d:'Você indica o paciente e nós levamos atendimento + kit de higiene bucal até a residência dele.'},
            {val:'s2', color:S, icon:'💰', t:'Segmento 2 — Avaliação em Parceria',     tag:'R$ 150 / indicação', d:'Você indica, nós avaliamos e você recebe R$ 150 por cada avaliação realizada.'},
          ].map(opt => {
            const sel = form.escolha === opt.val
            return (
              <button key={opt.val} onClick={() => set('escolha', opt.val)} style={{
                display: 'block', width: '100%', padding: 0, marginBottom: 12,
                border: `1.5px solid ${sel ? opt.color : '#CBD5E1'}`,
                borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                background: sel ? opt.color + '12' : '#fff',
              }}>
                <div style={{ padding: '11px 16px', borderBottom: `1px solid ${sel ? opt.color + '40' : '#E2E8F0'}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{opt.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: opt.color }}>{opt.t}</span>
                  <span style={{ marginLeft: 'auto', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: opt.color + '20', color: opt.color }}>{opt.tag}</span>
                </div>
                <p style={{ padding: '10px 16px', fontSize: 12, color: '#64748B', margin: 0 }}>{opt.d}</p>
              </button>
            )
          })}
          {btn('Ver meu pacote →', () => { if (!form.escolha) { setErro('Escolha um modelo.'); return }; setErro(''); setStep(3) })}
          {erro && <p style={{ color: '#EF4444', fontSize: 13, marginTop: 8 }}>{erro}</p>}
        </>)}

        {/* PASSO 2 (empresa) ou 3 (profissional) — Benefícios */}
        {((step === 2 && !isProf) || (step === 3 && isProf)) && (() => {
          const key = getBenefitKey()
          const b = BENEFITS[key]
          return card(<>
            <button onClick={back} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0 }}>← Voltar</button>
            <div style={{ background: b.color, borderRadius: 12, padding: '16px', marginBottom: 20, color: '#fff' }}>
              <div style={{ fontSize: 10, opacity: .8, marginBottom: 4, fontWeight: 600, letterSpacing: '.06em' }}>SEU PACOTE</div>
              <div style={{ fontSize: 17, fontWeight: 600 }}>{b.label}</div>
            </div>
            {b.items.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '11px 0', borderBottom: i < b.items.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: N, marginBottom: 2 }}>{item.t}</div>
                  <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.6 }}>{item.d}</div>
                </div>
              </div>
            ))}
            {erro && <p style={{ color: '#EF4444', fontSize: 13, marginTop: 12 }}>{erro}</p>}
            {btn(loading ? 'Salvando...' : 'Confirmar parceria →', finalizar, b.color, loading)}
          </>)
        })()}

        {/* SUCESSO */}
        {((step === 4 && isProf) || (step === 3 && !isProf)) && card(<>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: `linear-gradient(135deg,${G},${C})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>✅</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: N, marginBottom: 8 }}>Bem-vindo(a), {form.nome.split(' ')[0]}!</h2>
            <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.7, marginBottom: 24 }}>
              Sua parceria com o Meu Dentista em Casa está confirmada.<br />Use seu e-mail e senha para acessar o portal.
            </p>
            <button onClick={() => router.push('/login')} style={{
              width: '100%', padding: '13px', borderRadius: 10, border: 'none',
              background: G, color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer',
            }}>Acessar o portal →</button>
          </div>
        </>)}
      </div>
    </div>
  )
}
