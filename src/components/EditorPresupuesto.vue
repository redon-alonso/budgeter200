<script setup>
import { computed, ref } from 'vue'
import { useDatos, nuevaLinea, nuevoId } from '../composables/useDatos.js'
import { useRuta } from '../composables/useRuta.js'
import { calcularPresupuesto } from '../core/precios.js'
import { euros, numero, porcentaje } from '../core/formato.js'
import ConfiguradorVentana from './ConfiguradorVentana.vue'
import DibujoVentana from './DibujoVentana.vue'
import PanelRentabilidad from './PanelRentabilidad.vue'
import BotonBorrar from './BotonBorrar.vue'

const props = defineProps({ presupuesto: { type: Object, required: true } })
const { catalogo, duplicarPresupuesto } = useDatos()
const { ir } = useRuta()

const p = computed(() => props.presupuesto)
const calculo = computed(() => calcularPresupuesto(catalogo.value, p.value))
const resultadoDe = (id) => calculo.value.lineas.find((l) => l.id === id)

const editando = ref(null)
const lineaEditada = computed(() => p.value.lineas.find((l) => l.id === editando.value))

const serieDe = (l) => catalogo.value.series.find((s) => s.id === l.serieId)
const tipDe = (l) => catalogo.value.tipologias.find((t) => t.id === l.tipologiaId)
const colorDe = (l) => catalogo.value.colores.find((c) => c.id === l.colorId)
const vidrioDe = (l) => catalogo.value.articulos.find((a) => a.ref === l.vidrioRef)

function anadir() {
  // La nueva ventana hereda serie, vidrio y color de la última: lo habitual en una obra
  const ultima = p.value.lineas.at(-1)
  const l = nuevaLinea(ultima ? { serieId: ultima.serieId, vidrioRef: ultima.vidrioRef, colorId: ultima.colorId } : {})
  p.value.lineas.push(l)
  editando.value = l.id
}
function duplicarLinea(l) {
  const i = p.value.lineas.indexOf(l)
  p.value.lineas.splice(i + 1, 0, { ...l, id: nuevoId(), referencia: l.referencia ? `${l.referencia} (copia)` : '' })
}
function borrarLinea(l) {
  if (editando.value === l.id) editando.value = null
  p.value.lineas.splice(p.value.lineas.indexOf(l), 1)
}
function duplicar() {
  const c = duplicarPresupuesto(p.value.id)
  if (c) ir('presupuesto', c.id)
}
</script>

<template>
  <div class="editor">
    <div class="fila titulo">
      <a href="#/presupuestos" class="sec">← Presupuestos</a>
      <h1>{{ p.numero }}</h1>
      <select v-model="p.estado" class="estado" aria-label="Estado">
        <option value="borrador">Borrador</option>
        <option value="enviado">Enviado</option>
        <option value="aceptado">Aceptado</option>
        <option value="rechazado">Rechazado</option>
      </select>
      <span class="espacio" />
      <button @click="duplicar">Duplicar como versión B</button>
      <button class="primario" @click="ir('presupuesto', p.id, 'imprimir')">Ver PDF / imprimir</button>
    </div>

    <div class="columnas">
      <div class="pila">
        <details class="tarjeta" :open="!p.cliente.nombre">
          <summary><strong>Cliente:</strong> {{ p.cliente.nombre || 'sin indicar' }}
            <span v-if="p.obra" class="sec"> · {{ p.obra }}</span></summary>
          <div class="rejilla datos">
            <label class="campo">Nombre / razón social <input v-model="p.cliente.nombre" /></label>
            <label class="campo">NIF / CIF <input v-model="p.cliente.nif" /></label>
            <label class="campo">Teléfono <input v-model="p.cliente.telefono" /></label>
            <label class="campo">Email <input v-model="p.cliente.email" type="email" /></label>
            <label class="campo">Dirección <input v-model="p.cliente.direccion" /></label>
            <label class="campo">Obra <input v-model="p.obra" /></label>
            <label class="campo">Fecha <input v-model="p.fecha" type="date" /></label>
          </div>
        </details>

        <ConfiguradorVentana v-if="lineaEditada" :linea="lineaEditada" :catalogo="catalogo" :presupuesto="p"
                             @cerrar="editando = null" />

        <section class="tarjeta">
          <div class="fila">
            <h2>Ventanas y puertas</h2>
            <span class="sec peq">{{ calculo.unidades }} unidades</span>
            <span class="espacio" />
            <button class="primario" @click="anadir">+ Añadir ventana</button>
          </div>
          <div class="tabla-env">
            <table class="lineas">
              <thead>
                <tr><th></th><th>Ventana</th><th class="num">Medidas</th><th class="num">Uds</th>
                  <th class="num">Coste ud</th><th class="num">Precio ud</th><th class="num">Total</th>
                  <th class="num">Margen</th><th></th></tr>
              </thead>
              <tbody>
                <tr v-for="l in p.lineas" :key="l.id" :class="{ seleccionada: editando === l.id }"
                    @click="editando = l.id">
                  <td class="miniatura">
                    <DibujoVentana mini :serie="serieDe(l)" :tipologia="tipDe(l)" :ancho="l.ancho || 0"
                                   :alto="l.alto || 0" :color="colorDe(l)?.hex" />
                  </td>
                  <td>
                    <strong>{{ l.referencia || 'Sin nombre' }}</strong>
                    <div class="sec peq">{{ tipDe(l)?.nombre }} · {{ serieDe(l)?.nombre }}</div>
                    <div class="mudo peq">{{ vidrioDe(l)?.nombre }} · {{ colorDe(l)?.nombre }}</div>
                  </td>
                  <td class="num">{{ numero(l.ancho, 0) }} × {{ numero(l.alto, 0) }}</td>
                  <template v-if="resultadoDe(l.id)?.ok">
                    <td class="num">{{ resultadoDe(l.id).cantidad }}</td>
                    <td class="num">{{ euros(resultadoDe(l.id).unidad.coste) }}</td>
                    <td class="num">{{ euros(resultadoDe(l.id).precioUnitario) }}</td>
                    <td class="num"><strong>{{ euros(resultadoDe(l.id).base) }}</strong></td>
                    <td class="num">
                      <span class="chip" :class="resultadoDe(l.id).margenPct < p.margenMinimoPct ? 'mal' : 'ok'">
                        {{ porcentaje(resultadoDe(l.id).margenPct) }}
                      </span>
                      <div v-if="l.beneficioPct !== null && l.beneficioPct !== undefined" class="mudo peq">recargo {{ l.beneficioPct }} %</div>
                    </td>
                  </template>
                  <td v-else colspan="5" class="error-linea peq">{{ resultadoDe(l.id)?.error }}</td>
                  <td class="acciones" @click.stop>
                    <button class="mini" title="Duplicar" @click="duplicarLinea(l)">Duplicar</button>
                    <BotonBorrar mini @borrar="borrarLinea(l)" />
                  </td>
                </tr>
                <tr v-if="!p.lineas.length">
                  <td colspan="9" class="mudo vacio">Todavía no hay ventanas. Pulsa «Añadir ventana».</td>
                </tr>
              </tbody>
              <tfoot v-if="p.lineas.length">
                <tr>
                  <td colspan="6">Total sin IVA</td>
                  <td class="num">{{ euros(calculo.base) }}</td>
                  <td class="num">{{ porcentaje(calculo.margenPct) }}</td><td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      </div>

      <PanelRentabilidad :presupuesto="p" :calculo="calculo" />
    </div>
  </div>
</template>

<style scoped>
.titulo { margin-bottom: 16px; }
.estado { width: auto; }
.columnas { display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: 20px; align-items: start; }
details summary { cursor: pointer; }
.datos { margin-top: 14px; }
.lineas tbody tr { cursor: pointer; }
.lineas tr.seleccionada { background: var(--acento-suave); }
.miniatura { width: 64px; height: 64px; padding: 4px; }
.miniatura :deep(svg) { width: 56px; height: 56px; }
.acciones { white-space: nowrap; text-align: right; }
.acciones button + * { margin-left: 4px; }
.error-linea { color: var(--peligro); }
.vacio { text-align: center; padding: 28px; }
@media (max-width: 1080px) { .columnas { grid-template-columns: 1fr; } }
</style>
