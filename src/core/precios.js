// Cálculo económico del presupuesto. Lógica pura, sin Vue.
//
// Cadena de precio de cada línea:
//   coste (despiece)  →  × (1 + beneficio%)  =  precio de tarifa
//   tarifa            →  × (1 − rebaja%)     =  base imponible
//   base − coste       =  beneficio real   →  margen real = beneficio / base
//
// Ojo: "beneficio %" se aplica sobre el COSTE (recargo), mientras que el
// "margen %" se mide sobre la VENTA. Un 25 % de recargo es solo un 20 % de margen.

import { calcularDespiece, FAMILIAS } from './despiece.js'

const r2 = (n) => Math.round(n * 100) / 100

export function calcularLinea(catalogo, presupuesto, linea) {
  const unidad = calcularDespiece(catalogo, linea)
  const cantidad = Math.max(1, Math.floor(linea.cantidad || 1))
  const beneficioPct = linea.beneficioPct ?? presupuesto.beneficioPct
  const descuentoPct = presupuesto.descuentoPct

  const coste = unidad.coste * cantidad
  const tarifa = coste * (1 + beneficioPct / 100)
  const descuento = tarifa * (descuentoPct / 100)
  const base = tarifa - descuento
  const porFamilia = Object.fromEntries(
    Object.entries(unidad.porFamilia).map(([k, v]) => [k, v * cantidad]))

  return {
    unidad, cantidad, beneficioPct,
    coste: r2(coste), tarifa: r2(tarifa), descuento: r2(descuento), base: r2(base),
    beneficio: r2(base - coste),
    margenPct: base > 0 ? ((base - coste) / base) * 100 : 0,
    precioUnitario: r2(base / cantidad),
    porFamilia,
  }
}

export function calcularPresupuesto(catalogo, presupuesto) {
  const lineas = presupuesto.lineas.map((l) => {
    // Una línea con datos imposibles no debe tumbar el presupuesto entero
    try {
      return { id: l.id, ok: true, ...calcularLinea(catalogo, presupuesto, l) }
    } catch (e) {
      return { id: l.id, ok: false, error: e.message }
    }
  })
  const validas = lineas.filter((l) => l.ok)
  const suma = (campo) => r2(validas.reduce((s, l) => s + l[campo], 0))

  const coste = suma('coste')
  const tarifa = suma('tarifa')
  const descuento = suma('descuento')
  const base = suma('base')
  const beneficio = r2(base - coste)
  const iva = r2(base * (presupuesto.ivaPct / 100))

  const porFamilia = Object.fromEntries(FAMILIAS.map((f) => [f.id, 0]))
  for (const l of validas) for (const k in l.porFamilia) porFamilia[k] += l.porFamilia[k]
  for (const k in porFamilia) porFamilia[k] = r2(porFamilia[k])

  return {
    lineas, coste, tarifa, descuento, base, beneficio, iva,
    total: r2(base + iva),
    margenPct: base > 0 ? (beneficio / base) * 100 : 0,
    recargoRealPct: coste > 0 ? (beneficio / coste) * 100 : 0,
    porFamilia,
    descuentoMaximoPct: descuentoMaximo(coste, tarifa, presupuesto.margenMinimoPct),
    unidades: validas.reduce((s, l) => s + l.cantidad, 0),
  }
}

// Rebaja máxima que se puede conceder sin bajar del margen mínimo sobre venta.
//   base ≥ coste / (1 − m)   y   base = tarifa · (1 − d)
//   ⇒  d ≤ 1 − coste / ((1 − m) · tarifa)
export function descuentoMaximo(coste, tarifa, margenMinimoPct) {
  if (tarifa <= 0) return 0
  const m = margenMinimoPct / 100
  return Math.max(0, (1 - coste / ((1 - m) * tarifa)) * 100)
}

// Beneficio (recargo sobre coste) necesario para alcanzar un margen sobre venta
// después de aplicar una rebaja.  (1 + b)(1 − d) = 1 / (1 − m)
export function beneficioNecesario(margenObjetivoPct, descuentoPct) {
  const m = margenObjetivoPct / 100
  const d = descuentoPct / 100
  if (m >= 1 || d >= 1) return Infinity
  return (1 / ((1 - m) * (1 - d)) - 1) * 100
}
