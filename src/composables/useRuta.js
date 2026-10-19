// Enrutado mínimo por #fragmento: no necesita configuración en Vercel
// y permite enlazar a cualquier vista (#/presupuesto/abc/imprimir).
import { ref } from 'vue'

const ruta = ref(leer())

function leer() {
  const partes = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  return { vista: partes[0] || 'presupuestos', id: partes[1] ?? null, sub: partes[2] ?? null }
}

window.addEventListener('hashchange', () => {
  ruta.value = leer()
  window.scrollTo(0, 0)
})

export function useRuta() {
  const ir = (...partes) => { location.hash = '/' + partes.filter(Boolean).join('/') }
  return { ruta, ir }
}
