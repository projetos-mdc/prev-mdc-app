'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const G='#069E6E', N='#2D2E47'

export default function GestorLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function login() {
    if (!email || !senha) { setErro('Preencha todos os campos.'); return }
    setLoading(true); setErro('')

    const { data, error } = await supabase
      .from('gestores')
      .select('*, unidades(nome)')
      .eq('email', email.toLowerCase().trim())
      .eq('senha', senha)
      .single()

    setLoading(false)
    if (error || !data) { setErro('E-mail ou senha incorretos.'); return }

    localStorage.setItem('gestor_session', JSON.stringify(data))
    router.push('/gestor')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '32px 28px', maxWidth: 400, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: `linear-gradient(135deg,${G},#00BAB4)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 24 }}>🦷</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: N, marginBottom: 4 }}>Painel do Gestor</h1>
          <p style={{ fontSize: 13, color: '#64748B' }}>Acesso exclusivo — Meu Dentista em Casa</p>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>E-mail</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="gestor@email.com" onKeyDown={e => e.key === 'Enter' && login()}
            style={{ width: '100%', padding: '10px 13px', borderRadius: 10, border: '1.5px solid #CBD5E1', fontSize: 14, color: N, outline: 'none' }}
          />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>Senha</label>
          <input
            type="password" value={senha} onChange={e => setSenha(e.target.value)}
            placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && login()}
            style={{ width: '100%', padding: '10px 13px', borderRadius: 10, border: '1.5px solid #CBD5E1', fontSize: 14, color: N, outline: 'none' }}
          />
        </div>

        {erro && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{erro}</p>}

        <button onClick={login} disabled={loading} style={{
          width: '100%', padding: '12px', borderRadius: 10, border: 'none',
          background: loading ? '#CBD5E1' : G, color: '#fff',
          fontWeight: 600, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
        }}>{loading ? 'Entrando...' : 'Entrar →'}</button>
      </div>
    </div>
  )
}
