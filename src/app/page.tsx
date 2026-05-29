'use client'
import Link from 'next/link'

const G='#069E6E',N='#2D2E47',C='#00BAB4',S='#3E7996',T='#2F6C82'

export default function Home() {
  const segs=[
    {icon:'🩺',label:'Geriatras & Médicos',color:G},
    {icon:'🗣️',label:'Fonoaudiólogos',color:S},
    {icon:'🏃',label:'Fisioterapeutas',color:T},
    {icon:'💉',label:'Enfermeiros & Técnicos',color:C},
  ]
  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:'#fff',minHeight:'100vh'}}>
      <section style={{background:`linear-gradient(135deg,${N} 0%,${T} 100%)`,padding:'64px 24px',textAlign:'center',position:'relative',overflow:'hidden'}}>
        <div style={{position:'relative',zIndex:1,maxWidth:600,margin:'0 auto'}}>
          <span style={{display:'inline-block',background:C+'28',border:`1px solid ${C}55`,color:C,padding:'5px 16px',borderRadius:20,fontSize:12,fontWeight:600,letterSpacing:'0.08em',marginBottom:18,textTransform:'uppercase'}}>Programa Prev MDC</span>
          <h1 style={{fontSize:'clamp(22px,4vw,38px)',color:'#fff',lineHeight:1.2,marginBottom:14,fontWeight:700}}>Programa de Parcerias no<br/><span style={{color:C}}>Cuidado Domiciliar e Institucional</span></h1>
          <p style={{color:'#B0E8E6',fontSize:13,lineHeight:1.7,marginBottom:32,maxWidth:460,margin:'0 auto 32px'}}>Levando o cuidado para todos os pacientes em todos os lugares</p>
          <Link href="/cadastro" style={{display:'inline-block',background:G,color:'#fff',padding:'13px 32px',borderRadius:10,fontWeight:600,fontSize:15,textDecoration:'none'}}>Quero ser parceiro →</Link>
        </div>
      </section>
      <section style={{padding:'32px 24px 0',maxWidth:800,margin:'0 auto'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
          {[['14+','Anos'],['3k+','Pacientes'],['20+','Parceiros'],['5★','Google']].map(([n,l])=>(
            <div key={l} style={{background:'#F1F9F6',borderRadius:12,padding:16,textAlign:'center'}}>
              <div style={{fontSize:22,fontWeight:700,color:N}}>{n}</div>
              <div style={{fontSize:12,color:'#64748B',marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>
      </section>
      <section style={{padding:'32px 24px 0',maxWidth:800,margin:'0 auto'}}>
        <div style={{borderRadius:14,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,.12)'}}>
          <div style={{background:N,padding:'8px 14px',fontSize:12,color:'#B0E8E6'}}>▶ Programa Prev MDC — conheça a proposta</div>
          <div style={{aspectRatio:'16/9'}}><iframe src="https://www.youtube.com/embed/oVp_WuuoqRE" style={{width:'100%',height:'100%',display:'block'}} allowFullScreen frameBorder="0"/></div>
        </div>
      </section>
      <section style={{padding:'32px 24px 0',maxWidth:800,margin:'0 auto'}}>
        <p style={{fontSize:11,fontWeight:600,color:'#94A3B8',letterSpacing:'.07em',textTransform:'uppercase',marginBottom:12}}>Depoimentos</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12}}>
          {[
            {name:'Dra. Fernanda Alves',role:'Geriatra',text:'Meus pacientes acamados finalmente têm acesso a atendimento odontológico de qualidade em casa.'},
            {name:'Beatriz Santos',role:'Profissional de Saúde',text:'Recebo por cada indicação e melhoro o cuidado dos meus pacientes. A parceria é perfeita.'},
            {name:'ILPI Vila Serena',role:'Instituição',text:'O Programa Prev transformou a rotina bucal dos nossos residentes. Equipe muito profissional.'},
            {name:'Home Care Cuidar+',role:'Empresa',text:'O curso com certificação foi um diferencial enorme para nossa equipe de cuidadores.'},
          ].map(t=>(
            <div key={t.name} style={{background:'#fff',border:'1px solid #E2E8F0',borderRadius:12,padding:16}}>
              <div style={{color:'#F59E0B',fontSize:13,marginBottom:6}}>★★★★★</div>
              <p style={{fontSize:13,color:'#475569',lineHeight:1.65,marginBottom:10}}>"{t.text}"</p>
              <div style={{fontSize:13,fontWeight:600,color:N}}>{t.name}</div>
              <div style={{fontSize:11,color:'#94A3B8'}}>{t.role}</div>
            </div>
          ))}
        </div>
      </section>
      <section style={{padding:'32px 24px 0',maxWidth:800,margin:'0 auto'}}>
        <p style={{fontSize:11,fontWeight:600,color:'#94A3B8',letterSpacing:'.07em',textTransform:'uppercase',marginBottom:12}}>Feito para profissionais de saúde</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,marginBottom:20}}>
          {segs.map(s=>(<div key={s.label} style={{background:s.color,borderRadius:12,padding:'20px 16px',color:'#fff',textAlign:'center'}}><div style={{fontSize:28,marginBottom:6}}>{s.icon}</div><div style={{fontSize:13,fontWeight:500}}>{s.label}</div></div>))}
        </div>
        <Link href="/cadastro" style={{display:'block',background:G,color:'#fff',padding:13,borderRadius:10,fontWeight:600,fontSize:15,textDecoration:'none',textAlign:'center'}}>Quero ser parceiro →</Link>
      </section>
      <footer style={{padding:'32px 24px',marginTop:32,background:N,textAlign:'center'}}>
        <div style={{marginBottom:12}}><img src="/logo-mdc.png" alt="Meu Dentista em Casa" style={{height:40,filter:'brightness(0) invert(1)',display:'inline-block',width:'auto'}} /></div>
        <p style={{color:'#94A3B8',fontSize:12,marginBottom:14}}>Levando o cuidado odontológico a todos os lugares.</p>
        <Link href="/login" style={{border:'1px solid #2F6C82',color:'#B0E8E6',padding:'7px 18px',borderRadius:8,fontSize:13,textDecoration:'none'}}>Já sou parceiro — Fazer login</Link>
        <p style={{color:'#475569',fontSize:11,marginTop:16}}>© 2026 Meu Dentista em Casa</p>
      </footer>
    </div>
  )
}
