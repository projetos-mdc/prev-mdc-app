'use client'
import nextDynamic from 'next/dynamic'

export const dynamic = 'force-dynamic'

const AdminClient = nextDynamic(() => import('./AdminClient'), {
  ssr: false,
  loading: () => (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F172A' }}>
      <p style={{ color: '#94A3B8' }}>Carregando painel administrativo...</p>
    </div>
  ),
})

export default function AdminPage() {
  return <AdminClient />
}
