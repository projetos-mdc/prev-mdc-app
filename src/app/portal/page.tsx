'use client'
import nextDynamic from 'next/dynamic'

export const dynamic = 'force-dynamic'

const PortalClient = nextDynamic(() => import('./PortalClient'), {
  ssr: false,
  loading: () => (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <p style={{ color:'#64748B' }}>Carregando...</p>
    </div>
  )
})

export default function PortalPage() {
  return <PortalClient />
}
