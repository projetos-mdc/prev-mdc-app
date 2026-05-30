'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'

const G='#069E6E', S='#3E7996', C='#00BAB4'
const COLORS = [G, S, C, '#F59E0B', '#8B5CF6', '#EF4444']

type StatusItem = { name:string; value:number; color:string; icon:string }
type MesItem = { mes:string; total:number }
type RepasseItem = { mes:string; valor:number }

export function IndsPorMesChart({ data }: { data: MesItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barSize={28}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
        <XAxis dataKey="mes" tick={{ fontSize:11, fill:'#94A3B8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize:11, fill:'#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ borderRadius:10, border:'none', boxShadow:'0 4px 16px rgba(0,0,0,.1)', fontSize:12 }} />
        <Bar dataKey="total" fill={G} radius={[6,6,0,0]} name="Indicações" />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function StatusPieChart({ data }: { data: StatusItem[] }) {
  return (
    <ResponsiveContainer width="50%" height={180}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={3} dataKey="value">
          {data.map((_, i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={{ borderRadius:10, border:'none', fontSize:12 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function RepasseAreaChart({ data }: { data: RepasseItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="repGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={S} stopOpacity={0.2}/>
            <stop offset="95%" stopColor={S} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
        <XAxis dataKey="mes" tick={{ fontSize:11, fill:'#94A3B8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize:11, fill:'#94A3B8' }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius:10, border:'none', fontSize:12 }} />
        <Area type="monotone" dataKey="valor" stroke={S} strokeWidth={2.5} fill="url(#repGrad)" name="Repasse" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
