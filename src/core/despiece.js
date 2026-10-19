// Motor de despiece: a partir de las medidas y la configuración de una ventana
// calcula cuánto material lleva y cuánto cuesta. Lógica pura, sin Vue.

export const FAMILIAS = [
  { id: 'perfil', nombre: 'Perfiles PVC' },
  { id: 'refuerzo', nombre: 'Refuerzos acero' },
  { id: 'vidrio', nombre: 'Vidrio' },
  { id: 'herraje', nombre: 'Herrajes' },
  { id: 'accesorio', nombre: 'Juntas y accesorios' },
  { id: 'manoObra', nombre: 'Mano de obra' },
]

const redondear = (n, dec = 2) => Math.round(n * 10 ** dec) / 10 ** dec

export function seriesCompatibles(catalogo, tipologiaId) {
  const tip = catalogo.tipologias.find((t) => t.id === tipologiaId)
  if (!tip) return []
  return catalogo.series.filter((s) =>
    tip.tipo === 'fijo' ? s.tipo === 'practicable' : s.tipo === tip.tipo,
  )
}

// Medidas (mm) de hojas y vidrios. Se usa también para dibujar la ventana.
export function geometria(serie, tipologia, ancho, alto) {
  const g = serie.geometria
  const luzAncho = ancho - 2 * g.marco
  const luzAlto = alto - 2 * g.marco
  const n = tipologia.hojas

  if (n === 0) {
    return {
      luzAncho, luzAlto, hojas: [],
      vidrios: [{ ancho: luzAncho - 2 * g.holguraVidrio, alto: luzAlto - 2 * g.holguraVidrio }],
    }
  }

  // Practicable: cada hoja cubre su parte de luz más el solape sobre el marco.
  // Corredera: las hojas se cruzan en el centro (cruce), así que suman luz + cruce.
  const anchoHoja = tipologia.tipo === 'corredera'
    ? (luzAncho + g.cruce) / n + 2 * g.solapeHoja
    : luzAncho / n + 2 * g.solapeHoja
  const altoHoja = luzAlto + 2 * g.solapeHoja
  const hojas = Array.from({ length: n }, () => ({ ancho: anchoHoja, alto: altoHoja }))
  const vidrios = hojas.map((h) => ({
    ancho: h.ancho - 2 * g.vistaHoja - 2 * g.holguraVidrio,
    alto: h.alto - 2 * g.vistaHoja - 2 * g.holguraVidrio,
  }))
  return { luzAncho, luzAlto, hojas, vidrios }
}

export function validarMedidas(serie, tipologia, ancho, alto) {
  const errores = []
  if (!(ancho >= 300 && ancho <= 4000)) errores.push('El ancho debe estar entre 300 y 4000 mm.')
  if (!(alto >= 300 && alto <= 3000)) errores.push('El alto debe estar entre 300 y 3000 mm.')
  if (errores.length) return errores
  const { vidrios } = geometria(serie, tipologia, ancho, alto)
  if (vidrios.some((v) => v.ancho < 100 || v.alto < 100)) {
    errores.push('Las medidas son demasiado pequeñas para esta tipología: el vidrio quedaría por debajo de 100 mm.')
  }
  return errores
}

/**
 * Despiece de UNA unidad de ventana.
 * linea: { serieId, tipologiaId, ancho, alto (mm), vidrioRef, colorId }
 * Devuelve { partidas: [...], porFamilia: {familia: €}, coste, superficie, geometria }
 */
export function calcularDespiece(catalogo, linea) {
  const art = new Map(catalogo.articulos.map((a) => [a.ref, a]))
  const serie = catalogo.series.find((s) => s.id === linea.serieId)
  const tip = catalogo.tipologias.find((t) => t.id === linea.tipologiaId)
  const color = catalogo.colores.find((c) => c.id === linea.colorId) ?? catalogo.colores[0]
  if (!serie) throw new Error(`Serie desconocida: ${linea.serieId}`)
  if (!tip) throw new Error(`Tipología desconocida: ${linea.tipologiaId}`)

  const { ancho, alto } = linea
  const errores = validarMedidas(serie, tip, ancho, alto)
  if (errores.length) throw new Error(errores.join(' '))

  const geo = geometria(serie, tip, ancho, alto)
  const partidas = []

  const anadir = (ref, concepto, cantidadNeta, extra = {}) => {
    const a = art.get(ref)
    if (!a) throw new Error(`Falta el artículo ${ref} en el catálogo.`)
    // El color foliado encarece solo el perfil de PVC, no el acero ni el vidrio.
    const suplemento = a.familia === 'perfil' ? color.suplemento : 0
    const precioUnit = a.precio * (1 + suplemento / 100)
    const cantidad = cantidadNeta * (1 + (a.merma ?? 0) / 100)
    partidas.push({
      ref, nombre: a.nombre, familia: a.familia, unidad: a.unidad, concepto,
      cantidadNeta: redondear(cantidadNeta, 3),
      cantidad: redondear(cantidad, 3),
      precioUnit: redondear(precioUnit, 4),
      importe: redondear(cantidad * precioUnit),
      ...extra,
    })
  }

  const perimetro = (w, h) => (2 * (w + h)) / 1000 // mm → ml
  const p = serie.perfiles

  // Marco y su refuerzo
  const mlMarco = perimetro(ancho, alto)
  anadir(p.marco, 'Marco', mlMarco)
  anadir(p.refuerzoMarco, 'Refuerzo marco', mlMarco)

  // Hojas y refuerzos
  const mlHojas = geo.hojas.reduce((s, h) => s + perimetro(h.ancho, h.alto), 0)
  if (mlHojas > 0) {
    anadir(p.hoja, `Hoja ×${geo.hojas.length}`, mlHojas)
    anadir(p.refuerzoHoja, 'Refuerzo hoja', mlHojas)
  }

  // Inversora: la hoja pasiva de una practicable de 2 hojas lleva un perfil central
  if (tip.tipo === 'practicable' && tip.hojas === 2 && p.inversora) {
    anadir(p.inversora, 'Inversora central', geo.hojas[0].alto / 1000)
  }

  // Junquillo: rodea cada vidrio
  const mlJunquillo = geo.vidrios.reduce((s, v) => s + perimetro(v.ancho, v.alto), 0)
  anadir(p.junquillo, 'Junquillo', mlJunquillo)

  // Vidrio: m² por paño, con mínimo facturable por paño
  const vidrio = art.get(linea.vidrioRef)
  if (!vidrio || vidrio.familia !== 'vidrio') throw new Error('Selecciona un vidrio válido.')
  const m2Vidrio = geo.vidrios.reduce(
    (s, v) => s + Math.max((v.ancho * v.alto) / 1e6, vidrio.minimoM2 ?? 0), 0)
  anadir(vidrio.ref, `Vidrio ${geo.vidrios.length} paño(s)`, m2Vidrio)

  // Herrajes según tipología
  for (const h of tip.herrajes) anadir(h.ref, 'Herraje', h.cantidad)

  // Juntas: marco + hojas (ambas caras de contacto) + vidrios
  anadir(catalogo.junta, 'Junta', mlMarco + 2 * mlHojas + mlJunquillo)
  for (const a of catalogo.accesoriosPorVentana) anadir(a.ref, 'Accesorios', a.cantidad)

  // Mano de obra: tiempo fijo por tipología + tiempo proporcional a la superficie
  const superficie = (ancho * alto) / 1e6
  const horas = tip.horasBase + superficie * catalogo.horasPorM2
  partidas.push({
    ref: catalogo.manoObra.ref, nombre: 'Mano de obra taller', familia: 'manoObra', unidad: 'h',
    concepto: 'Corte, soldadura y montaje',
    cantidadNeta: redondear(horas, 3), cantidad: redondear(horas, 3),
    precioUnit: catalogo.manoObra.precioHora,
    importe: redondear(horas * catalogo.manoObra.precioHora),
  })

  const porFamilia = Object.fromEntries(FAMILIAS.map((f) => [f.id, 0]))
  for (const pt of partidas) porFamilia[pt.familia] += pt.importe
  for (const k in porFamilia) porFamilia[k] = redondear(porFamilia[k])
  const coste = redondear(partidas.reduce((s, pt) => s + pt.importe, 0))

  return { partidas, porFamilia, coste, superficie: redondear(superficie, 3), geometria: geo }
}
