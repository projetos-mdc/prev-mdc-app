import { supabase } from './supabase'

export function getCurrentPartner() {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('mdc_partner')
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function setCurrentPartner(data: object) {
  localStorage.setItem('mdc_partner', JSON.stringify(data))
}

export function clearCurrentPartner() {
  localStorage.removeItem('mdc_partner')
}

export async function loginPartner(email: string, senha: string) {
  const { data, error } = await supabase
    .from('parceiros')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .eq('senha', senha)          // Em prod: comparar hash bcrypt
    .eq('status', 'ativo')
    .single()

  if (error || !data) return { error: 'E-mail ou senha incorretos.' }
  setCurrentPartner(data)
  return { data }
}
