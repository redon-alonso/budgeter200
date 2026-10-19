<script setup>
// Barra apilada 100 % del precio de venta (sin IVA): cuánto se lleva cada familia
// de coste y cuánto queda de beneficio. La tabla hace de leyenda y de vista accesible.
import { computed, ref } from 'vue'
import { FAMILIAS } from '../core/despiece.js'
import { euros, porcentaje } from '../core/formato.js'

const props = defineProps({
  porFamilia: { type: Object, required: true },
  beneficio: { type: Number, required: true },
  base: { type: Number, required: true },
})

const perdida = computed(() => props.beneficio < 0)
const segmentos = computed(() => {
  const s = FAMILIAS.map((f) => ({ id: f.id, nombre: f.nombre, importe: props.porFamilia[f.id] ?? 0 }))
  if (!perdida.value) s.push({ id: 'beneficio', nombre: 'Beneficio', importe: props.beneficio })
  // Con pérdidas la barra representa el coste (que supera a la venta)
  const total = s.reduce((a, x) => a + x.importe, 0)
  return s.map((x) => ({ ...x, pct: total > 0 ? (x.importe / total) * 100 : 0 }))
})
const activo = ref(null)
const seg = computed(() => segmentos.value.find((s) => s.id === activo.value))
</script>

<template>
  <div class="desglose">
    <div class="tooltip peq" aria-hidden="true">
      <template v-if="seg"><strong>{{ seg.nombre }}</strong> · {{ euros(seg.importe) }} · {{ porcentaje(seg.pct) }}</template>
      <span v-else class="mudo">Pasa el ratón por la barra para ver cada parte</span>
    </div>
    <div class="barra" role="presentation" @mouseleave="activo = null">
      <div v-for="s in segmentos.filter((x) => x.pct > 0)" :key="s.id" class="seg"
           :class="{ atenuado: activo && activo !== s.id }"
           :style="{ width: s.pct + '%', background: `var(--s-${s.id})` }"
           @mouseenter="activo = s.id" />
    </div>
    <p v-if="perdida" class="aviso error peq">
      Con esta rebaja vendes por debajo de coste: pierdes {{ euros(-beneficio) }}. La barra muestra el reparto del coste.
    </p>
    <table class="leyenda">
      <thead>
        <tr><th>Concepto</th><th class="num">Importe</th><th class="num">% {{ perdida ? 'coste' : 'venta' }}</th></tr>
      </thead>
      <tbody>
        <tr v-for="s in segmentos" :key="s.id" :class="{ resaltado: activo === s.id }"
            @mouseenter="activo = s.id" @mouseleave="activo = null">
          <td><span class="muestra" :style="{ background: `var(--s-${s.id})` }" />{{ s.nombre }}</td>
          <td class="num">{{ euros(s.importe) }}</td>
          <td class="num">{{ porcentaje(s.pct) }}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr><td>Precio de venta (sin IVA)</td><td class="num">{{ euros(base) }}</td><td></td></tr>
      </tfoot>
    </table>
  </div>
</template>

<style scoped>
.tooltip { min-height: 1.4em; margin-bottom: 6px; }
.barra { display: flex; gap: 2px; height: 28px; }
.seg { min-width: 2px; transition: opacity 0.15s; cursor: default; }
.seg:first-child { border-radius: 4px 0 0 4px; }
.seg:last-child { border-radius: 0 4px 4px 0; }
.seg.atenuado { opacity: 0.35; }
.leyenda { margin-top: 12px; }
.leyenda td { padding: 6px 8px; }
.muestra { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 8px; vertical-align: -1px; }
tr.resaltado { background: var(--superficie-2); }
.aviso { margin: 10px 0 0; }
</style>
