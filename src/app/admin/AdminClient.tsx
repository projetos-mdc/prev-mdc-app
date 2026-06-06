'use client'
import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts'

const G = '#069E6E', N = '#2D2E47', TEAL = '#3E7996', CYAN = '#00BAB4'
const WARN = '#F59E0B', DANGER = '#EF4444'
const COLORS = [G, TEAL, CYAN, '#6366F1', '#EC4899', '#F97316', '#84CC16']

type Gestor = {
  id: string; nome: string; email: string; senha: string;
  status: string; criado_em: string; unidades?: { nome: string }
}
type Parceiro = {
  id: string; nome: string; email: string; especialidade: string;
  status: string; criado_em: string; gestor_id?: string; telefone?: string
}
type Indicacao = {
  id: string; paciente: string; status: string; beneficio: string;
  criado_em: string; parceiro_id: string; gestor_id?: string
}

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function kpiCard(label: string, value: string | number, sub: string, color: string, icon: string) {
  return (
    <div key={label} style={{
      background: '#fff', borderRadius: 14, padding: '20px 22px',
      border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,.05)',
      display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 160
    }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, color: N, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', marginTop: 3 }}>{label}</div>
        <div style={{ fontSize: 11, color: color, marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  )
}

export default function AdminClient() {
  const router = useRouter()
  const [admin, setAdmin] = useState<{ nome: string; email: string } | null>(null)
  const [tab, setTab] = useState<'dashboard' | 'gestores' | 'parceiros' | 'senha'>('dashboard')

  // Dados
  const [gestores, setGestores] = useState<Gestor[]>([])
  const [parceiros, setParceiros] = useState<Parceiro[]>([])
  const [indicacoes, setIndicacoes] = useState<Indicacao[]>([])

  // Filtros dashboard
  const [filtroDataIni, setFiltroDataIni] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 5); return d.toISOString().split('T')[0]
  })
  const [filtroDataFim, setFiltroDataFim] = useState(() => new Date().toISOString().split('T')[0])
  const [filtroGestor, setFiltroGestor] = useState('todos')

  // Modal criar gestor
  const [showModalGestor, setShowModalGestor] = useState(false)
  const [novoGestor, setNovoGestor] = useState({ nome: '', email: '', senha: '', unidade_id: '' })
  const [savingGestor, setSavingGestor] = useState(false)
  const [erroGestor, setErroGestor] = useState('')

  // Modal criar parceiro
  const [showModalParceiro, setShowModalParceiro] = useState(false)
  const [novoParceiro, setNovoParceiro] = useState({ nome: '', email: '', senha: '', especialidade: '', telefone: '', gestor_id: '' })
  const [savingParceiro, setSavingParceiro] = useState(false)
  const [erroParceiro, setErroParceiro] = useState('')

  // Recuperação de senha
  const [senhaEmail, setSenhaEmail] = useState('')
  const [senhaResult, setSenhaResult] = useState('')
  const [senhaLoading, setSenhaLoading] = useState(false)

  // Busca
  const [buscaGestor, setBuscaGestor] = useState('')
  const [buscaParceiro, setBuscaParceiro] = useState('')

  // Unidades para select
  const [unidades, setUnidades] = useState<{ id: string; nome: string }[]>([])

  const loadAll = useCallback(async () => {
    const [{ data: gs }, { data: ps }, { data: inds }, { data: uns }] = await Promise.all([
      supabase.from('gestores').select('*, unidades(nome)').order('criado_em', { ascending: false }),
      supabase.from('parceiros').select('*').order('criado_em', { ascending: false }),
      supabase.from('indicacoes').select('*').order('criado_em', { ascending: false }),
      supabase.from('unidades').select('id, nome'),
    ])
    if (gs) setGestores(gs as Gestor[])
    if (ps) setParceiros(ps as Parceiro[])
    if (inds) setIndicacoes(inds as Indicacao[])
    if (uns) setUnidades(uns)
  }, [])

  useEffect(() => {
    const s = localStorage.getItem('admin_session')
    if (!s) { router.push('/login'); return }
    setAdmin(JSON.parse(s))
    loadAll()
  }, [loadAll, router])

  // ─── COMPUTED ─────────────────────────────────────────────────────────────

  const indsFiltradas = indicacoes.filter(i => {
    const d = i.criado_em?.split('T')[0] ?? ''
    const okData = d >= filtroDataIni && d <= filtroDataFim
    const okGestor = filtroGestor === 'todos' || i.gestor_id === filtroGestor
    return okData && okGestor
  })

  const parcsFiltrados = parceiros.filter(p => {
    const okGestor = filtroGestor === 'todos' || p.gestor_id === filtroGestor
    return okGestor
  })

  // Gráfico: indicações por mês
  const indsPorMes = (() => {
    const map: Record<string, number> = {}
    indsFiltradas.forEach(i => {
      const d = new Date(i.criado_em)
      const k = `${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`
      map[k] = (map[k] || 0) + 1
    })
    return Object.entries(map).map(([mes, total]) => ({ mes, total }))
  })()

  // Gráfico: indicações por gestor
  const indsPorGestor = (() => {
    const map: Record<string, { nome: string; total: number }> = {}
    indicacoes.forEach(i => {
      if (!i.gestor_id) return
      const g = gestores.find(x => x.id === i.gestor_id)
      if (!g) return
      if (!map[i.gestor_id]) map[i.gestor_id] = { nome: g.nome, total: 0 }
      map[i.gestor_id].total++
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  })()

  // Gráfico: parceiros por gestor
  const parcsPorGestor = (() => {
    const map: Record<string, { nome: string; total: number }> = {}
    parceiros.forEach(p => {
      if (!p.gestor_id) return
      const g = gestores.find(x => x.id === p.gestor_id)
      if (!g) return
      if (!map[p.gestor_id]) map[p.gestor_id] = { nome: g.nome, total: 0 }
      map[p.gestor_id].total++
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  })()

  // Gráfico: tipos (consultoria vs avaliação) por mês
  const tiposPorMes = (() => {
    const map: Record<string, { mes: string; consultoria: number; avaliacao: number }> = {}
    indsFiltradas.forEach(i => {
      const d = new Date(i.criado_em)
      const k = `${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`
      if (!map[k]) map[k] = { mes: k, consultoria: 0, avaliacao: 0 }
      if (i.beneficio === 'consultoria') map[k].consultoria++
      else map[k].avaliacao++
    })
    return Object.values(map)
  })()

  // Status pie
  const statusData = [
    { name: 'Agendado', value: indsFiltradas.filter(i => i.status === 'agendado').length },
    { name: 'Atendido', value: indsFiltradas.filter(i => i.status === 'atendido').length },
    { name: 'Pendente', value: indsFiltradas.filter(i => i.status === 'pendente').length },
    { name: 'Cancelado', value: indsFiltradas.filter(i => i.status === 'cancelado').length },
  ].filter(x => x.value > 0)

  const gestAtivos = gestores.filter(g => g.status !== 'inativo').length
  const gestInativos = gestores.filter(g => g.status === 'inativo').length

  // ─── AÇÕES ──────────────────────────────────────────────────────────────

  async function toggleGestorStatus(g: Gestor) {
    const novoStatus = g.status === 'inativo' ? 'ativo' : 'inativo'
    await supabase.from('gestores').update({ status: novoStatus }).eq('id', g.id)
    setGestores(prev => prev.map(x => x.id === g.id ? { ...x, status: novoStatus } : x))
  }

  async function criarGestor() {
    setErroGestor('')
    if (!novoGestor.nome || !novoGestor.email || !novoGestor.senha) { setErroGestor('Preencha todos os campos obrigatórios.'); return }
    setSavingGestor(true)
    const { error } = await supabase.from('gestores').insert({
      nome: novoGestor.nome,
      email: novoGestor.email.toLowerCase().trim(),
      senha: novoGestor.senha,
      status: 'ativo',
      unidade_id: novoGestor.unidade_id || null,
    })
    setSavingGestor(false)
    if (error) { setErroGestor('Erro ao criar gestor: ' + error.message); return }
    setShowModalGestor(false)
    setNovoGestor({ nome: '', email: '', senha: '', unidade_id: '' })
    loadAll()
  }

  async function criarParceiro() {
    setErroParceiro('')
    if (!novoParceiro.nome || !novoParceiro.email || !novoParceiro.senha || !novoParceiro.especialidade) {
      setErroParceiro('Preencha todos os campos obrigatórios.'); return
    }
    setSavingParceiro(true)
    const { error } = await supabase.from('parceiros').insert({
      nome: novoParceiro.nome,
      email: novoParceiro.email.toLowerCase().trim(),
      senha: novoParceiro.senha,
      especialidade: novoParceiro.especialidade,
      telefone: novoParceiro.telefone || null,
      gestor_id: novoParceiro.gestor_id || null,
      status: 'ativo',
      tipo: 'profissional',
    })
    setSavingParceiro(false)
    if (error) { setErroParceiro('Erro ao criar parceiro: ' + error.message); return }
    setShowModalParceiro(false)
    setNovoParceiro({ nome: '', email: '', senha: '', especialidade: '', telefone: '', gestor_id: '' })
    loadAll()
  }

  async function buscarSenha() {
    if (!senhaEmail) return
    setSenhaLoading(true); setSenhaResult('')
    const emailNorm = senhaEmail.toLowerCase().trim()

    // busca em parceiros
    const { data: parc } = await supabase.from('parceiros').select('nome, senha').eq('email', emailNorm).single()
    if (parc) {
      setSenhaResult(`✅ Parceiro encontrado: ${parc.nome}\nSenha atual: ${parc.senha}`)
      setSenhaLoading(false); return
    }

    // busca em gestores
    const { data: gest } = await supabase.from('gestores').select('nome, senha').eq('email', emailNorm).single()
    if (gest) {
      setSenhaResult(`✅ Gestor encontrado: ${gest.nome}\nSenha atual: ${gest.senha}`)
      setSenhaLoading(false); return
    }

    setSenhaResult('❌ Nenhum usuário encontrado com este e-mail.')
    setSenhaLoading(false)
  }

  async function resetarSenha(novaSenha: string, tipo: 'parceiro' | 'gestor') {
    if (!senhaEmail || !novaSenha) return
    const emailNorm = senhaEmail.toLowerCase().trim()
    if (tipo === 'parceiro') {
      await supabase.from('parceiros').update({ senha: novaSenha }).eq('email', emailNorm)
    } else {
      await supabase.from('gestores').update({ senha: novaSenha }).eq('email', emailNorm)
    }
    setSenhaResult(prev => prev + '\n\n✅ Senha atualizada com sucesso!')
  }

  if (!admin) return null

  const SIDEBAR_ITEMS: { key: typeof tab; icon: string; label: string }[] = [
    { key: 'dashboard', icon: '📊', label: 'Dashboard' },
    { key: 'gestores', icon: '👔', label: 'Gestores' },
    { key: 'parceiros', icon: '🤝', label: 'Parceiros' },
    { key: 'senha', icon: '🔑', label: 'Senhas' },
  ]

  const inputStyle = (w?: string) => ({
    width: w || '100%', padding: '9px 12px', borderRadius: 8,
    border: '1.5px solid #CBD5E1', background: '#F8FAFC',
    fontSize: 13, color: N, outline: 'none',
  })

  const btnStyle = (color: string, disabled?: boolean) => ({
    padding: '9px 18px', borderRadius: 8, border: 'none',
    background: disabled ? '#CBD5E1' : color, color: '#fff',
    fontWeight: 600, fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer',
  })

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0F172A', fontFamily: 'Inter,system-ui,sans-serif' }}>

      {/* ── SIDEBAR ── */}
      <aside style={{ width: 220, background: '#1E293B', display: 'flex', flexDirection: 'column', borderRight: '1px solid #334155', flexShrink: 0 }}>
        <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid #334155' }}>
          <img src="/logo-mdc.png" alt="MDC" style={{ height: 40, display: 'block', marginBottom: 12 }} />
          <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase' }}>Super Admin</div>
          <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{admin.email}</div>
        </div>

        <nav style={{ flex: 1, padding: '12px 0' }}>
          {SIDEBAR_ITEMS.map(item => (
            <button key={item.key} onClick={() => setTab(item.key)} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              width: '100%', padding: '11px 20px', border: 'none',
              background: tab === item.key ? G + '22' : 'transparent',
              borderLeft: tab === item.key ? `3px solid ${G}` : '3px solid transparent',
              color: tab === item.key ? G : '#94A3B8',
              fontSize: 14, fontWeight: tab === item.key ? 600 : 400,
              cursor: 'pointer', textAlign: 'left',
            }}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid #334155' }}>
          <button onClick={() => { localStorage.removeItem('admin_session'); router.push('/login') }} style={{
            width: '100%', padding: '9px', borderRadius: 8, border: '1px solid #334155',
            background: 'transparent', color: '#94A3B8', fontSize: 13, cursor: 'pointer',
          }}>← Sair</button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={{ flex: 1, overflowY: 'auto', background: '#F1F5F9' }}>

        {/* Header */}
        <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: N, margin: 0 }}>
              {tab === 'dashboard' && '📊 Dashboard Geral'}
              {tab === 'gestores' && '👔 Gestores'}
              {tab === 'parceiros' && '🤝 Parceiros'}
              {tab === 'senha' && '🔑 Recuperação de Senha'}
            </h1>
            <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>Meu Dentista em Casa — Painel Administrativo</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ background: G + '18', color: G, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
              {gestAtivos} gestor{gestAtivos !== 1 ? 'es' : ''} ativo{gestAtivos !== 1 ? 's' : ''}
            </span>
            {gestInativos > 0 && (
              <span style={{ background: DANGER + '18', color: DANGER, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
                {gestInativos} pausado{gestInativos !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        <div style={{ padding: '24px 28px' }}>

          {/* ═══════════════ DASHBOARD ═══════════════ */}
          {tab === 'dashboard' && (
            <div>
              {/* Filtros */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 24, background: '#fff', padding: '16px 20px', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>De</label>
                  <input type="date" value={filtroDataIni} onChange={e => setFiltroDataIni(e.target.value)} style={inputStyle('140px')} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>Até</label>
                  <input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)} style={inputStyle('140px')} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>Gestor</label>
                  <select value={filtroGestor} onChange={e => setFiltroGestor(e.target.value)} style={inputStyle('180px')}>
                    <option value="todos">Todos os gestores</option>
                    {gestores.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                  </select>
                </div>
                <button onClick={loadAll} style={{ ...btnStyle(TEAL), marginTop: 16 }}>↻ Atualizar</button>
              </div>

              {/* KPIs */}
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
                {kpiCard('Total de Gestores', gestores.length, `${gestAtivos} ativos • ${gestInativos} pausados`, N, '👔')}
                {kpiCard('Total de Parceiros', parceiros.length, `${parceiros.filter(p => p.status === 'ativo').length} ativos`, TEAL, '🤝')}
                {kpiCard('Indicações (período)', indsFiltradas.length, `de ${indicacoes.length} no total`, G, '📋')}
                {kpiCard('Atendidos', indsFiltradas.filter(i => i.status === 'atendido').length, `${Math.round(indsFiltradas.length > 0 ? indsFiltradas.filter(i => i.status === 'atendido').length / indsFiltradas.length * 100 : 0)}% de conversão`, CYAN, '✅')}
              </div>

              {/* Charts row 1 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

                {/* Indicações por mês */}
                <div style={{ background: '#fff', borderRadius: 14, padding: '20px', border: '1px solid #E2E8F0' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: N, margin: '0 0 16px' }}>Indicações por Mês</h3>
                  {indsPorMes.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#94A3B8', padding: '40px 0', fontSize: 13 }}>Sem dados no período</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={indsPorMes}>
                        <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="total" fill={G} radius={[4, 4, 0, 0]} name="Indicações" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Status Pie */}
                <div style={{ background: '#fff', borderRadius: 14, padding: '20px', border: '1px solid #E2E8F0' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: N, margin: '0 0 16px' }}>Status das Indicações</h3>
                  {statusData.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#94A3B8', padding: '40px 0', fontSize: 13 }}>Sem dados no período</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Charts row 2 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

                {/* Indicações por gestor */}
                <div style={{ background: '#fff', borderRadius: 14, padding: '20px', border: '1px solid #E2E8F0' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: N, margin: '0 0 16px' }}>Indicações por Gestor</h3>
                  {indsPorGestor.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#94A3B8', padding: '40px 0', fontSize: 13 }}>Sem dados</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={indsPorGestor} layout="vertical">
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis dataKey="nome" type="category" width={100} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="total" fill={TEAL} radius={[0, 4, 4, 0]} name="Indicações" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Parceiros por gestor */}
                <div style={{ background: '#fff', borderRadius: 14, padding: '20px', border: '1px solid #E2E8F0' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: N, margin: '0 0 16px' }}>Parceiros por Gestor</h3>
                  {parcsPorGestor.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#94A3B8', padding: '40px 0', fontSize: 13 }}>Sem dados</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={parcsPorGestor} layout="vertical">
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis dataKey="nome" type="category" width={100} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="total" fill={CYAN} radius={[0, 4, 4, 0]} name="Parceiros" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Consultoria vs Avaliação */}
              <div style={{ background: '#fff', borderRadius: 14, padding: '20px', border: '1px solid #E2E8F0', marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: N, margin: '0 0 16px' }}>Consultoria vs Avaliação por Mês</h3>
                {tiposPorMes.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94A3B8', padding: '40px 0', fontSize: 13 }}>Sem dados no período</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={tiposPorMes}>
                      <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="consultoria" stroke={G} strokeWidth={2} dot={{ r: 4 }} name="Consultoria" />
                      <Line type="monotone" dataKey="avaliacao" stroke={TEAL} strokeWidth={2} dot={{ r: 4 }} name="Avaliação" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Tabela de produção por gestor */}
              <div style={{ background: '#fff', borderRadius: 14, padding: '20px', border: '1px solid #E2E8F0' }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: N, margin: '0 0 16px' }}>Produção por Gestor</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC' }}>
                        {['Gestor', 'Status', 'Parceiros', 'Indicações (total)', 'Atendidos', 'Conversão'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#475569', fontWeight: 600, borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {gestores.map((g, idx) => {
                        const pCount = parceiros.filter(p => p.gestor_id === g.id).length
                        const iCount = indicacoes.filter(i => i.gestor_id === g.id).length
                        const aCount = indicacoes.filter(i => i.gestor_id === g.id && i.status === 'atendido').length
                        const conv = iCount > 0 ? Math.round(aCount / iCount * 100) : 0
                        return (
                          <tr key={g.id} style={{ background: idx % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                            <td style={{ padding: '10px 14px', color: N, fontWeight: 500 }}>{g.nome}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ background: g.status === 'inativo' ? DANGER + '18' : G + '18', color: g.status === 'inativo' ? DANGER : G, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
                                {g.status === 'inativo' ? '⏸ Pausado' : '● Ativo'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', color: TEAL, fontWeight: 600 }}>{pCount}</td>
                            <td style={{ padding: '10px 14px', color: N }}>{iCount}</td>
                            <td style={{ padding: '10px 14px', color: G, fontWeight: 600 }}>{aCount}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ background: conv >= 50 ? G + '18' : WARN + '18', color: conv >= 50 ? G : WARN, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
                                {conv}%
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {gestores.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#94A3B8', padding: '32px', fontSize: 13 }}>Nenhum gestor cadastrado</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ GESTORES ═══════════════ */}
          {tab === 'gestores' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <input placeholder="🔍 Buscar gestor..." value={buscaGestor} onChange={e => setBuscaGestor(e.target.value)} style={inputStyle('280px')} />
                <button onClick={() => setShowModalGestor(true)} style={btnStyle(G)}>+ Novo Gestor</button>
              </div>

              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      {['Nome', 'E-mail', 'Unidade', 'Cadastro', 'Status', 'Ações'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600, borderBottom: '1px solid #E2E8F0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {gestores.filter(g => !buscaGestor || g.nome.toLowerCase().includes(buscaGestor.toLowerCase()) || g.email.toLowerCase().includes(buscaGestor.toLowerCase())).map((g, idx) => (
                      <tr key={g.id} style={{ background: idx % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                        <td style={{ padding: '12px 16px', color: N, fontWeight: 500 }}>{g.nome}</td>
                        <td style={{ padding: '12px 16px', color: '#64748B' }}>{g.email}</td>
                        <td style={{ padding: '12px 16px', color: '#64748B' }}>{(g.unidades as any)?.nome || '—'}</td>
                        <td style={{ padding: '12px 16px', color: '#64748B', whiteSpace: 'nowrap' }}>{new Date(g.criado_em).toLocaleDateString('pt-BR')}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            background: g.status === 'inativo' ? DANGER + '15' : G + '15',
                            color: g.status === 'inativo' ? DANGER : G,
                            borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600
                          }}>
                            {g.status === 'inativo' ? '⏸ Pausado' : '● Ativo'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <button onClick={() => toggleGestorStatus(g)} style={{
                            padding: '6px 14px', borderRadius: 7, border: 'none',
                            background: g.status === 'inativo' ? G + '18' : DANGER + '18',
                            color: g.status === 'inativo' ? G : DANGER,
                            fontWeight: 600, fontSize: 12, cursor: 'pointer',
                          }}>
                            {g.status === 'inativo' ? '▶ Ativar' : '⏸ Pausar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {gestores.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#94A3B8', padding: '40px', fontSize: 13 }}>Nenhum gestor cadastrado</div>
                )}
              </div>

              {/* Modal criar gestor */}
              {showModalGestor && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                  <div style={{ background: '#fff', borderRadius: 16, padding: '28px', width: 440, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: N, margin: '0 0 20px' }}>Novo Gestor</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Nome *</label>
                        <input value={novoGestor.nome} onChange={e => setNovoGestor(p => ({ ...p, nome: e.target.value }))} style={inputStyle()} placeholder="Nome completo" />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>E-mail *</label>
                        <input type="email" value={novoGestor.email} onChange={e => setNovoGestor(p => ({ ...p, email: e.target.value }))} style={inputStyle()} placeholder="email@exemplo.com" />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Senha *</label>
                        <input value={novoGestor.senha} onChange={e => setNovoGestor(p => ({ ...p, senha: e.target.value }))} style={inputStyle()} placeholder="Senha de acesso" />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Unidade</label>
                        <select value={novoGestor.unidade_id} onChange={e => setNovoGestor(p => ({ ...p, unidade_id: e.target.value }))} style={inputStyle()}>
                          <option value="">Selecionar unidade (opcional)</option>
                          {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                        </select>
                      </div>
                      {erroGestor && <p style={{ color: DANGER, fontSize: 12, margin: 0 }}>{erroGestor}</p>}
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                        <button onClick={() => { setShowModalGestor(false); setErroGestor('') }} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#fff', color: '#64748B', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
                        <button onClick={criarGestor} disabled={savingGestor} style={btnStyle(G, savingGestor)}>{savingGestor ? 'Salvando...' : 'Criar Gestor'}</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════ PARCEIROS ═══════════════ */}
          {tab === 'parceiros' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <input placeholder="🔍 Buscar parceiro..." value={buscaParceiro} onChange={e => setBuscaParceiro(e.target.value)} style={inputStyle('280px')} />
                <button onClick={() => setShowModalParceiro(true)} style={btnStyle(G)}>+ Novo Parceiro</button>
              </div>

              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      {['Nome', 'E-mail', 'Especialidade', 'Gestor', 'Cadastro', 'Status'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600, borderBottom: '1px solid #E2E8F0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parceiros
                      .filter(p => !buscaParceiro || p.nome.toLowerCase().includes(buscaParceiro.toLowerCase()) || p.email.toLowerCase().includes(buscaParceiro.toLowerCase()))
                      .map((p, idx) => {
                        const g = gestores.find(x => x.id === p.gestor_id)
                        return (
                          <tr key={p.id} style={{ background: idx % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                            <td style={{ padding: '12px 16px', color: N, fontWeight: 500 }}>{p.nome}</td>
                            <td style={{ padding: '12px 16px', color: '#64748B' }}>{p.email}</td>
                            <td style={{ padding: '12px 16px', color: '#64748B' }}>{p.especialidade}</td>
                            <td style={{ padding: '12px 16px', color: TEAL }}>{g?.nome || '—'}</td>
                            <td style={{ padding: '12px 16px', color: '#64748B', whiteSpace: 'nowrap' }}>{new Date(p.criado_em).toLocaleDateString('pt-BR')}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{
                                background: p.status === 'pendente' ? WARN + '18' : p.status === 'rejeitado' ? DANGER + '18' : G + '18',
                                color: p.status === 'pendente' ? WARN : p.status === 'rejeitado' ? DANGER : G,
                                borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600,
                              }}>
                                {p.status === 'pendente' ? '⏳ Pendente' : p.status === 'rejeitado' ? '✕ Rejeitado' : '● Ativo'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
                {parceiros.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#94A3B8', padding: '40px', fontSize: 13 }}>Nenhum parceiro cadastrado</div>
                )}
              </div>

              {/* Modal criar parceiro */}
              {showModalParceiro && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                  <div style={{ background: '#fff', borderRadius: 16, padding: '28px', width: 460, boxShadow: '0 20px 60px rgba(0,0,0,.2)', maxHeight: '90vh', overflowY: 'auto' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: N, margin: '0 0 20px' }}>Novo Parceiro</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Nome *</label>
                        <input value={novoParceiro.nome} onChange={e => setNovoParceiro(p => ({ ...p, nome: e.target.value }))} style={inputStyle()} placeholder="Nome completo" />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>E-mail *</label>
                        <input type="email" value={novoParceiro.email} onChange={e => setNovoParceiro(p => ({ ...p, email: e.target.value }))} style={inputStyle()} placeholder="email@exemplo.com" />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Senha *</label>
                        <input value={novoParceiro.senha} onChange={e => setNovoParceiro(p => ({ ...p, senha: e.target.value }))} style={inputStyle()} placeholder="Senha de acesso" />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Especialidade *</label>
                        <select value={novoParceiro.especialidade} onChange={e => setNovoParceiro(p => ({ ...p, especialidade: e.target.value }))} style={inputStyle()}>
                          <option value="">Selecionar especialidade</option>
                          {['Médico','Enfermeiro','Fisioterapeuta','Nutricionista','Psicólogo','Terapeuta Ocupacional','Fonoaudiólogo','Dentista','Técnico de Enfermagem','Outro Profissional de Saúde'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Telefone</label>
                        <input value={novoParceiro.telefone} onChange={e => setNovoParceiro(p => ({ ...p, telefone: e.target.value }))} style={inputStyle()} placeholder="(00) 00000-0000" />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Vincular ao Gestor</label>
                        <select value={novoParceiro.gestor_id} onChange={e => setNovoParceiro(p => ({ ...p, gestor_id: e.target.value }))} style={inputStyle()}>
                          <option value="">Sem gestor específico</option>
                          {gestores.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                        </select>
                      </div>
                      {erroParceiro && <p style={{ color: DANGER, fontSize: 12, margin: 0 }}>{erroParceiro}</p>}
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                        <button onClick={() => { setShowModalParceiro(false); setErroParceiro('') }} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#fff', color: '#64748B', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
                        <button onClick={criarParceiro} disabled={savingParceiro} style={btnStyle(G, savingParceiro)}>{savingParceiro ? 'Salvando...' : 'Criar Parceiro'}</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════ SENHAS ═══════════════ */}
          {tab === 'senha' && (
            <div style={{ maxWidth: 520 }}>
              <div style={{ background: '#fff', borderRadius: 14, padding: '28px', border: '1px solid #E2E8F0' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: N, margin: '0 0 6px' }}>🔑 Recuperação / Reset de Senha</h3>
                <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 24px' }}>Busque o usuário pelo e-mail para ver ou redefinir a senha.</p>

                <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                  <input
                    type="email" value={senhaEmail} placeholder="email@usuario.com"
                    onChange={e => { setSenhaEmail(e.target.value); setSenhaResult('') }}
                    style={inputStyle()}
                  />
                  <button onClick={buscarSenha} disabled={senhaLoading} style={{ ...btnStyle(TEAL, senhaLoading), whiteSpace: 'nowrap' }}>
                    {senhaLoading ? '...' : '🔍 Buscar'}
                  </button>
                </div>

                {senhaResult && (
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '16px', marginBottom: 20 }}>
                    <pre style={{ fontSize: 13, color: N, margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{senhaResult}</pre>
                  </div>
                )}

                {senhaResult.includes('✅') && !senhaResult.includes('atualizada') && (
                  <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 20 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: N, marginBottom: 12 }}>Redefinir senha:</p>
                    <ResetSenhaForm onReset={resetarSenha} tipoDetectado={senhaResult.includes('Parceiro') ? 'parceiro' : 'gestor'} />
                  </div>
                )}
              </div>

              <div style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #E2E8F0', marginTop: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: N, margin: '0 0 16px' }}>📋 Todos os acessos</h3>
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#475569', margin: '0 0 8px' }}>GESTORES ({gestores.length})</p>
                  {gestores.map(g => (
                    <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#F8FAFC', borderRadius: 6, marginBottom: 4, fontSize: 12 }}>
                      <span style={{ color: N, fontWeight: 500 }}>{g.nome}</span>
                      <span style={{ color: '#94A3B8' }}>{g.email}</span>
                      <span style={{ color: TEAL, fontFamily: 'monospace' }}>{g.senha}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}

// Componente auxiliar para reset de senha
function ResetSenhaForm({ onReset, tipoDetectado }: { onReset: (nova: string, tipo: 'parceiro' | 'gestor') => void; tipoDetectado: 'parceiro' | 'gestor' }) {
  const [nova, setNova] = useState('')
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <input value={nova} onChange={e => setNova(e.target.value)} placeholder="Nova senha" style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1.5px solid #CBD5E1', background: '#F8FAFC', fontSize: 13, outline: 'none' }} />
      <button onClick={() => { if (nova) { onReset(nova, tipoDetectado); setNova('') } }} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#069E6E', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
        Salvar
      </button>
    </div>
  )
}
