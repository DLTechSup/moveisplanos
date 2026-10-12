// Formatação no padrão brasileiro.
export function fmtNum(v: number, casas = 2): string {
  let t = v.toFixed(casas)
  if (t.includes('.')) t = t.replace(/0+$/, '').replace(/\.$/, '')
  if (t === '-0' || t === '') t = '0'
  return t.replace('.', ',')
}
export const fmtCm = (mm: number) => fmtNum(mm / 10, 2)
export const fmtMm = (mm: number) => fmtNum(mm, 1)
export function fmtBrl(v: number): string {
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
