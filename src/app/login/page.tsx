'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { loginPartner } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const G = '#069E6E', N = '#2D2E47'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
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
      <div style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '32px 28px' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img src="/logo-mdc.png" alt="Meu Dentista em Casa" style={{ height: 56, margin: '0 auto 16px', display: 'block' }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, color: N, marginBottom: 4 }}>Portal do Parceiro</h2>
          <p style={{ fontSize: 13, color: '#64748B' }}>Meu Dentista em Casa</p>
        </div>

        {[
          { label: 'E-mail', val: email, set: setEmail, type: 'email', ph: 'seu@email.com' },
          { label: 'Senha', val: senha, set: setSenha, type: 'password', ph: '••••••••' },
        ].map(f => (
          <div key={f.label} style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>{f.label}</label>
            <input
              type={f.type} value={f.val} placeholder={f.ph}
              onChange={e => f.set(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{ width: '100%', padding: '10px 13px', borderRadius: 10, border: '1.5px solid #CBD5E1', fontSize: 14, color: N, outline: 'none' }}
            />
          </div>
        ))}

        {erro && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 10 }}>{erro}</p>}

        <button onClick={handleLogin} disabled={loading} style={{
          width: '100%', padding: '12px', borderRadius: 10, border: 'none',
          background: loading ? '#CBD5E1' : G, color: '#fff',
          fontWeight: 600, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 14,
        }}>{loading ? 'Entrando...' : 'Entrar no portal'}</button>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>
          Ainda não é parceiro?{' '}
          <Link href="/cadastro" style={{ color: G, fontWeight: 600, textDecoration: 'none' }}>Fazer cadastro</Link>
        </p>
        <p style={{ textAlign: 'center', marginTop: 8 }}>
          <Link href="/" style={{ fontSize: 12, color: '#94A3B8', textDecoration: 'none' }}>← Voltar ao site</Link>
        </p>
      </div>
    </div>
  )
}

