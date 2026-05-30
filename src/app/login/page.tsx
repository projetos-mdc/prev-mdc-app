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

  async function handleLogin() {
    if (!email || !senha) { setErro('Preencha e-mail e senha.'); return }
    setLoading(true); setErro('')

    const emailNorm = email.toLowerCase().trim()

    // 1) Tenta parceiro
    const { data: parceiro } = await supabase
      .from('parceiros')
      .select('*')
      .eq('email', emailNorm)
      .eq('senha', senha)
      .eq('status', 'ativo')
      .single()

    if (parceiro) {
      localStorage.setItem('mdc_partner', JSON.stringify(parceiro))
      router.push('/portal')
      return
    }

    // 2) Tenta gestor
    const { data: gestor } = await supabase
      .from('gestores')
      .select('*, unidades(nome)')
      .eq('email', emailNorm)
      .eq('senha', senha)
      .single()

    setLoading(false)

    if (gestor) {
      localStorage.setItem('gestor_session', JSON.stringify(gestor))
      router.push('/gestor')
      return
    }

    setErro('E-mail ou senha incorretos.')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 4px 24px rgba(0,0,0,.08)', padding: '36px 28px' }}>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/logo-mdc.png" alt="Meu Dentista em Casa" style={{ height: 64, display: 'inline-block', width: 'auto', marginBottom: 16 }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, color: N, marginBottom: 4 }}>Portal Parceiro</h2>
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

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>Senha</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showSenha ? 'text' : 'password'} value={senha} placeholder="••••••••"
              onChange={e => setSenha(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{ width: '100%', padding: '10px 40px 10px 13px', borderRadius: 10, border: '1.5px solid #CBD5E1', background: '#F8FAFC', fontSize: 14, color: N, outline: 'none' }}
            />
            <button
              type="button" onClick={() => setShowSenha(v => !v)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
            >
              <EyeIcon open={showSenha} />
            </button>
          </div>
        </div>

        {erro && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{erro}</p>}

        <button onClick={handleLogin} disabled={loading} style={{
          width: '100%', padding: '12px', borderRadius: 10, border: 'none',
          background: loading ? '#CBD5E1' : G, color: '#fff',
          fontWeight: 600, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
          boxShadow: loading ? 'none' : '0 2px 8px rgba(6,158,110,.3)',
        }}>{loading ? 'Entrando...' : 'Entrar →'}</button>

      </div>
    </div>
  )
}
