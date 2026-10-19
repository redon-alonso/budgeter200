<script setup>
import { computed } from 'vue'
import { useDatos } from '../composables/useDatos.js'
import { useRuta } from '../composables/useRuta.js'
import { calcularPresupuesto } from '../core/precios.js'
import { euros, porcentaje } from '../core/formato.js'
import BotonBorrar from './BotonBorrar.vue'

const { estado, catalogo, crearPresupuesto, duplicarPresupuesto, borrarPresupuesto, restaurarTodo } = useDatos()
const { ir } = useRuta()

const filas = computed(() => estado.presupuestos.map((p) => ({ p, c: calcularPresupuesto(catalogo.value, p) })))
const totales = computed(() => {
  const vivos = filas.value.filter((f) => f.p.estado !== 'rechazado')
  const base = vivos.reduce((s, f) => s + f.c.base, 0)
  const beneficio = vivos.reduce((s, f) => s + f.c.beneficio, 0)
  return { base, beneficio, margen: base > 0 ? (beneficio / base) * 100 : 0, n: vivos.length }
})

function nuevo() { ir('presupuesto', crearPresupuesto().id) }
function duplicar(id) { const c = duplicarPresupuesto(id); if (c) ir('presupuesto', c.id) }
</script>

<template>
  <div class="pila">
    <div class="fila">
      <h1>Presupuestos</h1>
      <span class="espacio" />
      <button class="primario" @click="nuevo">+ Nuevo presupuesto</button>
    </div>

    <div class="resumen">
      <div class="tarjeta"><span class="sec peq">Presupuestos activos</span><strong>{{ totales.n }}</strong></div>
      <div class="tarjeta"><span class="sec peq">Importe ofertado (sin IVA)</span><strong>{{ euros(totales.base) }}</strong></div>
      <div class="tarjeta"><span class="sec peq">Beneficio previsto</span><strong>{{ euros(totales.beneficio) }}</strong></div>
      <div class="tarjeta"><span class="sec peq">Margen medio</span><strong>{{ porcentaje(totales.margen) }}</strong></div>
    </div>

    <section class="tarjeta">
      <div class="tabla-env">
        <table>
          <thead>
            <tr><th>Número</th><th>Cliente / obra</th><th>Fecha</th><th>Estado</th><th class="num">Uds</th>
              <th class="num">Coste</th><th class="num">Total sin IVA</th><th class="num">Margen</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="{ p, c } in filas" :key="p.id" class="clicable" @click="ir('presupuesto', p.id)">
              <td><strong>{{ p.numero }}</strong></td>
              <td>{{ p.cliente.nombre || 'Sin cliente' }}<div class="mudo peq">{{ p.obra }}</div></td>
              <td>{{ p.fecha }}</td>
              <td><span class="chip">{{ p.estado }}</span></td>
              <td class="num">{{ c.unidades }}</td>
              <td class="num">{{ euros(c.coste) }}</td>
              <td class="num"><strong>{{ euros(c.base) }}</strong></td>
              <td class="num"><span class="chip" :class="c.margenPct < p.margenMinimoPct ? 'mal' : 'ok'">{{ porcentaje(c.margenPct) }}</span></td>
              <td class="acciones" @click.stop>
                <button class="mini" @click="duplicar(p.id)">Duplicar</button>
                <BotonBorrar mini @borrar="borrarPresupuesto(p.id)" />
              </td>
            </tr>
            <tr v-if="!filas.length"><td colspan="9" class="mudo vacio">No hay presupuestos. Crea el primero.</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <p class="mudo peq pie">
      Los datos se guardan en este navegador.
      <BotonBorrar mini texto="Restaurar datos de demostración" @borrar="restaurarTodo" />
    </p>
  </div>
</template>

<style scoped>
.resumen { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
.resumen .tarjeta { display: flex; flex-direction: column; gap: 4px; }
.resumen strong { font-size: 1.35rem; font-variant-numeric: tabular-nums; }
.clicable { cursor: pointer; }
.acciones { white-space: nowrap; text-align: right; }
.acciones button + * { margin-left: 4px; }
.vacio { text-align: center; padding: 28px; }
.pie { display: flex; align-items: center; gap: 10px; }
</style>
