'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const G = '#069E6E', N = '#2D2E47'

const EyeIcon = ({ open }: { open: boolean }) => open ? (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
) : (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  // Recuperação de senha
  const [showRecup, setShowRecup]       = useState(false)
  const [recupEmail, setRecupEmail]     = useState('')
  const [recupLoading, setRecupLoading] = useState(false)
  const [recupMsg, setRecupMsg]         = useState('')
  const [recupErro, setRecupErro]       = useState('')

  async function handleLogin() {
    if (!email || !senha) { setErro('Preencha e-mail e senha.'); return }
    setLoading(true); setErro('')

    const emailNorm = email.toLowerCase().trim()

    // 1) Tenta parceiro
    const { data: parceiro } = await supabase
      .from('parceiros').select('*').eq('email', emailNorm).eq('senha', senha).single()

    if (parceiro) {
      if (parceiro.status === 'pendente') {
        setLoading(false)
        setErro('Sua conta está aguardando aprovação do gestor. Você receberá acesso em breve.')
        return
      }
      if (parceiro.status === 'rejeitado') {
        setLoading(false)
        setErro('Seu acesso não foi aprovado. Entre em contato com a equipe MDC.')
        return
      }
      localStorage.setItem('mdc_partner', JSON.stringify(parceiro))
      router.push('/portal')
      return
    }

    // 2) Tenta gestor
    const { data: gestor } = await supabase
      .from('gestores').select('*, unidades(nome)').eq('email', emailNorm).eq('senha', senha).single()

    if (gestor) {
      if (gestor.status === 'inativo') {
        setLoading(false)
        setErro('Seu acesso está suspenso. Entre em contato com o administrador.')
        return
      }
      setLoading(false)
      localStorage.setItem('gestor_session', JSON.stringify(gestor))
      router.push('/gestor')
      return
    }

    // 3) Tenta administrador
    const { data: admin } = await supabase
      .from('administradores').select('*').eq('email', emailNorm).eq('senha', senha).single()

    setLoading(false)

    if (admin) {
      localStorage.setItem('admin_session', JSON.stringify(admin))
      router.push('/admin')
      return
    }

    setErro('E-mail ou senha incorretos.')
  }

  async function handleRecuperar() {
    if (!recupEmail) { setRecupErro('Digite seu e-mail.'); return }
    setRecupLoading(true); setRecupErro(''); setRecupMsg('')

    try {
      const res = await fetch('/api/recuperar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recupEmail.toLowerCase().trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro')
      setRecupMsg('Se o e-mail estiver cadastrado, você receberá sua senha em instantes. Verifique também a caixa de spam.')
    } catch {
      setRecupErro('Erro ao enviar. Tente novamente.')
    }

    setRecupLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>

      {/* ── Modal recuperar senha ─────────────────────────────────── */}
      {showRecup && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 999, padding: 20,
        }} onClick={() => { setShowRecup(false); setRecupMsg(''); setRecupErro(''); setRecupEmail('') }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: '32px 28px',
            width: '100%', maxWidth: 400,
            boxShadow: '0 8px 40px rgba(0,0,0,.16)',
          }} onClick={e => e.stopPropagation()}>

            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🔑</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: N, margin: 0 }}>Recuperar senha</h3>
              <p style={{ fontSize: 13, color: '#64748B', marginTop: 6 }}>
                Digite seu e-mail cadastrado e enviaremos sua senha.
              </p>
            </div>

            {!recupMsg ? (<>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>E-mail</label>
                <input
                  type="email" value={recupEmail} placeholder="seu@email.com"
                  onChange={e => setRecupEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRecuperar()}
                  style={{ width: '100%', padding: '10px 13px', borderRadius: 10, border: '1.5px solid #CBD5E1', background: '#F8FAFC', fontSize: 14, color: N, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              {recupErro && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 10 }}>{recupErro}</p>}
              <button onClick={handleRecuperar} disabled={recupLoading} style={{
                width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                background: recupLoading ? '#CBD5E1' : G, color: '#fff',
                fontWeight: 600, fontSize: 14, cursor: recupLoading ? 'not-allowed' : 'pointer',
              }}>{recupLoading ? 'Enviando...' : 'Enviar senha por e-mail →'}</button>
            </>) : (
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: '16px 18px', textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: '#166534', margin: 0, lineHeight: 1.6 }}>✅ {recupMsg}</p>
              </div>
            )}

            <button onClick={() => { setShowRecup(false); setRecupMsg(''); setRecupErro(''); setRecupEmail('') }}
              style={{ display: 'block', margin: '16px auto 0', background: 'none', border: 'none', color: '#94A3B8', fontSize: 13, cursor: 'pointer' }}>
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* ── Card login ───────────────────────────────────────────── */}
      <div style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 4px 24px rgba(0,0,0,.08)', padding: '36px 28px' }}>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/logo-mdc.png" alt="Meu Dentista em Casa" style={{ height: 64, display: 'inline-block', width: 'auto', marginBottom: 16 }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, color: N, marginBottom: 4 }}>Portal MDC</h2>
          <p style={{ fontSize: 13, color: G, fontWeight: 500 }}>Profissionais de Saúde</p>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>E-mail</label>
          <input
            type="email" value={email} placeholder="seu@email.com"
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ width: '100%', padding: '10px 13px', borderRadius: 10, border: '1.5px solid #CBD5E1', background: '#F8FAFC', fontSize: 14, color: N, outline: 'none' }}
          />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>Senha</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showSenha ? 'text' : 'password'} value={senha} placeholder="••••••••"
              onChange={e => setSenha(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{ width: '100%', padding: '10px 40px 10px 13px', borderRadius: 10, border: '1.5px solid #CBD5E1', background: '#F8FAFC', fontSize: 14, color: N, outline: 'none' }}
            />
            <button type="button" onClick={() => setShowSenha(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
              <EyeIcon open={showSenha} />
            </button>
          </div>
        </div>

        {/* Link esqueci senha */}
        <div style={{ textAlign: 'right', marginBottom: 20 }}>
          <button onClick={() => { setShowRecup(true); setRecupEmail(email) }} style={{ background: 'none', border: 'none', color: '#3E7996', fontSize: 12, cursor: 'pointer', padding: 0, fontWeight: 500 }}>
            Esqueci minha senha
          </button>
        </div>

        {erro && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{erro}</p>}

        <button onClick={handleLogin} disabled={loading} style={{
          width: '100%', padding: '12px', borderRadius: 10, border: 'none',
          background: loading ? '#CBD5E1' : G, color: '#fff',
          fontWeight: 600, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
          boxShadow: loading ? 'none' : '0 2px 8px rgba(6,158,110,.3)',
        }}>{loading ? 'Entrando...' : 'Entrar →'}</button>

        <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: '#64748B' }}>
          Ainda não tem conta?{' '}
          <a href="/cadastro" style={{ color: G, fontWeight: 600, textDecoration: 'none' }}>Cadastrar →</a>
        </p>
      </div>
    </div>
  )
}
