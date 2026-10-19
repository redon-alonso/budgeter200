<script setup>
import { computed, ref } from 'vue'
import { useDatos } from '../composables/useDatos.js'
import { FAMILIAS } from '../core/despiece.js'
import { parsearCSV, filasAArticulos, fusionarArticulos, articulosACSV, aNumero } from '../core/importar.js'
import { euros, unidad } from '../core/formato.js'
import BotonBorrar from './BotonBorrar.vue'

const { estado, catalogo, restaurarCatalogo } = useDatos()

const familia = ref('todas')
const buscar = ref('')
const familiasCatalogo = FAMILIAS.filter((f) => f.id !== 'manoObra')
const nombreFamilia = (id) => FAMILIAS.find((f) => f.id === id)?.nombre ?? id

const visibles = computed(() => {
  const q = buscar.value.trim().toLowerCase()
  return estado.articulos.filter((a) =>
    (familia.value === 'todas' || a.familia === familia.value) &&
    (!q || a.ref.toLowerCase().includes(q) || a.nombre.toLowerCase().includes(q)))
})
const cuenta = (f) => estado.articulos.filter((a) => a.familia === f).length

// Nunca guardar algo que no sea un número válido: lo guardado se valida al recargar
function cambiarNumero(a, campo, evento) {
  const v = aNumero(evento.target.value)
  if (Number.isFinite(v) && v >= 0) a[campo] = Math.round(v * 10000) / 10000
  evento.target.value = a[campo] ?? 0
}
function cambiarPrecioHora(evento) {
  const v = aNumero(evento.target.value)
  if (Number.isFinite(v) && v >= 0) estado.precioHora = v
  evento.target.value = estado.precioHora
}

// --- Importar / exportar ---
const mensaje = ref(null)
const entrada = ref(null)
const cargando = ref(false)

async function importar(evento) {
  const fichero = evento.target.files?.[0]
  evento.target.value = ''
  if (!fichero) return
  cargando.value = true
  mensaje.value = null
  try {
    let filas
    if (/\.xlsx?$/i.test(fichero.name)) {
      // SheetJS solo se descarga cuando hace falta
      const XLSX = await import('xlsx')
      const libro = XLSX.read(await fichero.arrayBuffer())
      filas = XLSX.utils.sheet_to_json(libro.Sheets[libro.SheetNames[0]], { header: 1, raw: true, defval: '' })
    } else {
      filas = parsearCSV(await fichero.text())
    }
    const { articulos, errores } = filasAArticulos(filas)
    const r = fusionarArticulos(estado.articulos, articulos)
    if (articulos.length) estado.articulos = r.articulos
    mensaje.value = {
      tipo: errores.length ? (articulos.length ? 'atencion' : 'error') : 'ok',
      texto: `${fichero.name}: ${r.actualizados} actualizados, ${r.anadidos} nuevos${errores.length ? `, ${errores.length} filas con errores` : ''}.`,
      errores: errores.slice(0, 20),
    }
  } catch (e) {
    mensaje.value = { tipo: 'error', texto: `No se pudo leer el fichero: ${e.message}`, errores: [] }
  } finally {
    cargando.value = false
  }
}

function exportar() {
  const blob = new Blob([articulosACSV(estado.articulos)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: 'catalogo-pvc.csv' })
  a.click()
  URL.revokeObjectURL(url)
}

const refsUsadas = computed(() => {
  const s = new Set()
  for (const se of catalogo.value.series) Object.values(se.perfiles).forEach((r) => s.add(r))
  for (const t of catalogo.value.tipologias) t.herrajes.forEach((h) => s.add(h.ref))
  catalogo.value.accesoriosPorVentana.forEach((a) => s.add(a.ref))
  s.add(catalogo.value.junta)
  return s
})
const faltan = computed(() => [...refsUsadas.value].filter((r) => !estado.articulos.some((a) => a.ref === r)))
</script>

<template>
  <div class="pila">
    <div class="fila">
      <h1>Catálogo de artículos</h1>
      <span class="espacio" />
      <input ref="entrada" type="file" accept=".csv,.xlsx,.xls" hidden @change="importar" />
      <button :disabled="cargando" @click="entrada.click()">{{ cargando ? 'Importando…' : 'Importar Excel / CSV' }}</button>
      <button @click="exportar">Exportar CSV</button>
      <BotonBorrar texto="Restaurar precios" @borrar="restaurarCatalogo" />
    </div>

    <div v-if="mensaje" class="aviso" :class="mensaje.tipo === 'ok' ? '' : mensaje.tipo" role="status">
      <div class="fila"><span>{{ mensaje.texto }}</span><span class="espacio" />
        <button class="mini" @click="mensaje = null">Cerrar</button></div>
      <ul v-if="mensaje.errores.length" class="peq"><li v-for="e in mensaje.errores" :key="e">{{ e }}</li></ul>
    </div>
    <p v-if="faltan.length" class="aviso error">
      Faltan artículos que usan las series o tipologías: {{ faltan.join(', ') }}. Los presupuestos que los necesiten mostrarán error.
    </p>

    <section class="tarjeta">
      <div class="fila filtros">
        <button :class="{ primario: familia === 'todas' }" @click="familia = 'todas'">Todas ({{ estado.articulos.length }})</button>
        <button v-for="f in familiasCatalogo" :key="f.id" :class="{ primario: familia === f.id }" @click="familia = f.id">
          {{ f.nombre }} ({{ cuenta(f.id) }})
        </button>
        <span class="espacio" />
        <input v-model="buscar" type="search" placeholder="Buscar referencia o nombre…" aria-label="Buscar" />
      </div>
      <div class="tabla-env">
        <table>
          <thead>
            <tr><th>Referencia</th><th>Artículo</th><th>Familia</th><th>Unidad</th>
              <th class="num">Merma %</th><th class="num">Precio coste</th><th class="num">Coste real*</th></tr>
          </thead>
          <tbody>
            <tr v-for="a in visibles" :key="a.ref">
              <td class="mudo peq">{{ a.ref }}</td>
              <td>{{ a.nombre }}<span v-if="!refsUsadas.has(a.ref) && a.familia !== 'vidrio'" class="chip">sin usar</span></td>
              <td class="sec">{{ nombreFamilia(a.familia) }}</td>
              <td>{{ unidad(a.unidad) }}</td>
              <td class="num"><input type="text" inputmode="decimal" :value="a.merma ?? 0" :aria-label="`Merma ${a.ref}`"
                                     @change="cambiarNumero(a, 'merma', $event)" /></td>
              <td class="num"><input type="text" inputmode="decimal" :value="a.precio" :aria-label="`Precio ${a.ref}`"
                                     @change="cambiarNumero(a, 'precio', $event)" /> €/{{ unidad(a.unidad) }}</td>
              <td class="num">{{ euros(a.precio * (1 + (a.merma ?? 0) / 100)) }}</td>
            </tr>
            <tr v-if="!visibles.length"><td colspan="7" class="mudo">Ningún artículo coincide con la búsqueda.</td></tr>
          </tbody>
        </table>
      </div>
      <p class="mudo peq">* Precio por unidad útil, una vez descontado el desperdicio de corte (merma).</p>
    </section>

    <section class="tarjeta">
      <div class="fila">
        <h2>Mano de obra</h2>
        <label class="fila">Precio hora de taller
          <input class="hora" type="text" inputmode="decimal" :value="estado.precioHora" @change="cambiarPrecioHora" /> €/h
        </label>
      </div>
      <p class="sec peq">
        Cada ventana suma un tiempo fijo según tipología más {{ catalogo.horasPorM2 }} h por m².
      </p>
    </section>

    <section class="tarjeta">
      <h2>Series y tipologías</h2>
      <div class="dos-col">
        <div>
          <h3>Series</h3>
          <table>
            <thead><tr><th>Serie</th><th class="num">Marco</th><th class="num">Solape</th><th class="num">Vista hoja</th></tr></thead>
            <tbody>
              <tr v-for="s in catalogo.series" :key="s.id">
                <td>{{ s.nombre }}</td><td class="num">{{ s.geometria.marco }} mm</td>
                <td class="num">{{ s.geometria.solapeHoja }} mm</td><td class="num">{{ s.geometria.vistaHoja }} mm</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div>
          <h3>Tipologías</h3>
          <table>
            <thead><tr><th>Tipología</th><th class="num">Hojas</th><th class="num">Horas base</th></tr></thead>
            <tbody>
              <tr v-for="t in catalogo.tipologias" :key="t.id">
                <td>{{ t.nombre }}</td><td class="num">{{ t.hojas }}</td><td class="num">{{ t.horasBase }} h</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <details class="tarjeta formato">
      <summary>Formato del fichero de importación</summary>
      <p class="sec peq">Primera fila con cabeceras (en cualquier orden). Se actualiza por <strong>ref</strong>: si existe cambia el precio, si no, se añade.
        Admite separador «;» y decimales con coma. El Excel debe tener los datos en la primera hoja.</p>
      <pre>ref;nombre;familia;unidad;precio;merma;minimom2
P70-MARCO;Marco serie 70;perfil;ml;7,25;10;
V-4164-BE;Vidrio 4/16/4 BE;vidrio;m2;23,50;0;0,5</pre>
      <p class="mudo peq">Familias: perfil, refuerzo, vidrio, herraje, accesorio · Unidades: ml, m2, ud</p>
    </details>
  </div>
</template>

<style scoped>
.filtros { margin-bottom: 12px; }
.filtros input { min-width: 240px; }
td input { width: 80px; text-align: right; font-variant-numeric: tabular-nums; }
.hora { width: 80px; text-align: right; }
.chip { margin-left: 8px; }
.dos-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 12px; }
.dos-col h3 { margin-bottom: 6px; }
.aviso ul { margin: 8px 0 0; padding-left: 20px; }
.aviso:not(.error):not(.atencion) { background: var(--acento-suave); color: var(--acento); }
.formato summary { cursor: pointer; font-weight: 600; }
pre { background: var(--superficie-2); padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 0.85rem; }
@media (max-width: 760px) { .dos-col { grid-template-columns: 1fr; } }
</style>
