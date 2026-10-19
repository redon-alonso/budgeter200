<script setup>
// Edita una línea del presupuesto. La línea es un objeto reactivo del estado
// compartido, así que los cambios se guardan y recalculan al momento.
import { computed, watch } from 'vue'
import { seriesCompatibles, FAMILIAS } from '../core/despiece.js'
import { calcularLinea } from '../core/precios.js'
import { euros, numero, porcentaje, unidad } from '../core/formato.js'
import DibujoVentana from './DibujoVentana.vue'

const props = defineProps({
  linea: { type: Object, required: true },
  catalogo: { type: Object, required: true },
  presupuesto: { type: Object, required: true },
})
defineEmits(['cerrar'])

const series = computed(() => seriesCompatibles(props.catalogo, props.linea.tipologiaId))
const serie = computed(() => props.catalogo.series.find((s) => s.id === props.linea.serieId))
const tipologia = computed(() => props.catalogo.tipologias.find((t) => t.id === props.linea.tipologiaId))
const vidrios = computed(() => props.catalogo.articulos.filter((a) => a.familia === 'vidrio'))
const color = computed(() => props.catalogo.colores.find((c) => c.id === props.linea.colorId))

// Al cambiar a una tipología que la serie actual no admite, pasa a la primera compatible
watch(() => props.linea.tipologiaId, () => {
  if (!series.value.some((s) => s.id === props.linea.serieId) && series.value[0]) {
    props.linea.serieId = series.value[0].id
  }
}, { immediate: true })

const resultado = computed(() => {
  try {
    return { ok: true, ...calcularLinea(props.catalogo, props.presupuesto, props.linea) }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

const grupos = computed(() => {
  if (!resultado.value.ok) return []
  const partidas = resultado.value.unidad.partidas
  return FAMILIAS.map((f) => ({
    ...f, partidas: partidas.filter((p) => p.familia === f.id),
    total: resultado.value.unidad.porFamilia[f.id],
  })).filter((g) => g.partidas.length)
})

const beneficioPropio = computed({
  get: () => props.linea.beneficioPct !== null && props.linea.beneficioPct !== undefined,
  set: (v) => { props.linea.beneficioPct = v ? props.presupuesto.beneficioPct : null },
})
</script>

<template>
  <section class="tarjeta configurador">
    <div class="fila cab">
      <h2>{{ linea.referencia || 'Ventana sin nombre' }}</h2>
      <span class="espacio" />
      <button class="primario" @click="$emit('cerrar')">Hecho</button>
    </div>

    <div class="cuerpo">
      <div class="formulario">
        <label class="campo">Referencia / estancia
          <input v-model="linea.referencia" placeholder="Ej.: Salón" />
        </label>
        <label class="campo">Tipología
          <select v-model="linea.tipologiaId">
            <option v-for="t in catalogo.tipologias" :key="t.id" :value="t.id">{{ t.nombre }}</option>
          </select>
        </label>
        <label class="campo">Serie
          <select v-model="linea.serieId">
            <option v-for="s in series" :key="s.id" :value="s.id">{{ s.nombre }}</option>
          </select>
        </label>
        <div class="dos">
          <label class="campo">Ancho (mm)
            <input v-model.number="linea.ancho" type="number" min="300" max="4000" step="10" />
          </label>
          <label class="campo">Alto (mm)
            <input v-model.number="linea.alto" type="number" min="300" max="3000" step="10" />
          </label>
        </div>
        <label class="campo">Vidrio
          <select v-model="linea.vidrioRef">
            <option v-for="v in vidrios" :key="v.ref" :value="v.ref">{{ v.nombre }} — {{ euros(v.precio) }}/m²</option>
          </select>
        </label>
        <label class="campo">Color
          <select v-model="linea.colorId">
            <option v-for="c in catalogo.colores" :key="c.id" :value="c.id">
              {{ c.nombre }}{{ c.suplemento ? ` (+${c.suplemento} % perfil)` : '' }}
            </option>
          </select>
        </label>
        <div class="dos">
          <label class="campo">Unidades
            <input v-model.number="linea.cantidad" type="number" min="1" step="1" />
          </label>
          <label class="campo">
            <span><input v-model="beneficioPropio" type="checkbox" /> Beneficio propio %</span>
            <input v-if="beneficioPropio" v-model.number="linea.beneficioPct" type="number" min="0" max="300" step="1" />
            <span v-else class="mudo peq heredado">General: {{ presupuesto.beneficioPct }} %</span>
          </label>
        </div>
      </div>

      <div class="plano">
        <DibujoVentana :serie="serie" :tipologia="tipologia" :ancho="linea.ancho || 0" :alto="linea.alto || 0"
                       :color="color?.hex" />
      </div>
    </div>

    <p v-if="!resultado.ok" class="aviso error">{{ resultado.error }}</p>
    <template v-else>
      <div class="resumen">
        <div><span class="sec peq">Coste unidad</span><strong>{{ euros(resultado.unidad.coste) }}</strong></div>
        <div><span class="sec peq">Coste por m²</span><strong>{{ euros(resultado.unidad.coste / resultado.unidad.superficie) }}</strong></div>
        <div><span class="sec peq">Precio unidad</span><strong>{{ euros(resultado.precioUnitario) }}</strong></div>
        <div><span class="sec peq">Beneficio línea</span>
          <strong :class="{ negativo: resultado.beneficio < 0 }">{{ euros(resultado.beneficio) }}</strong></div>
        <div><span class="sec peq">Superficie</span><strong>{{ numero(resultado.unidad.superficie, 2) }} m²</strong></div>
      </div>

      <details class="despiece">
        <summary>Despiece de una unidad ({{ resultado.unidad.partidas.length }} partidas)</summary>
        <div class="tabla-env">
          <table>
            <thead>
              <tr><th>Ref.</th><th>Artículo</th><th>Concepto</th><th class="num">Neto</th><th class="num">Con merma</th>
                <th class="num">Precio</th><th class="num">Importe</th></tr>
            </thead>
            <tbody v-for="g in grupos" :key="g.id">
              <tr class="grupo"><td colspan="6">{{ g.nombre }}</td><td class="num">{{ euros(g.total) }}</td></tr>
              <tr v-for="p in g.partidas" :key="p.ref + p.concepto">
                <td class="mudo peq">{{ p.ref }}</td>
                <td>{{ p.nombre }}</td>
                <td class="sec peq">{{ p.concepto }}</td>
                <td class="num">{{ numero(p.cantidadNeta, 3) }} {{ unidad(p.unidad) }}</td>
                <td class="num">{{ numero(p.cantidad, 3) }} {{ unidad(p.unidad) }}</td>
                <td class="num">{{ euros(p.precioUnit) }}</td>
                <td class="num">{{ euros(p.importe) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr><td colspan="6">Coste total unidad</td><td class="num">{{ euros(resultado.unidad.coste) }}</td></tr>
            </tfoot>
          </table>
        </div>
        <p class="mudo peq">
          Medidas de hoja: {{ resultado.unidad.geometria.hojas.map((h) => `${numero(h.ancho, 0)}×${numero(h.alto, 0)}`).join(' · ') || '—' }} mm ·
          Vidrios: {{ resultado.unidad.geometria.vidrios.map((v) => `${numero(v.ancho, 0)}×${numero(v.alto, 0)}`).join(' · ') }} mm ·
          Recargo aplicado: {{ porcentaje(resultado.beneficioPct) }}
        </p>
      </details>
    </template>
  </section>
</template>

<style scoped>
.configurador { border-color: var(--acento); }
.cab { margin-bottom: 14px; }
.cuerpo { display: grid; grid-template-columns: minmax(260px, 340px) 1fr; gap: 20px; }
.formulario { display: flex; flex-direction: column; gap: 10px; }
.dos { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.heredado { padding: 7px 0; }
.plano { min-height: 300px; max-height: 440px; background: var(--superficie-2); border-radius: 6px; padding: 12px; }
.resumen { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin: 16px 0 8px; }
.resumen div { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; background: var(--superficie-2); border-radius: 6px; }
.resumen strong { font-size: 1.1rem; font-variant-numeric: tabular-nums; }
.negativo { color: var(--peligro); }
.despiece summary { cursor: pointer; padding: 8px 0; font-weight: 600; color: var(--acento); }
tr.grupo td { background: var(--superficie-2); font-weight: 600; font-size: 0.85rem; }
@media (max-width: 760px) { .cuerpo { grid-template-columns: 1fr; } }
</style>
