<script setup>
// Alzado de la ventana visto desde el interior, a escala, con símbolos de apertura
// (el vértice del triángulo señala el lado de las bisagras) y cotas en mm.
import { computed } from 'vue'
import { geometria } from '../core/despiece.js'
import { numero } from '../core/formato.js'

const props = defineProps({
  serie: { type: Object, default: null },
  tipologia: { type: Object, default: null },
  ancho: { type: Number, required: true },
  alto: { type: Number, required: true },
  color: { type: String, default: '' },
  mini: { type: Boolean, default: false },
})

const dibujo = computed(() => {
  if (!props.serie || !props.tipologia) return null
  try {
    const A = props.ancho, H = props.alto
    const g = props.serie.geometria
    const t = props.tipologia
    const geo = geometria(props.serie, t, A, H)
    if (geo.vidrios.some((v) => v.ancho <= 0 || v.alto <= 0)) return null

    const hojas = geo.hojas.map((h, i) => {
      let x
      if (t.tipo === 'corredera') x = i === 0 ? g.marco - g.solapeHoja : A - g.marco + g.solapeHoja - h.ancho
      else x = g.marco - g.solapeHoja + i * (geo.luzAncho / geo.hojas.length)
      const y = g.marco - g.solapeHoja
      // Bisagras: 1 hoja → izquierda; 2 hojas → cada una hacia su lado exterior
      const bisagra = geo.hojas.length === 2 && i === 1 ? 'der' : 'izq'
      return { x, y, w: h.ancho, h: h.alto, v: g.vistaHoja, bisagra }
    })
    return { A, H, g, geo, hojas, tipo: t.tipo, apertura: t.apertura }
  } catch {
    return null
  }
})

const margen = computed(() => (props.mini ? 30 : Math.max(props.ancho, props.alto) * 0.14))
const viewBox = computed(() => {
  const m = margen.value
  return props.mini
    ? `${-m} ${-m} ${props.ancho + 2 * m} ${props.alto + 2 * m}`
    : `${-m * 0.4} ${-m * 0.4} ${props.ancho + m * 1.4} ${props.alto + m * 1.4}`
})
const trazo = computed(() => Math.max(props.ancho, props.alto) / (props.mini ? 60 : 220))
const letra = computed(() => Math.max(props.ancho, props.alto) * 0.045)

function simbolo(h, apertura) {
  const l = []
  const [x1, y1, x2, y2] = [h.x + h.v, h.y + h.v, h.x + h.w - h.v, h.y + h.h - h.v]
  if (apertura === 'practicable' || apertura === 'oscilobatiente') {
    const xb = h.bisagra === 'izq' ? x1 : x2
    const xm = h.bisagra === 'izq' ? x2 : x1
    l.push(`M${xm},${y1} L${xb},${(y1 + y2) / 2} L${xm},${y2}`)
  }
  // Abatible hacia dentro: bisagras abajo, vértice abajo
  if (apertura === 'oscilobatiente' && !(h.esPasiva)) l.push(`M${x1},${y1} L${(x1 + x2) / 2},${y2} L${x2},${y1}`)
  return l
}
const lineasApertura = computed(() => {
  const d = dibujo.value
  if (!d || d.tipo === 'corredera') return []
  // En 2 hojas la segunda (pasiva) solo es practicable
  return d.hojas.flatMap((h, i) => simbolo({ ...h, esPasiva: i === 1 }, d.apertura))
})
</script>

<template>
  <svg v-if="dibujo" :viewBox="viewBox" class="dibujo" :class="{ mini }" role="img"
       :aria-label="`${tipologia.nombre}, ${ancho} por ${alto} milímetros`"
       :style="{ '--trazo': trazo, '--perfil': color || 'var(--pvc)' }">
    <!-- Marco -->
    <rect x="0" y="0" :width="dibujo.A" :height="dibujo.H" class="perfil" />
    <rect :x="dibujo.g.marco" :y="dibujo.g.marco" :width="dibujo.geo.luzAncho" :height="dibujo.geo.luzAlto"
          :class="dibujo.hojas.length ? 'hueco' : 'cristal'" />

    <!-- Hojas -->
    <g v-for="(h, i) in dibujo.hojas" :key="i">
      <rect :x="h.x" :y="h.y" :width="h.w" :height="h.h" class="perfil" />
      <rect :x="h.x + h.v" :y="h.y + h.v" :width="h.w - 2 * h.v" :height="h.h - 2 * h.v" class="cristal" />
      <rect v-if="dibujo.tipo !== 'corredera' && !(dibujo.hojas.length === 2 && i === 1)"
            :x="h.bisagra === 'izq' ? h.x + h.w - h.v * 0.65 : h.x + h.v * 0.35"
            :y="h.y + h.h / 2 - h.v * 0.9" :width="h.v * 0.3" :height="h.v * 1.8" class="manilla" />
    </g>
    <path v-for="(d, i) in lineasApertura" :key="'a' + i" :d="d" class="apertura" />

    <!-- Corredera: flechas de desplazamiento -->
    <g v-if="dibujo.tipo === 'corredera'" class="apertura flecha">
      <path :d="`M${dibujo.A * 0.18},${dibujo.H / 2} h${dibujo.A * 0.2} m${-dibujo.A * 0.04},${-dibujo.A * 0.03} l${dibujo.A * 0.04},${dibujo.A * 0.03} l${-dibujo.A * 0.04},${dibujo.A * 0.03}`" />
      <path :d="`M${dibujo.A * 0.82},${dibujo.H / 2} h${-dibujo.A * 0.2} m${dibujo.A * 0.04},${-dibujo.A * 0.03} l${-dibujo.A * 0.04},${dibujo.A * 0.03} l${dibujo.A * 0.04},${dibujo.A * 0.03}`" />
    </g>

    <!-- Cotas -->
    <g v-if="!mini" class="cota" :style="{ fontSize: letra + 'px' }">
      <path :d="`M0,${dibujo.H + margen * 0.45} H${dibujo.A} M0,${dibujo.H + margen * 0.3} v${margen * 0.3} M${dibujo.A},${dibujo.H + margen * 0.3} v${margen * 0.3}`" />
      <text :x="dibujo.A / 2" :y="dibujo.H + margen * 0.9" text-anchor="middle">{{ numero(ancho, 0) }}</text>
      <path :d="`M${dibujo.A + margen * 0.45},0 V${dibujo.H} M${dibujo.A + margen * 0.3},0 h${margen * 0.3} M${dibujo.A + margen * 0.3},${dibujo.H} h${margen * 0.3}`" />
      <text :x="dibujo.A + margen * 0.62" :y="dibujo.H / 2" text-anchor="middle" dominant-baseline="middle"
            :transform="`rotate(-90 ${dibujo.A + margen * 0.62} ${dibujo.H / 2})`">{{ numero(alto, 0) }}</text>
    </g>
  </svg>
  <div v-else class="sin-dibujo mudo peq">Sin dibujo: revisa las medidas</div>
</template>

<style scoped>
.dibujo { width: 100%; height: 100%; display: block; }
.perfil { fill: var(--perfil); stroke: var(--pvc-borde); stroke-width: var(--trazo); }
.hueco { fill: var(--superficie-2); stroke: var(--pvc-borde); stroke-width: var(--trazo); }
.cristal { fill: var(--cristal); stroke: var(--pvc-borde); stroke-width: var(--trazo); }
.manilla { fill: var(--pvc-borde); }
.apertura { fill: none; stroke: var(--texto-2); stroke-width: var(--trazo); stroke-dasharray: calc(var(--trazo) * 6) calc(var(--trazo) * 4); }
.flecha { stroke-dasharray: none; stroke-linecap: round; stroke-linejoin: round; stroke-width: calc(var(--trazo) * 1.4); }
.cota path { stroke: var(--texto-3); stroke-width: var(--trazo); fill: none; }
.cota text { fill: var(--texto-2); font-variant-numeric: tabular-nums; }
.sin-dibujo { display: grid; place-items: center; height: 100%; min-height: 60px; text-align: center; }
@media print { .cristal { fill: #e6eff6; } .hueco { fill: #fff; } }
</style>
