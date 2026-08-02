'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const G = '#069E6E', N = '#2D2E47'

export default function AdminLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function login() {
    if (!email || !senha) { setErro('Preencha todos os campos.'); return }
    setLoading(true); setErro('')

    const { data, error } = await supabase
      .from('administradores')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('senha', senha)
      .single()

    setLoading(false)
    if (error || !data) { setErro('E-mail ou senha incorretos.'); return }

    localStorage.setItem('admin_session', JSON.stringify(data))
    router.push('/admin')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#1E293B', borderRadius: 16, border: '1px solid #334155', padding: '32px 28px', maxWidth: 400, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/logo-mdc.png" alt="Meu Dentista em Casa" style={{ height: 56, margin: '0 auto 16px', display: 'block' }} />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#F1F5F9', marginBottom: 4 }}>Super Admin</h1>
          <p style={{ fontSize: 13, color: '#64748B' }}>Acesso restrito — Meu Dentista em Casa</p>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94A3B8', marginBottom: 5 }}>E-mail</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="admin@email.com" onKeyDown={e => e.key === 'Enter' && login()}
            style={{ width: '100%', padding: '10px 13px', borderRadius: 10, border: '1.5px solid #334155', background: '#0F172A', fontSize: 14, color: '#F1F5F9', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94A3B8', marginBottom: 5 }}>Senha</label>
          <input
            type="password" value={senha} onChange={e => setSenha(e.target.value)}
            placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && login()}
            style={{ width: '100%', padding: '10px 13px', borderRadius: 10, border: '1.5px solid #334155', background: '#0F172A', fontSize: 14, color: '#F1F5F9', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {erro && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 14 }}>{erro}</p>}

        <button onClick={login} disabled={loading} style={{
          width: '100%', padding: '12px', borderRadius: 10, border: 'none',
          background: loading ? '#334155' : G, color: '#fff',
          fontWeight: 600, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
        }}>{loading ? 'Verificando...' : 'Entrar →'}</button>
      </div>
    </div>
  )
}
