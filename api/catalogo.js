// GET /api/catalogo → catálogo precargado (artículos, series, tipologías, colores).
// La app ya lo lleva incluido para arrancar al instante; este endpoint es el punto
// de partida para servirlo desde una base de datos real.
import catalogo from '../src/data/catalogo.json' with { type: 'json' }

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Método no permitido' })
  }
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400')
  return res.status(200).json(catalogo)
}
