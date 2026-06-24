'use client' // v2
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
const ESPECIALIDADES = ['Médico','Enfermeiro','Fisioterapeuta','Nutricionista','Psicólogo','Terapeuta Ocupacional','Fonoaudiólogo','Dentista','Técnico de Enfermagem','Outro Profissional de Saúde']
const STATUS_IND = ['aguardando','agendado','avaliado','tratamento','finalizado','cancelado']
const STATUS_LABEL: Record<string,string> = { aguardando:'Aguardando contato', agendado:'Agendado', avaliado:'Avaliação realizada', tratamento:'Em tratamento', finalizado:'Finalizado', cancelado:'Cancelado' }
const STATUS_COLOR: Record<string,string> = { aguardando:WARN, agendado:TEAL, avaliado:G, tratamento:'#065F46', finalizado:'#6366F1', cancelado:DANGER }

type Gestor    = { id:string; nome:string; email:string; senha:string; status:string; created_at:string; unidade_id?:string; unidades?:{nome:string} }
type Parceiro  = { id:string; nome:string; email:string; especialidade:string; status:string; data_cadastro:string; unidade_id?:string; whatsapp?:string; senha?:string }
type Indicacao = { id:string; paciente_nome:string; paciente_telefone?:string; observacoes?:string; responsavel?:string; status:string; modelo:string; data_indicacao:string; data_avaliacao?:string; parceiro_id?:string; unidade_id?:string }
type Unidade   = { id:string; nome:string }

const inp = (w?:string): React.CSSProperties => ({ width:w||'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid #CBD5E1', background:'#F8FAFC', fontSize:13, color:N, outline:'none', boxSizing:'border-box' })
const btn = (color:string, disabled?:boolean): React.CSSProperties => ({ padding:'8px 16px', borderRadius:8, border:'none', background:disabled?'#CBD5E1':color, color:'#fff', fontWeight:600, fontSize:13, cursor:disabled?'not-allowed':'pointer', whiteSpace:'nowrap' })
const btnOutline = (color:string): React.CSSProperties => ({ padding:'5px 11px', borderRadius:7, border:`1.5px solid ${color}`, background:'transparent', color, fontWeight:600, fontSize:12, cursor:'pointer', whiteSpace:'nowrap' })

function KpiCard({ label, value, sub, color, icon }:{ label:string; value:string|number; sub:string; color:string; icon:string }) {
  return (
    <div style={{ background:'#fff', borderRadius:14, padding:'20px 22px', border:'1px solid #E2E8F0', boxShadow:'0 2px 8px rgba(0,0,0,.05)', display:'flex', alignItems:'center', gap:16, flex:1, minWidth:160 }}>
      <div style={{ width:48, height:48, borderRadius:12, background:color+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{icon}</div>
      <div>
        <div style={{ fontSize:26, fontWeight:700, color:N, lineHeight:1 }}>{value}</div>
        <div style={{ fontSize:12, fontWeight:600, color:'#64748B', marginTop:3 }}>{label}</div>
        <div style={{ fontSize:11, color, marginTop:2 }}>{sub}</div>
      </div>
    </div>
  )
}

function ConfirmModal({ msg, onConfirm, onCancel }:{ msg:string; onConfirm:()=>void; onCancel:()=>void }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000 }}>
      <div style={{ background:'#fff', borderRadius:14, padding:28, width:380, boxShadow:'0 20px 60px rgba(0,0,0,.25)' }}>
        <div style={{ fontSize:32, textAlign:'center', marginBottom:12 }}>⚠️</div>
        <p style={{ fontSize:14, color:N, textAlign:'center', margin:'0 0 24px', lineHeight:1.5 }}>{msg}</p>
        <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
          <button onClick={onCancel} style={{ padding:'9px 24px', borderRadius:8, border:'1px solid #CBD5E1', background:'#fff', color:'#64748B', fontWeight:600, fontSize:13, cursor:'pointer' }}>Cancelar</button>
          <button onClick={onConfirm} style={{ padding:'9px 24px', borderRadius:8, border:'none', background:DANGER, color:'#fff', fontWeight:600, fontSize:13, cursor:'pointer' }}>Confirmar Exclusão</button>
        </div>
      </div>
    </div>
  )
}

export default function AdminClient() {
  const router = useRouter()
  const [admin, setAdmin] = useState<{nome:string;email:string}|null>(null)
  const [tab, setTab] = useState<'dashboard'|'gestores'|'parceiros'|'pacientes'|'senha'>('dashboard')

  const [gestores,    setGestores]    = useState<Gestor[]>([])
  const [parceiros,   setParceiros]   = useState<Parceiro[]>([])
  const [indicacoes,  setIndicacoes]  = useState<Indicacao[]>([])
  const [unidades,    setUnidades]    = useState<Unidade[]>([])

  // Filtros dashboard
  const [filtroDataIni, setFiltroDataIni] = useState(() => { const d=new Date(); d.setMonth(d.getMonth()-5); return d.toISOString().split('T')[0] })
  const [filtroDataFim, setFiltroDataFim] = useState(() => new Date().toISOString().split('T')[0])
  const [filtroGestor,  setFiltroGestor]  = useState('todos')

  // Filtros pacientes
  const [pacDataIni,  setPacDataIni]  = useState(() => { const d=new Date(); d.setMonth(d.getMonth()-5); return d.toISOString().split('T')[0] })
  const [pacDataFim,  setPacDataFim]  = useState(() => new Date().toISOString().split('T')[0])
  const [pacGestor,   setPacGestor]   = useState('todos')
  const [pacParceiro, setPacParceiro] = useState('todos')
  const [pacStatus,   setPacStatus]   = useState('todos')
  const [pacBusca,    setPacBusca]    = useState('')

  // Modal gestor
  const [modalGestor,  setModalGestor]  = useState<'criar'|'editar'|null>(null)
  const [formGestor,   setFormGestor]   = useState({ id:'', nome:'', email:'', senha:'', unidade_id:'' })
  const [savingGestor, setSavingGestor] = useState(false)
  const [erroGestor,   setErroGestor]   = useState('')

  // Modal parceiro
  const [modalParceiro,  setModalParceiro]  = useState<'criar'|'editar'|null>(null)
  const [formParceiro,   setFormParceiro]   = useState({ id:'', nome:'', email:'', senha:'', especialidade:'', whatsapp:'', unidade_id:'', status:'ativo' })
  const [savingParceiro, setSavingParceiro] = useState(false)
  const [erroParceiro,   setErroParceiro]   = useState('')

  // Modal indicação
  const [modalInd,  setModalInd]  = useState<'criar'|'editar'|null>(null)
  const [formInd,   setFormInd]   = useState({ id:'', paciente_nome:'', paciente_telefone:'', observacoes:'', responsavel:'', status:'aguardando_contato', modelo:'consultoria', data_indicacao:'', parceiro_id:'', unidade_id:'' })
  const [savingInd, setSavingInd] = useState(false)
  const [erroInd,   setErroInd]   = useState('')

  // Confirmação exclusão
  const [confirmDelete, setConfirmDelete] = useState<{tipo:'gestor'|'parceiro'|'indicacao'; id:string; nome:string}|null>(null)
  const [erroDelete,    setErroDelete]    = useState('')

  // Senha
  const [senhaEmail,  setSenhaEmail]  = useState('')
  const [senhaResult, setSenhaResult] = useState('')
  const [senhaLoading,setSenhaLoading]= useState(false)
  const [senhaFound,  setSenhaFound]  = useState<{tipo:'parceiro'|'gestor'}|null>(null)
  const [novaSenha,   setNovaSenha]   = useState('')

  // Busca gestores/parceiros
  const [buscaGestor,   setBuscaGestor]   = useState('')
  const [buscaParceiro, setBuscaParceiro] = useState('')

  const loadAll = useCallback(async () => {
    const [{ data:gs },{ data:ps },{ data:inds },{ data:uns }] = await Promise.all([
      supabase.from('gestores').select('*, unidades(nome)').order('created_at',{ascending:false}),
      supabase.from('parceiros').select('*').order('data_cadastro',{ascending:false}),
      supabase.from('indicacoes').select('*').order('data_indicacao',{ascending:false}),
      supabase.from('unidades').select('id, nome'),
    ])
    if (gs)   setGestores(gs as Gestor[])
    if (ps)   setParceiros(ps as Parceiro[])
    if (inds) setIndicacoes(inds as Indicacao[])
    if (uns)  setUnidades(uns)
  }, [])

  useEffect(() => {
    const s = localStorage.getItem('admin_session')
    if (!s) { router.push('/login'); return }
    setAdmin(JSON.parse(s))
    loadAll()
  }, [loadAll, router])

  // ─── HELPERS ──────────────────────────────────────────────────────────────
  const gestorUid = (g:Gestor) => g.unidade_id ?? null

  const indsFiltDash = indicacoes.filter(i => {
    const d=(i.data_indicacao??'').split('T')[0]
    if (d<filtroDataIni||d>filtroDataFim) return false
    if (filtroGestor==='todos') return true
    const g=gestores.find(x=>x.id===filtroGestor)
    return g ? i.unidade_id===gestorUid(g) : true
  })

  // Indicações filtradas para aba Pacientes
  const indsFiltPac = indicacoes.filter(i => {
    const d=(i.data_indicacao??'').split('T')[0]
    if (d<pacDataIni||d>pacDataFim) return false
    if (pacStatus!=='todos' && i.status!==pacStatus) return false
    if (pacParceiro!=='todos' && i.parceiro_id!==pacParceiro) return false
    if (pacGestor!=='todos') {
      const g=gestores.find(x=>x.id===pacGestor)
      if (g && i.unidade_id!==gestorUid(g)) return false
    }
    if (pacBusca) {
      const q=pacBusca.toLowerCase()
      const pNome=(parceiros.find(p=>p.id===i.parceiro_id)?.nome??'').toLowerCase()
      if (!i.paciente_nome?.toLowerCase().includes(q) && !pNome.includes(q) && !(i.responsavel??'').toLowerCase().includes(q)) return false
    }
    return true
  })

  // Parceiros filtrados pelo gestor selecionado no painel pacientes
  const parceirosDoPacGestor = pacGestor==='todos' ? parceiros : parceiros.filter(p => {
    const g=gestores.find(x=>x.id===pacGestor)
    return g ? p.unidade_id===gestorUid(g) : true
  })

  // ─── GRÁFICOS ─────────────────────────────────────────────────────────────
  const indsPorMes      = (() => { const m:Record<string,number>={};indsFiltDash.forEach(i=>{const d=new Date(i.data_indicacao);const k=`${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;m[k]=(m[k]||0)+1});return Object.entries(m).map(([mes,total])=>({mes,total})) })()
  const indsPorGestor   = gestores.map(g=>({nome:g.nome,total:indicacoes.filter(i=>i.unidade_id===gestorUid(g)).length})).filter(x=>x.total>0).sort((a,b)=>b.total-a.total)
  const parcsPorGestor  = gestores.map(g=>({nome:g.nome,total:parceiros.filter(p=>p.unidade_id===gestorUid(g)).length})).filter(x=>x.total>0).sort((a,b)=>b.total-a.total)
  const tiposPorMes     = (() => { const m:Record<string,{mes:string;consultoria:number;avaliacao:number}>={};indsFiltDash.forEach(i=>{const d=new Date(i.data_indicacao);const k=`${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;if(!m[k])m[k]={mes:k,consultoria:0,avaliacao:0};if((i.modelo??'').toLowerCase().includes('consult'))m[k].consultoria++;else m[k].avaliacao++});return Object.values(m) })()
  const statusData      = [
    {name:'Agendado',   value:indsFiltDash.filter(i=>i.status==='agendado').length},
    {name:'Atendido',   value:new Set(indsFiltDash.filter(i=>['avaliado','tratamento','finalizado'].includes(i.status)).map(i=>i.paciente_nome.toLowerCase().trim())).size},
    {name:'Pendente',   value:indsFiltDash.filter(i=>i.status==='pendente').length},
    {name:'Cancelado',  value:indsFiltDash.filter(i=>i.status==='cancelado').length},
    {name:'Aguardando', value:indsFiltDash.filter(i=>i.status?.startsWith('aguard')).length},
  ].filter(x=>x.value>0)

  const gestAtivos   = gestores.filter(g=>g.status!=='inativo').length
  const gestInativos = gestores.filter(g=>g.status==='inativo').length

  // ─── AÇÕES GESTOR ─────────────────────────────────────────────────────────
  function abrirCriarGestor() { setFormGestor({id:'',nome:'',email:'',senha:'',unidade_id:''}); setErroGestor(''); setModalGestor('criar') }
  function abrirEditarGestor(g:Gestor) { setFormGestor({id:g.id,nome:g.nome,email:g.email,senha:g.senha,unidade_id:g.unidade_id??''}); setErroGestor(''); setModalGestor('editar') }
  async function salvarGestor() {
    setErroGestor('')
    if (!formGestor.nome||!formGestor.email||!formGestor.senha){setErroGestor('Preencha todos os campos obrigatórios.');return}
    setSavingGestor(true)
    const payload={nome:formGestor.nome,email:formGestor.email.toLowerCase().trim(),senha:formGestor.senha,unidade_id:formGestor.unidade_id||null}
    const {error}=modalGestor==='criar'
      ? await supabase.from('gestores').insert({...payload,status:'ativo'})
      : await supabase.from('gestores').update(payload).eq('id',formGestor.id)
    setSavingGestor(false)
    if(error){setErroGestor('Erro: '+error.message);return}
    setModalGestor(null); loadAll()
  }
  async function toggleGestorStatus(g:Gestor) {
    const novo=g.status==='inativo'?'ativo':'inativo'
    await supabase.from('gestores').update({status:novo}).eq('id',g.id)
    setGestores(prev=>prev.map(x=>x.id===g.id?{...x,status:novo}:x))
  }

  // ─── AÇÕES PARCEIRO ───────────────────────────────────────────────────────
  function abrirCriarParceiro() { setFormParceiro({id:'',nome:'',email:'',senha:'',especialidade:'',whatsapp:'',unidade_id:'',status:'ativo'}); setErroParceiro(''); setModalParceiro('criar') }
  function abrirEditarParceiro(p:Parceiro) { setFormParceiro({id:p.id,nome:p.nome,email:p.email,senha:p.senha??'',especialidade:p.especialidade,whatsapp:p.whatsapp??'',unidade_id:p.unidade_id??'',status:p.status}); setErroParceiro(''); setModalParceiro('editar') }
  async function salvarParceiro() {
    setErroParceiro('')
    if (!formParceiro.nome||!formParceiro.email||!formParceiro.senha||!formParceiro.especialidade){setErroParceiro('Preencha todos os campos obrigatórios.');return}
    setSavingParceiro(true)
    const payload={nome:formParceiro.nome,email:formParceiro.email.toLowerCase().trim(),senha:formParceiro.senha,especialidade:formParceiro.especialidade,whatsapp:formParceiro.whatsapp||null,unidade_id:formParceiro.unidade_id||null,status:formParceiro.status}
    const {error}=modalParceiro==='criar'
      ? await supabase.from('parceiros').insert({...payload,tipo:'profissional'})
      : await supabase.from('parceiros').update(payload).eq('id',formParceiro.id)
    setSavingParceiro(false)
    if(error){setErroParceiro('Erro: '+error.message);return}
    setModalParceiro(null); loadAll()
  }

  // ─── AÇÕES INDICAÇÃO ──────────────────────────────────────────────────────
  function abrirCriarInd() {
    const hoje=new Date().toISOString().split('T')[0]
    setFormInd({id:'',paciente_nome:'',paciente_telefone:'',observacoes:'',responsavel:'',status:'aguardando_contato',modelo:'consultoria',data_indicacao:hoje,parceiro_id:'',unidade_id:''})
    setErroInd(''); setModalInd('criar')
  }
  function abrirEditarInd(i:Indicacao) {
    setFormInd({id:i.id,paciente_nome:i.paciente_nome,paciente_telefone:i.paciente_telefone??'',observacoes:i.observacoes??'',responsavel:i.responsavel??'',status:i.status,modelo:i.modelo??'consultoria',data_indicacao:(i.data_indicacao??'').split('T')[0],parceiro_id:i.parceiro_id??'',unidade_id:i.unidade_id??''})
    setErroInd(''); setModalInd('editar')
  }
  async function salvarInd() {
    setErroInd('')
    if (!formInd.paciente_nome){setErroInd('Nome do paciente é obrigatório.');return}
    setSavingInd(true)
    // Auto-preencher unidade_id a partir do parceiro selecionado
    let uid=formInd.unidade_id
    if (formInd.parceiro_id&&!uid) {
      const p=parceiros.find(x=>x.id===formInd.parceiro_id)
      if (p?.unidade_id) uid=p.unidade_id
    }
    const payload={
      paciente_nome:formInd.paciente_nome,
      paciente_telefone:formInd.paciente_telefone||null,
      observacoes:formInd.observacoes||null,
      responsavel:formInd.responsavel||null,
      status:formInd.status,
      modelo:formInd.modelo,
      data_indicacao:formInd.data_indicacao||new Date().toISOString(),
      parceiro_id:formInd.parceiro_id||null,
      unidade_id:uid||null,
    }
    const {error}=modalInd==='criar'
      ? await supabase.from('indicacoes').insert(payload)
      : await supabase.from('indicacoes').update(payload).eq('id',formInd.id)
    setSavingInd(false)
    if(error){setErroInd('Erro: '+error.message);return}
    setModalInd(null); loadAll()
  }

  // ─── EXCLUSÃO ─────────────────────────────────────────────────────────────
  async function executarDelete() {
    if (!confirmDelete) return
    setErroDelete('')
    if (confirmDelete.tipo==='indicacao') {
      const {error}=await supabase.from('indicacoes').delete().eq('id',confirmDelete.id)
      if (error){setErroDelete('Erro: '+error.message);setConfirmDelete(null);return}
    } else if (confirmDelete.tipo==='gestor') {
      const {error}=await supabase.from('gestores').delete().eq('id',confirmDelete.id)
      if (error){setErroDelete('Erro: '+error.message);setConfirmDelete(null);return}
    } else {
      const {error}=await supabase.from('parceiros').delete().eq('id',confirmDelete.id)
      if (error){setErroDelete('Erro: '+error.message);setConfirmDelete(null);return}
    }
    setConfirmDelete(null); loadAll()
  }

  // ─── SENHA ────────────────────────────────────────────────────────────────
  async function buscarSenha() {
    if (!senhaEmail) return
    setSenhaLoading(true); setSenhaResult(''); setSenhaFound(null); setNovaSenha('')
    const em=senhaEmail.toLowerCase().trim()
    const {data:parc}=await supabase.from('parceiros').select('nome,senha').eq('email',em).single()
    if (parc){setSenhaResult(`✅ Parceiro: ${parc.nome}\nSenha atual: ${parc.senha}`);setSenhaFound({tipo:'parceiro'});setSenhaLoading(false);return}
    const {data:gest}=await supabase.from('gestores').select('nome,senha').eq('email',em).single()
    if (gest){setSenhaResult(`✅ Gestor: ${gest.nome}\nSenha atual: ${gest.senha}`);setSenhaFound({tipo:'gestor'});setSenhaLoading(false);return}
    setSenhaResult('❌ Nenhum usuário encontrado.'); setSenhaLoading(false)
  }
  async function resetarSenha() {
    if (!senhaEmail||!novaSenha||!senhaFound) return
    await supabase.from(senhaFound.tipo==='parceiro'?'parceiros':'gestores').update({senha:novaSenha}).eq('email',senhaEmail.toLowerCase().trim())
    setSenhaResult(p=>p+'\n\n✅ Senha atualizada!'); setSenhaFound(null); setNovaSenha('')
  }

  if (!admin) return null

  const SIDEBAR=[
    {key:'dashboard' as const, icon:'📊', label:'Dashboard'},
    {key:'gestores'  as const, icon:'👔', label:'Gestores'},
    {key:'parceiros' as const, icon:'🤝', label:'Parceiros'},
    {key:'pacientes' as const, icon:'🏥', label:'Pacientes'},
    {key:'senha'     as const, icon:'🔑', label:'Senhas'},
  ]

  // ─── MODAIS ───────────────────────────────────────────────────────────────
  const fieldLabel = (txt:string) => <label style={{fontSize:12,fontWeight:600,color:'#475569',display:'block',marginBottom:4}}>{txt}</label>

  const ModalGestor = modalGestor ? (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
      <div style={{background:'#fff',borderRadius:16,padding:28,width:440,boxShadow:'0 20px 60px rgba(0,0,0,.2)'}}>
        <h3 style={{fontSize:16,fontWeight:700,color:N,margin:'0 0 20px'}}>{modalGestor==='criar'?'+ Novo Gestor':'✏️ Editar Gestor'}</h3>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {([{l:'Nome *',k:'nome',p:'Nome completo'},{l:'E-mail *',k:'email',p:'email@ex.com'},{l:'Senha *',k:'senha',p:'Senha'}] as {l:string;k:string;p:string}[]).map(f=>(
            <div key={f.k}>{fieldLabel(f.l)}<input value={(formGestor as any)[f.k]} onChange={e=>setFormGestor(v=>({...v,[f.k]:e.target.value}))} style={inp()} placeholder={f.p} /></div>
          ))}
          <div>{fieldLabel('Unidade')}<select value={formGestor.unidade_id} onChange={e=>setFormGestor(v=>({...v,unidade_id:e.target.value}))} style={inp()}><option value="">Sem unidade</option>{unidades.map(u=><option key={u.id} value={u.id}>{u.nome}</option>)}</select></div>
          {erroGestor&&<p style={{color:DANGER,fontSize:12,margin:0}}>{erroGestor}</p>}
          <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:8}}>
            <button onClick={()=>setModalGestor(null)} style={{padding:'9px 18px',borderRadius:8,border:'1px solid #CBD5E1',background:'#fff',color:'#64748B',fontWeight:600,fontSize:13,cursor:'pointer'}}>Cancelar</button>
            <button onClick={salvarGestor} disabled={savingGestor} style={btn(G,savingGestor)}>{savingGestor?'Salvando...':modalGestor==='criar'?'Criar Gestor':'Salvar'}</button>
          </div>
        </div>
      </div>
    </div>
  ) : null

  const ModalParceiro = modalParceiro ? (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
      <div style={{background:'#fff',borderRadius:16,padding:28,width:460,boxShadow:'0 20px 60px rgba(0,0,0,.2)',maxHeight:'90vh',overflowY:'auto'}}>
        <h3 style={{fontSize:16,fontWeight:700,color:N,margin:'0 0 20px'}}>{modalParceiro==='criar'?'+ Novo Parceiro':'✏️ Editar Parceiro'}</h3>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {([{l:'Nome *',k:'nome',p:'Nome completo'},{l:'E-mail *',k:'email',p:'email@ex.com'},{l:'Senha *',k:'senha',p:'Senha'},{l:'WhatsApp',k:'whatsapp',p:'(00) 00000-0000'}] as {l:string;k:string;p:string}[]).map(f=>(
            <div key={f.k}>{fieldLabel(f.l)}<input value={(formParceiro as any)[f.k]} onChange={e=>setFormParceiro(v=>({...v,[f.k]:e.target.value}))} style={inp()} placeholder={f.p} /></div>
          ))}
          <div>{fieldLabel('Especialidade *')}<select value={formParceiro.especialidade} onChange={e=>setFormParceiro(v=>({...v,especialidade:e.target.value}))} style={inp()}><option value="">Selecionar</option>{ESPECIALIDADES.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
          <div>{fieldLabel('Vincular à Unidade')}<select value={formParceiro.unidade_id} onChange={e=>setFormParceiro(v=>({...v,unidade_id:e.target.value}))} style={inp()}><option value="">Sem unidade</option>{unidades.map(u=><option key={u.id} value={u.id}>{u.nome}</option>)}</select></div>
          {modalParceiro==='editar'&&<div>{fieldLabel('Status')}<select value={formParceiro.status} onChange={e=>setFormParceiro(v=>({...v,status:e.target.value}))} style={inp()}><option value="ativo">Ativo</option><option value="pendente">Pendente</option><option value="rejeitado">Rejeitado</option></select></div>}
          {erroParceiro&&<p style={{color:DANGER,fontSize:12,margin:0}}>{erroParceiro}</p>}
          <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:8}}>
            <button onClick={()=>setModalParceiro(null)} style={{padding:'9px 18px',borderRadius:8,border:'1px solid #CBD5E1',background:'#fff',color:'#64748B',fontWeight:600,fontSize:13,cursor:'pointer'}}>Cancelar</button>
            <button onClick={salvarParceiro} disabled={savingParceiro} style={btn(G,savingParceiro)}>{savingParceiro?'Salvando...':modalParceiro==='criar'?'Criar':'Salvar'}</button>
          </div>
        </div>
      </div>
    </div>
  ) : null

  const ModalInd = modalInd ? (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
      <div style={{background:'#fff',borderRadius:16,padding:28,width:500,boxShadow:'0 20px 60px rgba(0,0,0,.2)',maxHeight:'92vh',overflowY:'auto'}}>
        <h3 style={{fontSize:16,fontWeight:700,color:N,margin:'0 0 20px'}}>{modalInd==='criar'?'🏥 Nova Indicação':'✏️ Editar Indicação'}</h3>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div style={{gridColumn:'1/-1'}}>{fieldLabel('Paciente *')}<input value={formInd.paciente_nome} onChange={e=>setFormInd(v=>({...v,paciente_nome:e.target.value}))} style={inp()} placeholder="Nome completo do paciente" /></div>
            <div>{fieldLabel('Telefone')}<input value={formInd.paciente_telefone} onChange={e=>setFormInd(v=>({...v,paciente_telefone:e.target.value}))} style={inp()} placeholder="(00) 00000-0000" /></div>
            <div>{fieldLabel('Responsável')}<input value={formInd.responsavel} onChange={e=>setFormInd(v=>({...v,responsavel:e.target.value}))} style={inp()} placeholder="Nome do responsável" /></div>
            <div>{fieldLabel('Benefício')}<select value={formInd.modelo} onChange={e=>setFormInd(v=>({...v,modelo:e.target.value}))} style={inp()}><option value="consultoria">🏠 Consultoria Domiciliar</option><option value="avaliacao">🤝 Avaliação em Parceria</option></select></div>
            <div>{fieldLabel('Status')}<select value={formInd.status} onChange={e=>setFormInd(v=>({...v,status:e.target.value}))} style={inp()}>{STATUS_IND.map(s=><option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></div>
            <div>{fieldLabel('Data da Indicação')}<input type="date" value={formInd.data_indicacao} onChange={e=>setFormInd(v=>({...v,data_indicacao:e.target.value}))} style={inp()} /></div>
            <div>{fieldLabel('Parceiro')}<select value={formInd.parceiro_id} onChange={e=>{
              const pid=e.target.value
              const p=parceiros.find(x=>x.id===pid)
              setFormInd(v=>({...v,parceiro_id:pid,unidade_id:p?.unidade_id??v.unidade_id}))
            }} style={inp()}><option value="">Sem parceiro</option>{parceiros.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
            <div>{fieldLabel('Unidade')}<select value={formInd.unidade_id} onChange={e=>setFormInd(v=>({...v,unidade_id:e.target.value}))} style={inp()}><option value="">Selecionar</option>{unidades.map(u=><option key={u.id} value={u.id}>{u.nome}</option>)}</select></div>
            <div style={{gridColumn:'1/-1'}}>{fieldLabel('Observações')}<textarea value={formInd.observacoes} onChange={e=>setFormInd(v=>({...v,observacoes:e.target.value}))} style={{...inp(),minHeight:72,resize:'vertical'}} placeholder="Observações sobre o caso" /></div>
          </div>
          {erroInd&&<p style={{color:DANGER,fontSize:12,margin:0}}>{erroInd}</p>}
          <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:8}}>
            <button onClick={()=>setModalInd(null)} style={{padding:'9px 18px',borderRadius:8,border:'1px solid #CBD5E1',background:'#fff',color:'#64748B',fontWeight:600,fontSize:13,cursor:'pointer'}}>Cancelar</button>
            <button onClick={salvarInd} disabled={savingInd} style={btn(G,savingInd)}>{savingInd?'Salvando...':modalInd==='criar'?'Criar Indicação':'Salvar Alterações'}</button>
          </div>
        </div>
      </div>
    </div>
  ) : null

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div style={{display:'flex',minHeight:'100vh',fontFamily:'Inter,system-ui,sans-serif'}}>

      {confirmDelete&&<ConfirmModal msg={`Excluir ${confirmDelete.tipo==='indicacao'?'a indicação de':'o '+(confirmDelete.tipo)} "${confirmDelete.nome}"? Esta ação não pode ser desfeita.`} onConfirm={executarDelete} onCancel={()=>{setConfirmDelete(null);setErroDelete('')}} />}
      {erroDelete&&<div style={{position:'fixed',bottom:24,right:24,background:DANGER,color:'#fff',padding:'12px 20px',borderRadius:10,fontSize:13,fontWeight:600,zIndex:3000}}>{erroDelete}<button onClick={()=>setErroDelete('')} style={{background:'none',border:'none',color:'#fff',cursor:'pointer',marginLeft:8}}>✕</button></div>}

      {/* SIDEBAR */}
      <aside style={{width:220,background:'#1E293B',display:'flex',flexDirection:'column',borderRight:'1px solid #334155',flexShrink:0}}>
        <div style={{padding:'24px 20px 16px',borderBottom:'1px solid #334155'}}>
          <img src="/logo-mdc.png" alt="MDC" style={{height:40,display:'block',marginBottom:12}} />
          <div style={{fontSize:10,color:'#64748B',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase'}}>Super Admin</div>
          <div style={{fontSize:12,color:'#94A3B8',marginTop:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{admin.email}</div>
        </div>
        <nav style={{flex:1,padding:'12px 0'}}>
          {SIDEBAR.map(item=>(
            <button key={item.key} onClick={()=>setTab(item.key)} style={{display:'flex',alignItems:'center',gap:12,width:'100%',padding:'11px 20px',border:'none',background:tab===item.key?G+'22':'transparent',borderLeft:tab===item.key?`3px solid ${G}`:'3px solid transparent',color:tab===item.key?G:'#94A3B8',fontSize:14,fontWeight:tab===item.key?600:400,cursor:'pointer',textAlign:'left'}}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div style={{padding:'16px 20px',borderTop:'1px solid #334155'}}>
          <button onClick={()=>{localStorage.removeItem('admin_session');router.push('/login')}} style={{width:'100%',padding:'9px',borderRadius:8,border:'1px solid #334155',background:'transparent',color:'#94A3B8',fontSize:13,cursor:'pointer'}}>← Sair</button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{flex:1,overflowY:'auto',background:'#F1F5F9'}}>
        <div style={{background:'#fff',borderBottom:'1px solid #E2E8F0',padding:'16px 28px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <h1 style={{fontSize:20,fontWeight:700,color:N,margin:0}}>
              {tab==='dashboard'&&'📊 Dashboard Geral'}{tab==='gestores'&&'👔 Gestores'}{tab==='parceiros'&&'🤝 Parceiros'}{tab==='pacientes'&&'🏥 Pacientes / Indicações'}{tab==='senha'&&'🔑 Recuperação de Senha'}
            </h1>
            <p style={{fontSize:12,color:'#64748B',margin:'2px 0 0'}}>Meu Dentista em Casa — Painel Administrativo</p>
          </div>
          <div style={{display:'flex',gap:8}}>
            <span style={{background:G+'18',color:G,borderRadius:20,padding:'4px 12px',fontSize:12,fontWeight:600}}>{gestAtivos} gestor{gestAtivos!==1?'es':''} ativo{gestAtivos!==1?'s':''}</span>
            {gestInativos>0&&<span style={{background:DANGER+'18',color:DANGER,borderRadius:20,padding:'4px 12px',fontSize:12,fontWeight:600}}>{gestInativos} pausado{gestInativos!==1?'s':''}</span>}
          </div>
        </div>

        <div style={{padding:'24px 28px'}}>

          {/* ══════ DASHBOARD ══════ */}
          {tab==='dashboard'&&(
            <div>
              <div style={{display:'flex',gap:12,alignItems:'flex-end',flexWrap:'wrap',marginBottom:24,background:'#fff',padding:'16px 20px',borderRadius:12,border:'1px solid #E2E8F0'}}>
                <div><label style={{fontSize:11,fontWeight:600,color:'#64748B',display:'block',marginBottom:4}}>De</label><input type="date" value={filtroDataIni} onChange={e=>setFiltroDataIni(e.target.value)} style={inp('140px')} /></div>
                <div><label style={{fontSize:11,fontWeight:600,color:'#64748B',display:'block',marginBottom:4}}>Até</label><input type="date" value={filtroDataFim} onChange={e=>setFiltroDataFim(e.target.value)} style={inp('140px')} /></div>
                <div><label style={{fontSize:11,fontWeight:600,color:'#64748B',display:'block',marginBottom:4}}>Gestor</label><select value={filtroGestor} onChange={e=>setFiltroGestor(e.target.value)} style={inp('200px')}><option value="todos">Todos</option>{gestores.map(g=><option key={g.id} value={g.id}>{g.nome}</option>)}</select></div>
                <button onClick={loadAll} style={btn(TEAL)}>↻ Atualizar</button>
              </div>
              <div style={{display:'flex',gap:16,flexWrap:'wrap',marginBottom:24}}>
                <KpiCard label="Total de Gestores"    value={gestores.length}          sub={`${gestAtivos} ativos • ${gestInativos} pausados`} color={N}    icon="👔"/>
                <KpiCard label="Total de Parceiros"   value={parceiros.length}         sub={`${parceiros.filter(p=>p.status==='ativo').length} ativos`}   color={TEAL} icon="🤝"/>
                <KpiCard label="Indicações (período)" value={indsFiltDash.length}      sub={`de ${indicacoes.length} no total`} color={G} icon="📋"/>
                <KpiCard label="Atendidos"             value={indsFiltDash.filter(i=>i.status==='avaliado'||i.status==='tratamento'||i.status==='finalizado').length} sub={`${Math.round(indsFiltDash.length>0?indsFiltDash.filter(i=>i.status==='avaliado'||i.status==='tratamento'||i.status==='finalizado').length/indsFiltDash.length*100:0)}% conversão`} color={CYAN} icon="✅"/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
                <div style={{background:'#fff',borderRadius:14,padding:20,border:'1px solid #E2E8F0'}}><h3 style={{fontSize:14,fontWeight:600,color:N,margin:'0 0 16px'}}>Indicações por Mês</h3>{indsPorMes.length===0?<div style={{textAlign:'center',color:'#94A3B8',padding:'40px 0',fontSize:13}}>Sem dados</div>:<ResponsiveContainer width="100%" height={220}><BarChart data={indsPorMes}><XAxis dataKey="mes" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}} allowDecimals={false}/><Tooltip/><Bar dataKey="total" fill={G} radius={[4,4,0,0]} name="Indicações"/></BarChart></ResponsiveContainer>}</div>
                <div style={{background:'#fff',borderRadius:14,padding:20,border:'1px solid #E2E8F0'}}><h3 style={{fontSize:14,fontWeight:600,color:N,margin:'0 0 16px'}}>Status das Indicações</h3>{statusData.length===0?<div style={{textAlign:'center',color:'#94A3B8',padding:'40px 0',fontSize:13}}>Sem dados</div>:<ResponsiveContainer width="100%" height={220}><PieChart><Pie data={statusData} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({name,percent})=>`${name} ${((percent??0)*100).toFixed(0)}%`} labelLine={false}>{statusData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Legend/></PieChart></ResponsiveContainer>}</div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
                <div style={{background:'#fff',borderRadius:14,padding:20,border:'1px solid #E2E8F0'}}><h3 style={{fontSize:14,fontWeight:600,color:N,margin:'0 0 16px'}}>Indicações por Gestor</h3>{indsPorGestor.length===0?<div style={{textAlign:'center',color:'#94A3B8',padding:'40px 0',fontSize:13}}>Sem dados</div>:<ResponsiveContainer width="100%" height={220}><BarChart data={indsPorGestor} layout="vertical"><XAxis type="number" tick={{fontSize:11}} allowDecimals={false}/><YAxis dataKey="nome" type="category" width={110} tick={{fontSize:11}}/><Tooltip/><Bar dataKey="total" fill={TEAL} radius={[0,4,4,0]} name="Indicações"/></BarChart></ResponsiveContainer>}</div>
                <div style={{background:'#fff',borderRadius:14,padding:20,border:'1px solid #E2E8F0'}}><h3 style={{fontSize:14,fontWeight:600,color:N,margin:'0 0 16px'}}>Parceiros por Gestor</h3>{parcsPorGestor.length===0?<div style={{textAlign:'center',color:'#94A3B8',padding:'40px 0',fontSize:13}}>Sem dados</div>:<ResponsiveContainer width="100%" height={220}><BarChart data={parcsPorGestor} layout="vertical"><XAxis type="number" tick={{fontSize:11}} allowDecimals={false}/><YAxis dataKey="nome" type="category" width={110} tick={{fontSize:11}}/><Tooltip/><Bar dataKey="total" fill={CYAN} radius={[0,4,4,0]} name="Parceiros"/></BarChart></ResponsiveContainer>}</div>
              </div>
              <div style={{background:'#fff',borderRadius:14,padding:20,border:'1px solid #E2E8F0',marginBottom:20}}><h3 style={{fontSize:14,fontWeight:600,color:N,margin:'0 0 16px'}}>Consultoria vs Avaliação por Mês</h3>{tiposPorMes.length===0?<div style={{textAlign:'center',color:'#94A3B8',padding:'40px 0',fontSize:13}}>Sem dados</div>:<ResponsiveContainer width="100%" height={220}><LineChart data={tiposPorMes}><XAxis dataKey="mes" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}} allowDecimals={false}/><Tooltip/><Legend/><Line type="monotone" dataKey="consultoria" stroke={G} strokeWidth={2} dot={{r:4}} name="Consultoria"/><Line type="monotone" dataKey="avaliacao" stroke={TEAL} strokeWidth={2} dot={{r:4}} name="Avaliação"/></LineChart></ResponsiveContainer>}</div>
              <div style={{background:'#fff',borderRadius:14,padding:20,border:'1px solid #E2E8F0'}}>
                <h3 style={{fontSize:14,fontWeight:600,color:N,margin:'0 0 16px'}}>Produção por Gestor</h3>
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                    <thead><tr style={{background:'#F8FAFC'}}>{['Gestor','Unidade','Status','Parceiros','Indicações','Atendidos','Conversão'].map(h=><th key={h} style={{padding:'10px 14px',textAlign:'left',color:'#475569',fontWeight:600,borderBottom:'1px solid #E2E8F0',whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
                    <tbody>{gestores.map((g,idx)=>{const uid=gestorUid(g);const pC=parceiros.filter(p=>p.unidade_id===uid).length;const iC=indicacoes.filter(i=>i.unidade_id===uid).length;const aC=indicacoes.filter(i=>i.unidade_id===uid&&(i.status==='avaliado'||i.status==='tratamento'||i.status==='finalizado')).length;const conv=iC>0?Math.round(aC/iC*100):0;return(<tr key={g.id} style={{background:idx%2===0?'#fff':'#F8FAFC'}}><td style={{padding:'10px 14px',color:N,fontWeight:500}}>{g.nome}</td><td style={{padding:'10px 14px',color:'#64748B'}}>{(g.unidades as any)?.nome??'—'}</td><td style={{padding:'10px 14px'}}><span style={{background:g.status==='inativo'?DANGER+'18':G+'18',color:g.status==='inativo'?DANGER:G,borderRadius:20,padding:'2px 10px',fontSize:11,fontWeight:600}}>{g.status==='inativo'?'⏸ Pausado':'● Ativo'}</span></td><td style={{padding:'10px 14px',color:TEAL,fontWeight:600}}>{pC}</td><td style={{padding:'10px 14px',color:N}}>{iC}</td><td style={{padding:'10px 14px',color:G,fontWeight:600}}>{aC}</td><td style={{padding:'10px 14px'}}><span style={{background:conv>=50?G+'18':WARN+'18',color:conv>=50?G:WARN,borderRadius:20,padding:'2px 10px',fontSize:11,fontWeight:600}}>{conv}%</span></td></tr>)})}</tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════ GESTORES ══════ */}
          {tab==='gestores'&&(
            <div>
              {ModalGestor}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                <input placeholder="🔍 Buscar gestor..." value={buscaGestor} onChange={e=>setBuscaGestor(e.target.value)} style={inp('280px')}/>
                <button onClick={abrirCriarGestor} style={btn(G)}>+ Novo Gestor</button>
              </div>
              <div style={{background:'#fff',borderRadius:14,border:'1px solid #E2E8F0',overflow:'hidden'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                  <thead><tr style={{background:'#F8FAFC'}}>{['Nome','E-mail','Unidade','Parceiros','Indicações','Cadastro','Status','Ações'].map(h=><th key={h} style={{padding:'12px 16px',textAlign:'left',color:'#475569',fontWeight:600,borderBottom:'1px solid #E2E8F0',whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
                  <tbody>{gestores.filter(g=>!buscaGestor||g.nome.toLowerCase().includes(buscaGestor.toLowerCase())||g.email.toLowerCase().includes(buscaGestor.toLowerCase())).map((g,idx)=>{const uid=gestorUid(g);return(<tr key={g.id} style={{background:idx%2===0?'#fff':'#F8FAFC'}}><td style={{padding:'12px 16px',color:N,fontWeight:500}}>{g.nome}</td><td style={{padding:'12px 16px',color:'#64748B'}}>{g.email}</td><td style={{padding:'12px 16px',color:'#64748B'}}>{(g.unidades as any)?.nome??'—'}</td><td style={{padding:'12px 16px',color:TEAL,fontWeight:600}}>{parceiros.filter(p=>p.unidade_id===uid).length}</td><td style={{padding:'12px 16px',color:N}}>{indicacoes.filter(i=>i.unidade_id===uid).length}</td><td style={{padding:'12px 16px',color:'#64748B',whiteSpace:'nowrap'}}>{new Date(g.created_at).toLocaleDateString('pt-BR')}</td><td style={{padding:'12px 16px'}}><span style={{background:g.status==='inativo'?DANGER+'15':G+'15',color:g.status==='inativo'?DANGER:G,borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:600}}>{g.status==='inativo'?'⏸ Pausado':'● Ativo'}</span></td><td style={{padding:'12px 16px'}}><div style={{display:'flex',gap:6}}><button onClick={()=>abrirEditarGestor(g)} style={btnOutline(TEAL)}>✏️</button><button onClick={()=>toggleGestorStatus(g)} style={btnOutline(g.status==='inativo'?G:WARN)}>{g.status==='inativo'?'▶':' ⏸'}</button><button onClick={()=>setConfirmDelete({tipo:'gestor',id:g.id,nome:g.nome})} style={btnOutline(DANGER)}>🗑</button></div></td></tr>)})}</tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════ PARCEIROS ══════ */}
          {tab==='parceiros'&&(
            <div>
              {ModalParceiro}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                <input placeholder="🔍 Buscar parceiro..." value={buscaParceiro} onChange={e=>setBuscaParceiro(e.target.value)} style={inp('280px')}/>
                <button onClick={abrirCriarParceiro} style={btn(G)}>+ Novo Parceiro</button>
              </div>
              <div style={{background:'#fff',borderRadius:14,border:'1px solid #E2E8F0',overflow:'hidden'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                  <thead><tr style={{background:'#F8FAFC'}}>{['Nome','E-mail','Especialidade','Unidade','Cadastro','Status','Ações'].map(h=><th key={h} style={{padding:'12px 16px',textAlign:'left',color:'#475569',fontWeight:600,borderBottom:'1px solid #E2E8F0'}}>{h}</th>)}</tr></thead>
                  <tbody>{parceiros.filter(p=>!buscaParceiro||p.nome.toLowerCase().includes(buscaParceiro.toLowerCase())||p.email.toLowerCase().includes(buscaParceiro.toLowerCase())).map((p,idx)=>{const uni=unidades.find(u=>u.id===p.unidade_id);return(<tr key={p.id} style={{background:idx%2===0?'#fff':'#F8FAFC'}}><td style={{padding:'12px 16px',color:N,fontWeight:500}}>{p.nome}</td><td style={{padding:'12px 16px',color:'#64748B'}}>{p.email}</td><td style={{padding:'12px 16px',color:'#64748B'}}>{p.especialidade}</td><td style={{padding:'12px 16px',color:TEAL}}>{uni?.nome??'—'}</td><td style={{padding:'12px 16px',color:'#64748B',whiteSpace:'nowrap'}}>{new Date(p.data_cadastro).toLocaleDateString('pt-BR')}</td><td style={{padding:'12px 16px'}}><span style={{background:p.status==='pendente'?WARN+'18':p.status==='rejeitado'?DANGER+'18':G+'18',color:p.status==='pendente'?WARN:p.status==='rejeitado'?DANGER:G,borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:600}}>{p.status==='pendente'?'⏳':p.status==='rejeitado'?'✕ Rejeitado':'● Ativo'}</span></td><td style={{padding:'12px 16px'}}><div style={{display:'flex',gap:6}}><button onClick={()=>abrirEditarParceiro(p)} style={btnOutline(TEAL)}>✏️ Editar</button><button onClick={()=>setConfirmDelete({tipo:'parceiro',id:p.id,nome:p.nome})} style={btnOutline(DANGER)}>🗑</button></div></td></tr>)})}</tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════ PACIENTES ══════ */}
          {tab==='pacientes'&&(
            <div>
              {ModalInd}
              {/* Filtros */}
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #E2E8F0',padding:'16px 20px',marginBottom:20}}>
                <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'flex-end'}}>
                  <div><label style={{fontSize:11,fontWeight:600,color:'#64748B',display:'block',marginBottom:4}}>De</label><input type="date" value={pacDataIni} onChange={e=>setPacDataIni(e.target.value)} style={inp('140px')}/></div>
                  <div><label style={{fontSize:11,fontWeight:600,color:'#64748B',display:'block',marginBottom:4}}>Até</label><input type="date" value={pacDataFim} onChange={e=>setPacDataFim(e.target.value)} style={inp('140px')}/></div>
                  <div><label style={{fontSize:11,fontWeight:600,color:'#64748B',display:'block',marginBottom:4}}>Gestor</label>
                    <select value={pacGestor} onChange={e=>{setPacGestor(e.target.value);setPacParceiro('todos')}} style={inp('180px')}>
                      <option value="todos">Todos os gestores</option>
                      {gestores.map(g=><option key={g.id} value={g.id}>{g.nome}</option>)}
                    </select>
                  </div>
                  <div><label style={{fontSize:11,fontWeight:600,color:'#64748B',display:'block',marginBottom:4}}>Parceiro</label>
                    <select value={pacParceiro} onChange={e=>setPacParceiro(e.target.value)} style={inp('180px')}>
                      <option value="todos">Todos os parceiros</option>
                      {parceirosDoPacGestor.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                  </div>
                  <div><label style={{fontSize:11,fontWeight:600,color:'#64748B',display:'block',marginBottom:4}}>Status</label>
                    <select value={pacStatus} onChange={e=>setPacStatus(e.target.value)} style={inp('160px')}>
                      <option value="todos">Todos</option>
                      {STATUS_IND.map(s=><option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                  </div>
                  <div style={{flex:1,minWidth:180}}><label style={{fontSize:11,fontWeight:600,color:'#64748B',display:'block',marginBottom:4}}>Buscar</label><input placeholder="Paciente, parceiro..." value={pacBusca} onChange={e=>setPacBusca(e.target.value)} style={inp()}/></div>
                  <button onClick={abrirCriarInd} style={btn(G)}>+ Nova Indicação</button>
                </div>
                <div style={{marginTop:10,fontSize:12,color:'#64748B'}}>
                  Exibindo <strong style={{color:N}}>{indsFiltPac.length}</strong> de {indicacoes.length} indicações
                </div>
              </div>

              {/* Tabela */}
              <div style={{background:'#fff',borderRadius:14,border:'1px solid #E2E8F0',overflow:'hidden'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                  <thead>
                    <tr style={{background:'#F8FAFC'}}>
                      {['Paciente','Responsável','Benefício','Parceiro','Gestor/Unidade','Data','Status','Ações'].map(h=>(
                        <th key={h} style={{padding:'12px 14px',textAlign:'left',color:'#475569',fontWeight:600,borderBottom:'1px solid #E2E8F0',whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {indsFiltPac.map((ind,idx)=>{
                      const parc=parceiros.find(p=>p.id===ind.parceiro_id)
                      const uni=unidades.find(u=>u.id===ind.unidade_id)
                      const sc=STATUS_COLOR[ind.status]??'#94A3B8'
                      const sl=STATUS_LABEL[ind.status]??ind.status
                      return(
                        <tr key={ind.id} style={{background:idx%2===0?'#fff':'#F8FAFC'}}>
                          <td style={{padding:'11px 14px',color:N,fontWeight:500}}>
                            <div>{ind.paciente_nome}</div>
                            {ind.paciente_telefone&&<div style={{fontSize:11,color:'#94A3B8',marginTop:2}}>{ind.paciente_telefone}</div>}
                          </td>
                          <td style={{padding:'11px 14px',color:'#64748B',fontSize:12}}>{ind.responsavel||'—'}</td>
                          <td style={{padding:'11px 14px'}}>
                            <span style={{background:ind.modelo?.includes('consult')?G+'15':TEAL+'15',color:ind.modelo?.includes('consult')?G:TEAL,borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:600}}>
                              {ind.modelo?.includes('consult')?'🏠 Consultoria':'🤝 Avaliação'}
                            </span>
                          </td>
                          <td style={{padding:'11px 14px',color:TEAL,fontSize:12}}>{parc?.nome??'—'}</td>
                          <td style={{padding:'11px 14px',color:'#64748B',fontSize:12}}>{uni?.nome??'—'}</td>
                          <td style={{padding:'11px 14px',color:'#64748B',whiteSpace:'nowrap',fontSize:12}}>{new Date(ind.data_indicacao).toLocaleDateString('pt-BR')}</td>
                          <td style={{padding:'11px 14px'}}>
                            <span style={{background:sc+'18',color:sc,borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:600}}>{sl}</span>
                          </td>
                          <td style={{padding:'11px 14px'}}>
                            <div style={{display:'flex',gap:6}}>
                              <button onClick={()=>abrirEditarInd(ind)} style={btnOutline(TEAL)}>✏️</button>
                              <button onClick={()=>setConfirmDelete({tipo:'indicacao',id:ind.id,nome:ind.paciente_nome})} style={btnOutline(DANGER)}>🗑</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {indsFiltPac.length===0&&<div style={{textAlign:'center',color:'#94A3B8',padding:40,fontSize:13}}>Nenhuma indicação encontrada com estes filtros</div>}
              </div>
            </div>
          )}

          {/* ══════ SENHAS ══════ */}
          {tab==='senha'&&(
            <div style={{maxWidth:540}}>
              <div style={{background:'#fff',borderRadius:14,padding:28,border:'1px solid #E2E8F0'}}>
                <h3 style={{fontSize:16,fontWeight:700,color:N,margin:'0 0 6px'}}>🔑 Recuperação / Reset de Senha</h3>
                <p style={{fontSize:13,color:'#64748B',margin:'0 0 20px'}}>Busque o usuário pelo e-mail para ver ou redefinir a senha.</p>
                <div style={{display:'flex',gap:10,marginBottom:16}}>
                  <input type="email" value={senhaEmail} placeholder="email@usuario.com" onChange={e=>{setSenhaEmail(e.target.value);setSenhaResult('');setSenhaFound(null)}} style={inp()}/>
                  <button onClick={buscarSenha} disabled={senhaLoading} style={btn(TEAL,senhaLoading)}>{senhaLoading?'...':'🔍 Buscar'}</button>
                </div>
                {senhaResult&&<div style={{background:'#F8FAFC',border:'1px solid #E2E8F0',borderRadius:10,padding:16,marginBottom:12}}><pre style={{fontSize:13,color:N,margin:0,whiteSpace:'pre-wrap',fontFamily:'monospace'}}>{senhaResult}</pre></div>}
                {senhaFound&&<div style={{borderTop:'1px solid #E2E8F0',paddingTop:16}}><p style={{fontSize:13,fontWeight:600,color:N,margin:'0 0 8px'}}>Redefinir senha:</p><div style={{display:'flex',gap:10}}><input value={novaSenha} onChange={e=>setNovaSenha(e.target.value)} placeholder="Nova senha" style={inp()}/><button onClick={resetarSenha} style={btn(G)}>Salvar</button></div></div>}
              </div>
              <div style={{background:'#fff',borderRadius:14,padding:24,border:'1px solid #E2E8F0',marginTop:20}}>
                <h3 style={{fontSize:14,fontWeight:700,color:N,margin:'0 0 14px'}}>📋 Credenciais dos Gestores</h3>
                {gestores.map(g=>(
                  <div key={g.id} style={{display:'grid',gridTemplateColumns:'1fr 1.4fr auto',gap:8,padding:'8px 10px',background:'#F8FAFC',borderRadius:7,marginBottom:6,fontSize:12,alignItems:'center'}}>
                    <span style={{color:N,fontWeight:600}}>{g.nome}</span>
                    <span style={{color:'#64748B',overflow:'hidden',textOverflow:'ellipsis'}}>{g.email}</span>
                    <span style={{color:TEAL,fontFamily:'monospace',fontWeight:600}}>{g.senha}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
