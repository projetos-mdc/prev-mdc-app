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
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

type Gestor = {
  id: string; nome: string; email: string; senha: string
  status: string; created_at: string; unidade_id?: string
  unidades?: { nome: string }
}
type Parceiro = {
  id: string; nome: string; email: string; especialidade: string
  status: string; data_cadastro: string; unidade_id?: string; whatsapp?: string
}
type Indicacao = {
  id: string; paciente_nome: string; status: string; modelo: string
  data_indicacao: string; parceiro_id: string; unidade_id?: string
}
type Unidade = { id: string; nome: string }

const inputStyle = (w?: string): React.CSSProperties => ({
  width: w || '100%', padding: '9px 12px', borderRadius: 8,
  border: '1.5px solid #CBD5E1', background: '#F8FAFC',
  fontSize: 13, color: N, outline: 'none', boxSizing: 'border-box',
})
const btnStyle = (color: string, disabled?: boolean): React.CSSProperties => ({
  padding: '9px 18px', borderRadius: 8, border: 'none',
  background: disabled ? '#CBD5E1' : color, color: '#fff',
  fontWeight: 600, fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
})

function KpiCard({ label, value, sub, color, icon }: { label: string; value: string | number; sub: string; color: string; icon: string }) {
  return (
    <div style={{
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

function ResetSenhaForm({ onReset, tipo }: { onReset: (nova: string, tipo: 'parceiro' | 'gestor') => void; tipo: 'parceiro' | 'gestor' }) {
  const [nova, setNova] = useState('')
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
      <input value={nova} onChange={e => setNova(e.target.value)} placeholder="Nova senha" style={inputStyle()} />
      <button onClick={() => { if (nova) { onReset(nova, tipo); setNova('') } }} style={btnStyle(G)}>Salvar</button>
    </div>
  )
}

export default function AdminClient() {
  const router = useRouter()
  const [admin, setAdmin] = useState<{ nome: string; email: string } | null>(null)
  const [tab, setTab] = useState<'dashboard' | 'gestores' | 'parceiros' | 'senha'>('dashboard')

  const [gestores, setGestores] = useState<Gestor[]>([])
  const [parceiros, setParceiros] = useState<Parceiro[]>([])
  const [indicacoes, setIndicacoes] = useState<Indicacao[]>([])
  const [unidades, setUnidades] = useState<Unidade[]>([])

  // Filtros dashboard
  const [filtroDataIni, setFiltroDataIni] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 5); return d.toISOString().split('T')[0]
  })
  const [filtroDataFim, setFiltroDataFim] = useState(() => new Date().toISOString().split('T')[0])
  const [filtroGestor, setFiltroGestor] = useState('todos')

  // Modal gestor
  const [showModalGestor, setShowModalGestor] = useState(false)
  const [novoGestor, setNovoGestor] = useState({ nome: '', email: '', senha: '', unidade_id: '' })
  const [savingGestor, setSavingGestor] = useState(false)
  const [erroGestor, setErroGestor] = useState('')

  // Modal parceiro
  const [showModalParceiro, setShowModalParceiro] = useState(false)
  const [novoParceiro, setNovoParceiro] = useState({ nome: '', email: '', senha: '', especialidade: '', whatsapp: '', unidade_id: '' })
  const [savingParceiro, setSavingParceiro] = useState(false)
  const [erroParceiro, setErroParceiro] = useState('')

  // Senha
  const [senhaEmail, setSenhaEmail] = useState('')
  const [senhaResult, setSenhaResult] = useState('')
  const [senhaLoading, setSenhaLoading] = useState(false)
  const [senhaFound, setSenhaFound] = useState<{ tipo: 'parceiro' | 'gestor'; nome: string } | null>(null)

  // Busca
  const [buscaGestor, setBuscaGestor] = useState('')
  const [buscaParceiro, setBuscaParceiro] = useState('')

  const loadAll = useCallback(async () => {
    const [{ data: gs }, { data: ps }, { data: inds }, { data: uns }] = await Promise.all([
      supabase.from('gestores').select('*, unidades(nome)').order('created_at', { ascending: false }),
      supabase.from('parceiros').select('*').order('data_cadastro', { ascending: false }),
      supabase.from('indicacoes').select('*').order('data_indicacao', { ascending: false }),
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

  // ─── HELPERS ──────────────────────────────────────────────────────────────
  // Dado um gestor, retorna o unidade_id dele
  const gestorUnidadeId = (g: Gestor) => g.unidade_id ?? null

  // Indicações do período filtradas
  const indsFiltradas = indicacoes.filter(i => {
    const d = (i.data_indicacao ?? '').split('T')[0]
    const okData = d >= filtroDataIni && d <= filtroDataFim
    if (!okData) return false
    if (filtroGestor === 'todos') return true
    const g = gestores.find(x => x.id === filtroGestor)
    return g ? i.unidade_id === gestorUnidadeId(g) : true
  })

  // ─── GRÁFICOS ─────────────────────────────────────────────────────────────
  const indsPorMes = (() => {
    const map: Record<string, number> = {}
    indsFiltradas.forEach(i => {
      const d = new Date(i.data_indicacao)
      const k = `${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`
      map[k] = (map[k] || 0) + 1
    })
    return Object.entries(map).map(([mes, total]) => ({ mes, total }))
  })()

  const indsPorGestor = gestores.map(g => {
    const uid = gestorUnidadeId(g)
    const total = indicacoes.filter(i => i.unidade_id === uid).length
    return { nome: g.nome, total }
  }).filter(x => x.total > 0).sort((a, b) => b.total - a.total)

  const parcsPorGestor = gestores.map(g => {
    const uid = gestorUnidadeId(g)
    const total = parceiros.filter(p => p.unidade_id === uid).length
    return { nome: g.nome, total }
  }).filter(x => x.total > 0).sort((a, b) => b.total - a.total)

  const tiposPorMes = (() => {
    const map: Record<string, { mes: string; consultoria: number; avaliacao: number }> = {}
    indsFiltradas.forEach(i => {
      const d = new Date(i.data_indicacao)
      const k = `${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`
      if (!map[k]) map[k] = { mes: k, consultoria: 0, avaliacao: 0 }
      const m = (i.modelo ?? '').toLowerCase()
      if (m.includes('consult')) map[k].consultoria++
      else map[k].avaliacao++
    })
    return Object.values(map)
  })()

  const statusData = [
    { name: 'Agendado',   value: indsFiltradas.filter(i => i.status === 'agendado').length },
    { name: 'Atendido',   value: indsFiltradas.filter(i => i.status === 'atendido').length },
    { name: 'Pendente',   value: indsFiltradas.filter(i => i.status === 'pendente').length },
    { name: 'Cancelado',  value: indsFiltradas.filter(i => i.status === 'cancelado').length },
    { name: 'Aguardando', value: indsFiltradas.filter(i => i.status === 'aguardando_contato' || i.status === 'aguardando').length },
  ].filter(x => x.value > 0)

  const gestAtivos   = gestores.filter(g => g.status !== 'inativo').length
  const gestInativos = gestores.filter(g => g.status === 'inativo').length

  // ─── AÇÕES ────────────────────────────────────────────────────────────────
  async function toggleGestorStatus(g: Gestor) {
    const novo = g.status === 'inativo' ? 'ativo' : 'inativo'
    await supabase.from('gestores').update({ status: novo }).eq('id', g.id)
    setGestores(prev => prev.map(x => x.id === g.id ? { ...x, status: novo } : x))
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
    if (error) { setErroGestor('Erro: ' + error.message); return }
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
      whatsapp: novoParceiro.whatsapp || null,
      unidade_id: novoParceiro.unidade_id || null,
      status: 'ativo',
      tipo: 'profissional',
    })
    setSavingParceiro(false)
    if (error) { setErroParceiro('Erro: ' + error.message); return }
    setShowModalParceiro(false)
    setNovoParceiro({ nome: '', email: '', senha: '', especialidade: '', whatsapp: '', unidade_id: '' })
    loadAll()
  }

  async function buscarSenha() {
    if (!senhaEmail) return
    setSenhaLoading(true); setSenhaResult(''); setSenhaFound(null)
    const em = senhaEmail.toLowerCase().trim()
    const { data: parc } = await supabase.from('parceiros').select('nome, senha').eq('email', em).single()
    if (parc) {
      setSenhaResult(`✅ Parceiro: ${parc.nome}\nSenha atual: ${parc.senha}`)
      setSenhaFound({ tipo: 'parceiro', nome: parc.nome })
      setSenhaLoading(false); return
    }
    const { data: gest } = await supabase.from('gestores').select('nome, senha').eq('email', em).single()
    if (gest) {
      setSenhaResult(`✅ Gestor: ${gest.nome}\nSenha atual: ${gest.senha}`)
      setSenhaFound({ tipo: 'gestor', nome: gest.nome })
      setSenhaLoading(false); return
    }
    setSenhaResult('❌ Nenhum usuário encontrado com este e-mail.')
    setSenhaLoading(false)
  }

  async function resetarSenha(nova: string, tipo: 'parceiro' | 'gestor') {
    const em = senhaEmail.toLowerCase().trim()
    const tabela = tipo === 'parceiro' ? 'parceiros' : 'gestores'
    await supabase.from(tabela).update({ senha: nova }).eq('email', em)
    setSenhaResult(prev => prev + '\n\n✅ Senha atualizada com sucesso!')
    setSenhaFound(null)
  }

  if (!admin) return null

  const SIDEBAR = [
    { key: 'dashboard' as const, icon: '📊', label: 'Dashboard' },
    { key: 'gestores'  as const, icon: '👔', label: 'Gestores' },
    { key: 'parceiros' as const, icon: '🤝', label: 'Parceiros' },
    { key: 'senha'     as const, icon: '🔑', label: 'Senhas' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter,system-ui,sans-serif' }}>

      {/* SIDEBAR */}
      <aside style={{ width: 220, background: '#1E293B', display: 'flex', flexDirection: 'column', borderRight: '1px solid #334155', flexShrink: 0 }}>
        <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid #334155' }}>
          <img src="/logo-mdc.png" alt="MDC" style={{ height: 40, display: 'block', marginBottom: 12 }} />
          <div style={{ fontSize: 10, color: '#64748B', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>Super Admin</div>
          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{admin.email}</div>
        </div>
        <nav style={{ flex: 1, padding: '12px 0' }}>
          {SIDEBAR.map(item => (
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
          <button onClick={() => { localStorage.removeItem('admin_session'); router.push('/login') }}
            style={{ width: '100%', padding: '9px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#94A3B8', fontSize: 13, cursor: 'pointer' }}>
            ← Sair
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, overflowY: 'auto', background: '#F1F5F9' }}>

        {/* Header */}
        <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: N, margin: 0 }}>
              {tab === 'dashboard' && '📊 Dashboard Geral'}
              {tab === 'gestores'  && '👔 Gestores'}
              {tab === 'parceiros' && '🤝 Parceiros'}
              {tab === 'senha'     && '🔑 Recuperação de Senha'}
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

          {/* ══════════════ DASHBOARD ══════════════ */}
          {tab === 'dashboard' && (
            <div>
              {/* Filtros */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 24, background: '#fff', padding: '16px 20px', borderRadius: 12, border: '1px solid #E2E8F0' }}>
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
                  <select value={filtroGestor} onChange={e => setFiltroGestor(e.target.value)} style={inputStyle('200px')}>
                    <option value="todos">Todos os gestores</option>
                    {gestores.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                  </select>
                </div>
                <button onClick={loadAll} style={btnStyle(TEAL)}>↻ Atualizar</button>
              </div>

              {/* KPIs */}
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
                <KpiCard label="Total de Gestores"     value={gestores.length}   sub={`${gestAtivos} ativos • ${gestInativos} pausados`} color={N}    icon="👔" />
                <KpiCard label="Total de Parceiros"    value={parceiros.length}  sub={`${parceiros.filter(p => p.status === 'ativo').length} ativos`} color={TEAL} icon="🤝" />
                <KpiCard label="Indicações (período)"  value={indsFiltradas.length} sub={`de ${indicacoes.length} no total`} color={G} icon="📋" />
                <KpiCard label="Atendidos"
                  value={indsFiltradas.filter(i => i.status === 'atendido').length}
                  sub={`${Math.round(indsFiltradas.length > 0 ? indsFiltradas.filter(i => i.status === 'atendido').length / indsFiltradas.length * 100 : 0)}% conversão`}
                  color={CYAN} icon="✅" />
              </div>

              {/* Charts row 1 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #E2E8F0' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: N, margin: '0 0 16px' }}>Indicações por Mês</h3>
                  {indsPorMes.length === 0
                    ? <div style={{ textAlign: 'center', color: '#94A3B8', padding: '40px 0', fontSize: 13 }}>Sem dados no período</div>
                    : <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={indsPorMes}>
                          <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="total" fill={G} radius={[4,4,0,0]} name="Indicações" />
                        </BarChart>
                      </ResponsiveContainer>
                  }
                </div>

                <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #E2E8F0' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: N, margin: '0 0 16px' }}>Status das Indicações</h3>
                  {statusData.length === 0
                    ? <div style={{ textAlign: 'center', color: '#94A3B8', padding: '40px 0', fontSize: 13 }}>Sem dados no período</div>
                    : <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={statusData} cx="50%" cy="50%" outerRadius={75} dataKey="value"
                            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                            {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                  }
                </div>
              </div>

              {/* Charts row 2 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #E2E8F0' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: N, margin: '0 0 16px' }}>Indicações por Gestor (total)</h3>
                  {indsPorGestor.length === 0
                    ? <div style={{ textAlign: 'center', color: '#94A3B8', padding: '40px 0', fontSize: 13 }}>Sem dados</div>
                    : <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={indsPorGestor} layout="vertical">
                          <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                          <YAxis dataKey="nome" type="category" width={110} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="total" fill={TEAL} radius={[0,4,4,0]} name="Indicações" />
                        </BarChart>
                      </ResponsiveContainer>
                  }
                </div>

                <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #E2E8F0' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: N, margin: '0 0 16px' }}>Parceiros por Gestor</h3>
                  {parcsPorGestor.length === 0
                    ? <div style={{ textAlign: 'center', color: '#94A3B8', padding: '40px 0', fontSize: 13 }}>Sem dados</div>
                    : <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={parcsPorGestor} layout="vertical">
                          <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                          <YAxis dataKey="nome" type="category" width={110} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="total" fill={CYAN} radius={[0,4,4,0]} name="Parceiros" />
                        </BarChart>
                      </ResponsiveContainer>
                  }
                </div>
              </div>

              {/* Consultoria vs Avaliação */}
              <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #E2E8F0', marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: N, margin: '0 0 16px' }}>Consultoria vs Avaliação por Mês</h3>
                {tiposPorMes.length === 0
                  ? <div style={{ textAlign: 'center', color: '#94A3B8', padding: '40px 0', fontSize: 13 }}>Sem dados no período</div>
                  : <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={tiposPorMes}>
                        <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="consultoria" stroke={G}    strokeWidth={2} dot={{ r: 4 }} name="Consultoria" />
                        <Line type="monotone" dataKey="avaliacao"   stroke={TEAL} strokeWidth={2} dot={{ r: 4 }} name="Avaliação" />
                      </LineChart>
                    </ResponsiveContainer>
                }
              </div>

              {/* Tabela produção por gestor */}
              <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #E2E8F0' }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: N, margin: '0 0 16px' }}>Produção por Gestor</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC' }}>
                        {['Gestor','Unidade','Status','Parceiros','Indicações','Atendidos','Conversão'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#475569', fontWeight: 600, borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {gestores.map((g, idx) => {
                        const uid = gestorUnidadeId(g)
                        const pCount = parceiros.filter(p => p.unidade_id === uid).length
                        const iCount = indicacoes.filter(i => i.unidade_id === uid).length
                        const aCount = indicacoes.filter(i => i.unidade_id === uid && i.status === 'atendido').length
                        const conv = iCount > 0 ? Math.round(aCount / iCount * 100) : 0
                        return (
                          <tr key={g.id} style={{ background: idx % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                            <td style={{ padding: '10px 14px', color: N, fontWeight: 500 }}>{g.nome}</td>
                            <td style={{ padding: '10px 14px', color: '#64748B' }}>{(g.unidades as any)?.nome ?? '—'}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ background: g.status === 'inativo' ? DANGER+'18' : G+'18', color: g.status === 'inativo' ? DANGER : G, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
                                {g.status === 'inativo' ? '⏸ Pausado' : '● Ativo'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', color: TEAL, fontWeight: 600 }}>{pCount}</td>
                            <td style={{ padding: '10px 14px', color: N }}>{iCount}</td>
                            <td style={{ padding: '10px 14px', color: G, fontWeight: 600 }}>{aCount}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ background: conv >= 50 ? G+'18' : WARN+'18', color: conv >= 50 ? G : WARN, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>{conv}%</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {gestores.length === 0 && <div style={{ textAlign: 'center', color: '#94A3B8', padding: 32, fontSize: 13 }}>Nenhum gestor cadastrado</div>}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ GESTORES ══════════════ */}
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
                      {['Nome','E-mail','Unidade','Parceiros','Indicações','Cadastro','Status','Ações'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600, borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {gestores
                      .filter(g => !buscaGestor || g.nome.toLowerCase().includes(buscaGestor.toLowerCase()) || g.email.toLowerCase().includes(buscaGestor.toLowerCase()))
                      .map((g, idx) => {
                        const uid = gestorUnidadeId(g)
                        const pCount = parceiros.filter(p => p.unidade_id === uid).length
                        const iCount = indicacoes.filter(i => i.unidade_id === uid).length
                        return (
                          <tr key={g.id} style={{ background: idx % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                            <td style={{ padding: '12px 16px', color: N, fontWeight: 500 }}>{g.nome}</td>
                            <td style={{ padding: '12px 16px', color: '#64748B' }}>{g.email}</td>
                            <td style={{ padding: '12px 16px', color: '#64748B' }}>{(g.unidades as any)?.nome ?? '—'}</td>
                            <td style={{ padding: '12px 16px', color: TEAL, fontWeight: 600 }}>{pCount}</td>
                            <td style={{ padding: '12px 16px', color: N }}>{iCount}</td>
                            <td style={{ padding: '12px 16px', color: '#64748B', whiteSpace: 'nowrap' }}>{new Date(g.created_at).toLocaleDateString('pt-BR')}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ background: g.status === 'inativo' ? DANGER+'15' : G+'15', color: g.status === 'inativo' ? DANGER : G, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
                                {g.status === 'inativo' ? '⏸ Pausado' : '● Ativo'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <button onClick={() => toggleGestorStatus(g)} style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: g.status === 'inativo' ? G+'18' : DANGER+'18', color: g.status === 'inativo' ? G : DANGER, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                                {g.status === 'inativo' ? '▶ Ativar' : '⏸ Pausar'}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
                {gestores.length === 0 && <div style={{ textAlign: 'center', color: '#94A3B8', padding: 40, fontSize: 13 }}>Nenhum gestor cadastrado</div>}
              </div>

              {showModalGestor && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                  <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 440, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: N, margin: '0 0 20px' }}>Novo Gestor</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[{label:'Nome *',key:'nome',ph:'Nome completo'},{label:'E-mail *',key:'email',ph:'email@exemplo.com'},{label:'Senha *',key:'senha',ph:'Senha de acesso'}].map(f => (
                        <div key={f.key}>
                          <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>{f.label}</label>
                          <input value={(novoGestor as any)[f.key]} onChange={e => setNovoGestor(p => ({ ...p, [f.key]: e.target.value }))} style={inputStyle()} placeholder={f.ph} />
                        </div>
                      ))}
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

          {/* ══════════════ PARCEIROS ══════════════ */}
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
                      {['Nome','E-mail','Especialidade','Unidade','Cadastro','Status'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600, borderBottom: '1px solid #E2E8F0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parceiros
                      .filter(p => !buscaParceiro || p.nome.toLowerCase().includes(buscaParceiro.toLowerCase()) || p.email.toLowerCase().includes(buscaParceiro.toLowerCase()))
                      .map((p, idx) => {
                        const uni = unidades.find(u => u.id === p.unidade_id)
                        return (
                          <tr key={p.id} style={{ background: idx % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                            <td style={{ padding: '12px 16px', color: N, fontWeight: 500 }}>{p.nome}</td>
                            <td style={{ padding: '12px 16px', color: '#64748B' }}>{p.email}</td>
                            <td style={{ padding: '12px 16px', color: '#64748B' }}>{p.especialidade}</td>
                            <td style={{ padding: '12px 16px', color: TEAL }}>{uni?.nome ?? '—'}</td>
                            <td style={{ padding: '12px 16px', color: '#64748B', whiteSpace: 'nowrap' }}>{new Date(p.data_cadastro).toLocaleDateString('pt-BR')}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ background: p.status === 'pendente' ? WARN+'18' : p.status === 'rejeitado' ? DANGER+'18' : G+'18', color: p.status === 'pendente' ? WARN : p.status === 'rejeitado' ? DANGER : G, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
                                {p.status === 'pendente' ? '⏳ Pendente' : p.status === 'rejeitado' ? '✕ Rejeitado' : '● Ativo'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
                {parceiros.length === 0 && <div style={{ textAlign: 'center', color: '#94A3B8', padding: 40, fontSize: 13 }}>Nenhum parceiro cadastrado</div>}
              </div>

              {showModalParceiro && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                  <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 460, boxShadow: '0 20px 60px rgba(0,0,0,.2)', maxHeight: '90vh', overflowY: 'auto' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: N, margin: '0 0 20px' }}>Novo Parceiro</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[{label:'Nome *',key:'nome',ph:'Nome completo'},{label:'E-mail *',key:'email',ph:'email@exemplo.com'},{label:'Senha *',key:'senha',ph:'Senha de acesso'},{label:'WhatsApp',key:'whatsapp',ph:'(00) 00000-0000'}].map(f => (
                        <div key={f.key}>
                          <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>{f.label}</label>
                          <input value={(novoParceiro as any)[f.key]} onChange={e => setNovoParceiro(p => ({ ...p, [f.key]: e.target.value }))} style={inputStyle()} placeholder={f.ph} />
                        </div>
                      ))}
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
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Vincular à Unidade</label>
                        <select value={novoParceiro.unidade_id} onChange={e => setNovoParceiro(p => ({ ...p, unidade_id: e.target.value }))} style={inputStyle()}>
                          <option value="">Sem unidade específica</option>
                          {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
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

          {/* ══════════════ SENHAS ══════════════ */}
          {tab === 'senha' && (
            <div style={{ maxWidth: 540 }}>
              <div style={{ background: '#fff', borderRadius: 14, padding: 28, border: '1px solid #E2E8F0' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: N, margin: '0 0 6px' }}>🔑 Recuperação / Reset de Senha</h3>
                <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px' }}>Busque o usuário pelo e-mail para ver ou redefinir a senha.</p>
                <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                  <input type="email" value={senhaEmail} placeholder="email@usuario.com" onChange={e => { setSenhaEmail(e.target.value); setSenhaResult(''); setSenhaFound(null) }} style={inputStyle()} />
                  <button onClick={buscarSenha} disabled={senhaLoading} style={btnStyle(TEAL, senhaLoading)}>{senhaLoading ? '...' : '🔍 Buscar'}</button>
                </div>
                {senhaResult && (
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 16, marginBottom: 12 }}>
                    <pre style={{ fontSize: 13, color: N, margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{senhaResult}</pre>
                  </div>
                )}
                {senhaFound && (
                  <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 16 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: N, margin: '0 0 8px' }}>Redefinir senha:</p>
                    <ResetSenhaForm onReset={resetarSenha} tipo={senhaFound.tipo} />
                  </div>
                )}
              </div>

              {/* Lista todos os gestores com senhas */}
              <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #E2E8F0', marginTop: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: N, margin: '0 0 14px' }}>📋 Credenciais dos Gestores</h3>
                {gestores.map(g => (
                  <div key={g.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr auto', gap: 8, padding: '8px 10px', background: '#F8FAFC', borderRadius: 7, marginBottom: 6, fontSize: 12, alignItems: 'center' }}>
                    <span style={{ color: N, fontWeight: 600 }}>{g.nome}</span>
                    <span style={{ color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.email}</span>
                    <span style={{ color: TEAL, fontFamily: 'monospace', fontWeight: 600 }}>{g.senha}</span>
                  </div>
                ))}
                {gestores.length === 0 && <p style={{ color: '#94A3B8', fontSize: 13 }}>Nenhum gestor</p>}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
