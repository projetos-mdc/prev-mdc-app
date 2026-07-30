'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'

const G = '#069E6E', N = '#2D2E47'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    router.push('/portal')
  }, [router])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F1F5F9' }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 16 }}>🦷</div>
      <p style={{ color: N, fontWeight: 600, fontSize: 16 }}>Entrando...</p>
      <p style={{ color: '#64748B', fontSize: 13, marginTop: 6 }}>Aguarde um momento.</p>
    </div>
  )
}
