'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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

    const em = email.toLowerCase().trim()

    // 1. Verifica se é administrador
    const { data: admin } = await supabase
      .from('administradores')
      .select('*')
      .eq('email', em)
      .eq('senha', senha)
      .maybeSingle()

    if (admin) {
      localStorage.setItem('admin_session', JSON.stringify(admin))
      router.push('/admin')
      return
    }

    // 2. Verifica se é gestor
    const { data: gestor } = await supabase
      .from('gestores')
      .select('*, unidades(nome)')
      .eq('email', em)
      .eq('senha', senha)
      .maybeSingle()

    if (gestor) {
      localStorage.setItem('gestor_session', JSON.stringify(gestor))
      router.push('/gestor')
      return
    }

    // 3. Verifica se é parceiro
    const { data: parceiro } = await supabase
      .from('parceiros')
      .select('*')
      .eq('email', em)
      .eq('senha', senha)
      .eq('status', 'ativo')
      .maybeSingle()

    setLoading(false)

    if (parceiro) {
      localStorage.setItem('mdc_partner', JSON.stringify(parceiro))
      router.push('/portal')
      return
    }

    setErro('E-mail ou senha incorretos.')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '32px 28px' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#008194', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <img src="/logo-mdc.png" alt="Meu Dentista em Casa" style={{ height: 52, display: 'block' }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: N, marginBottom: 4 }}>Meu Dentista em Casa</h2>
          <p style={{ fontSize: 13, color: '#64748B' }}>Digite seu e-mail e senha para entrar</p>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>E-mail</label>
          <input
            type="email" value={email} placeholder="seu@email.com"
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ width: '100%', padding: '10px 13px', borderRadius: 10, border: '1.5px solid #CBD5E1', fontSize: 14, color: N, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>Senha</label>
          <input
            type="password" value={senha} placeholder="••••••••"
            onChange={e => setSenha(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ width: '100%', padding: '10px 13px', borderRadius: 10, border: '1.5px solid #CBD5E1', fontSize: 14, color: N, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {erro && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{erro}</p>}

        <button onClick={handleLogin} disabled={loading} style={{
          width: '100%', padding: '12px', borderRadius: 10, border: 'none',
          background: loading ? '#CBD5E1' : G, color: '#fff',
          fontWeight: 600, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
        }}>{loading ? 'Verificando...' : 'Entrar'}</button>
      </div>
    </div>
  )
}
