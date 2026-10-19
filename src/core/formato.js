// useGrouping 'always': en es-ES Intl no agrupa los números de 4 cifras (1118,66 €),
// pero en un presupuesto se espera 1.118,66 €.
const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', useGrouping: 'always' })
const pct = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 })
const seguro = (n) => (Number.isFinite(n) ? n : 0)

export const euros = (n) => eur.format(seguro(n))
export const numero = (n, dec = 2) =>
  new Intl.NumberFormat('es-ES', { maximumFractionDigits: dec, useGrouping: 'always' }).format(seguro(n))
export const porcentaje = (n) => `${pct.format(seguro(n))} %`
export const unidad = (u) => ({ ml: 'ml', m2: 'm²', ud: 'ud', h: 'h' }[u] ?? u)
