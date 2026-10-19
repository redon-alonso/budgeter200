<script setup>
// Panel lateral para jugar con el presupuesto: recargo, rebaja, margen mínimo,
// simulación de precio objetivo y reparto del dinero.
import { computed, ref } from 'vue'
import { beneficioNecesario } from '../core/precios.js'
import { euros, porcentaje, numero } from '../core/formato.js'
import DesgloseDinero from './DesgloseDinero.vue'

const props = defineProps({
  presupuesto: { type: Object, required: true },
  calculo: { type: Object, required: true },
})
const p = computed(() => props.presupuesto)
const c = computed(() => props.calculo)

const bajoMinimo = computed(() => c.value.base > 0 && c.value.margenPct < p.value.margenMinimoPct)
const recargoParaMinimo = computed(() => beneficioNecesario(p.value.margenMinimoPct, p.value.descuentoPct))
const hayLineasPropias = computed(() => p.value.lineas.some((l) => l.beneficioPct !== null && l.beneficioPct !== undefined))

const acotar = (v, min, max) => Math.min(max, Math.max(min, Number.isFinite(v) ? v : min))
const fijar = (campo, v, min, max) => { p.value[campo] = Math.round(acotar(v, min, max) * 10) / 10 }

// Simulador: «el cliente quiere pagar X sin IVA»
const objetivo = ref(null)
const simulacion = computed(() => {
  const x = objetivo.value
  if (!(x > 0) || c.value.tarifa <= 0) return null
  const rebaja = (1 - x / c.value.tarifa) * 100
  const margen = ((x - c.value.coste) / x) * 100
  return { rebaja, margen, beneficio: x - c.value.coste }
})
function aplicarSimulacion() {
  const s = simulacion.value
  if (!s) return
  if (s.rebaja >= 0) fijar('descuentoPct', s.rebaja, 0, 100)
  else {
    // Precio por encima de tarifa: subir el recargo y quitar la rebaja
    fijar('beneficioPct', (objetivo.value / c.value.coste - 1) * 100, 0, 300)
    p.value.descuentoPct = 0
  }
  objetivo.value = null
}
</script>

<template>
  <aside class="panel pila">
    <section class="tarjeta">
      <h2>Rentabilidad</h2>

      <div class="control">
        <div class="fila"><label for="ben">Beneficio (recargo sobre coste)</label><span class="espacio" />
          <input id="ben-n" type="number" :value="p.beneficioPct" min="0" max="300" step="1" aria-label="Beneficio %"
                 @change="fijar('beneficioPct', +$event.target.value, 0, 300)" /> %</div>
        <input id="ben" type="range" min="0" max="100" step="1" :value="p.beneficioPct"
               @input="fijar('beneficioPct', +$event.target.value, 0, 300)" />
        <p v-if="hayLineasPropias" class="mudo peq">Algunas líneas tienen su propio recargo y no siguen este valor.</p>
      </div>

      <div class="control">
        <div class="fila"><label for="reb">Rebaja al cliente</label><span class="espacio" />
          <input type="number" :value="p.descuentoPct" min="0" max="100" step="0.5" aria-label="Rebaja %"
                 @change="fijar('descuentoPct', +$event.target.value, 0, 100)" /> %</div>
        <input id="reb" type="range" min="0" max="50" step="0.5" :value="p.descuentoPct"
               @input="fijar('descuentoPct', +$event.target.value, 0, 100)" />
      </div>

      <div class="fila ajustes">
        <label class="campo">Margen mínimo %
          <input type="number" :value="p.margenMinimoPct" min="0" max="90" step="1"
                 @change="fijar('margenMinimoPct', +$event.target.value, 0, 90)" />
        </label>
        <label class="campo">IVA
          <select v-model.number="p.ivaPct">
            <option :value="21">21 %</option>
            <option :value="10">10 % (reforma vivienda)</option>
            <option :value="0">Exento</option>
          </select>
        </label>
      </div>

      <dl class="cifras">
        <dt>Coste de fabricación</dt><dd>{{ euros(c.coste) }}</dd>
        <dt>Precio de tarifa</dt><dd>{{ euros(c.tarifa) }}</dd>
        <dt>Rebaja</dt><dd>− {{ euros(c.descuento) }}</dd>
        <dt class="fuerte">Base imponible</dt><dd class="fuerte">{{ euros(c.base) }}</dd>
        <dt>IVA {{ p.ivaPct }} %</dt><dd>{{ euros(c.iva) }}</dd>
        <dt class="total">Total cliente</dt><dd class="total">{{ euros(c.total) }}</dd>
      </dl>

      <div class="kpis">
        <div><span class="sec peq">Beneficio</span>
          <strong :class="{ negativo: c.beneficio < 0 }">{{ euros(c.beneficio) }}</strong></div>
        <div><span class="sec peq">Margen s/ venta</span>
          <strong :class="{ negativo: bajoMinimo }">{{ porcentaje(c.margenPct) }}</strong></div>
        <div><span class="sec peq">Recargo real</span><strong>{{ porcentaje(c.recargoRealPct) }}</strong></div>
      </div>

      <p v-if="bajoMinimo" class="aviso error peq">
        ⚠ Margen por debajo del mínimo ({{ p.margenMinimoPct }} %). Con esta rebaja necesitas un recargo de al menos
        {{ porcentaje(recargoParaMinimo) }}.
      </p>
      <p class="aviso atencion peq">
        Rebaja máxima manteniendo un margen del {{ p.margenMinimoPct }} %:
        <strong>{{ porcentaje(c.descuentoMaximoPct) }}</strong>
        <button class="mini aplicar" :disabled="c.base <= 0" @click="fijar('descuentoPct', Math.floor(c.descuentoMaximoPct * 10) / 10, 0, 100)">Aplicar</button>
      </p>
    </section>

    <section class="tarjeta">
      <h2>¿Y si el cliente pide un precio?</h2>
      <label class="campo sim">Precio objetivo sin IVA (€)
        <input v-model.number="objetivo" type="number" min="0" step="10" :placeholder="numero(c.base, 0)" />
      </label>
      <template v-if="simulacion">
        <dl class="cifras">
          <dt>{{ simulacion.rebaja >= 0 ? 'Rebaja necesaria' : 'Supera la tarifa en' }}</dt>
          <dd>{{ porcentaje(Math.abs(simulacion.rebaja)) }}</dd>
          <dt>Beneficio resultante</dt>
          <dd :class="{ negativo: simulacion.beneficio < 0 }">{{ euros(simulacion.beneficio) }}</dd>
          <dt>Margen resultante</dt>
          <dd :class="{ negativo: simulacion.margen < p.margenMinimoPct }">{{ porcentaje(simulacion.margen) }}</dd>
        </dl>
        <p v-if="simulacion.margen < p.margenMinimoPct" class="aviso error peq">No conviene: queda por debajo del margen mínimo.</p>
        <button class="primario" @click="aplicarSimulacion">Aplicar al presupuesto</button>
      </template>
    </section>

    <section class="tarjeta">
      <h2>¿Dónde va el dinero?</h2>
      <DesgloseDinero :por-familia="c.porFamilia" :beneficio="c.beneficio" :base="c.base" />
    </section>
  </aside>
</template>

<style scoped>
.panel { position: sticky; top: 72px; }
h2 { margin-bottom: 12px; }
.control { margin-bottom: 14px; }
.control label { font-size: 0.9rem; }
.control input[type='number'] { width: 72px; }
.ajustes { align-items: flex-end; margin-bottom: 12px; }
.ajustes .campo { flex: 1; }
.cifras { display: grid; grid-template-columns: 1fr auto; gap: 6px 12px; margin: 12px 0; }
.cifras dt { color: var(--texto-2); }
.cifras dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums; }
.fuerte { font-weight: 600; color: var(--texto) !important; border-top: 1px solid var(--borde); padding-top: 6px; }
.total { font-weight: 700; font-size: 1.15rem; color: var(--texto) !important; }
.kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
.kpis div { display: flex; flex-direction: column; padding: 8px 10px; background: var(--superficie-2); border-radius: 6px; }
.kpis strong { font-variant-numeric: tabular-nums; }
.negativo { color: var(--peligro); }
.aviso { margin: 8px 0 0; }
.aplicar { margin-left: 6px; }
.sim { margin-bottom: 4px; }
@media (max-width: 1080px) { .panel { position: static; } }
</style>
