// POST /api/calcular
//   { "linea": { serieId, tipologiaId, ancho, alto, vidrioRef, colorId } }  → despiece de una unidad
//   { "presupuesto": { beneficioPct, descuentoPct, ivaPct, margenMinimoPct, lineas: [...] } } → totales
// Usa exactamente el mismo motor que el navegador (src/core), así que el resultado coincide.
import catalogo from '../src/data/catalogo.json' with { type: 'json' }
import { calcularDespiece } from '../src/core/despiece.js'
import { calcularPresupuesto } from '../src/core/precios.js'

const numeroValido = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método no permitido' })
  }
  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'Cuerpo JSON no válido' })

  try {
    if (body.linea) return res.status(200).json(calcularDespiece(catalogo, body.linea))

    const p = body.presupuesto
    if (p && Array.isArray(p.lineas)) {
      if (p.lineas.length > 200) return res.status(400).json({ error: 'Máximo 200 líneas por presupuesto' })
      const presupuesto = {
        beneficioPct: numeroValido(p.beneficioPct, 0, 300) ? p.beneficioPct : 30,
        descuentoPct: numeroValido(p.descuentoPct, 0, 100) ? p.descuentoPct : 0,
        ivaPct: numeroValido(p.ivaPct, 0, 100) ? p.ivaPct : 21,
        margenMinimoPct: numeroValido(p.margenMinimoPct, 0, 90) ? p.margenMinimoPct : 15,
        lineas: p.lineas.map((l, i) => ({ id: String(l.id ?? i), ...l })),
      }
      return res.status(200).json(calcularPresupuesto(catalogo, presupuesto))
    }
    return res.status(400).json({ error: 'Envía "linea" o "presupuesto"' })
  } catch (e) {
    return res.status(422).json({ error: e.message })
  }
}

function safeParse(s) {
  try { return JSON.parse(s) } catch { return null }
}
