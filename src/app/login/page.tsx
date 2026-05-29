'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginPartner } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const G = '#069E6E', N = '#2D2E47'

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
    const res = await loginPartner(email, senha)
    setLoading(false)
    if (res.error) { setErro(res.error); return }
    router.push('/portal')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 20, boxShadow: '0 4px 32px rgba(0,0,0,0.08)', padding: '40px 32px' }}>

        {/* LOGO */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/logo-mdc.png" alt="Meu Dentista em Casa" style={{ height: 64, marginBottom: 16, display: 'inline-block' }} />
          <h2 style={{ fontSize: 22, fontWeight: 700, color: N, marginBottom: 4 }}>Portal Parceiro</h2>
          <p style={{ fontSize: 14, color: G, fontWeight: 600 }}>Profissionais de Saúde</p>
        </div>

        {/* EMAIL */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>E-mail</label>
          <input
            type="email" value={email} placeholder="seu@email.com"
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 14, color: N, outline: 'none', background: '#F8FAFC' }}
          />
        </div>

        {/* SENHA */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Senha</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showSenha ? 'text' : 'password'} value={senha} placeholder="••••••••"
              onChange={e => setSenha(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{ width: '100%', padding: '12px 44px 12px 14px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 14, color: N, outline: 'none', background: '#F8FAFC' }}
            />
            <button
              onClick={() => setShowSenha(!showSenha)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 18, padding: 0 }}
            >{showSenha ? '🙈' : '👁️'}</button>
          </div>
        </div>

        {erro && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 14, textAlign: 'center' }}>{erro}</p>}

        <button onClick={handleLogin} disabled={loading} style={{
          width: '100%', padding: '13px', borderRadius: 12, border: 'none',
          background: loading ? '#CBD5E1' : G, color: '#fff',
          fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
          boxShadow: loading ? 'none' : '0 4px 12px rgba(6,158,110,0.3)',
        }}>{loading ? 'Entrando...' : 'Entrar no portal'}</button>

      </div>
    </div>
  )
}
