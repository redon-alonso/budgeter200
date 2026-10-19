<script setup>
// Documento para el cliente. Muestra tarifa, rebaja e IVA; nunca costes ni márgenes.
// «Guardar como PDF» se hace desde el diálogo de impresión del navegador.
import { computed } from 'vue'
import { useDatos } from '../composables/useDatos.js'
import { useRuta } from '../composables/useRuta.js'
import { calcularPresupuesto } from '../core/precios.js'
import { euros, numero } from '../core/formato.js'
import DibujoVentana from './DibujoVentana.vue'

const props = defineProps({ presupuesto: { type: Object, required: true } })
const { catalogo } = useDatos()
const { ir } = useRuta()

const p = computed(() => props.presupuesto)
const c = computed(() => calcularPresupuesto(catalogo.value, p.value))
const empresa = computed(() => catalogo.value.empresa)

const filas = computed(() => p.value.lineas.map((l) => {
  const r = c.value.lineas.find((x) => x.id === l.id)
  return {
    l, r,
    serie: catalogo.value.series.find((s) => s.id === l.serieId),
    tip: catalogo.value.tipologias.find((t) => t.id === l.tipologiaId),
    color: catalogo.value.colores.find((x) => x.id === l.colorId),
    vidrio: catalogo.value.articulos.find((a) => a.ref === l.vidrioRef),
  }
}).filter((f) => f.r?.ok))
const errores = computed(() => c.value.lineas.filter((l) => !l.ok).length)

function imprimir() {
  // El nombre del PDF sale del título de la página
  const anterior = document.title
  document.title = `Presupuesto ${p.value.numero}`
  window.print()
  document.title = anterior
}

const fechaLarga = (iso) => {
  const d = new Date(iso + 'T00:00:00')
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}
</script>

<template>
  <div class="barra no-imprimir fila">
    <button @click="ir('presupuesto', p.id)">← Volver al editor</button>
    <span class="espacio" />
    <span class="sec peq">En el diálogo elige «Guardar como PDF»</span>
    <button class="primario" @click="imprimir">Imprimir / Guardar PDF</button>
  </div>
  <p v-if="errores" class="aviso error no-imprimir">
    {{ errores }} línea(s) con errores no aparecen en el documento. Corrígelas en el editor.
  </p>

  <article class="documento tarjeta">
    <header class="cab">
      <div>
        <h1>{{ empresa.nombre }}</h1>
        <div class="sec peq">{{ empresa.direccion }} · NIF {{ empresa.nif }}<br />{{ empresa.telefono }} · {{ empresa.email }}</div>
      </div>
      <div class="ident">
        <div class="etiqueta">PRESUPUESTO</div>
        <div class="numero">{{ p.numero }}</div>
        <div class="sec peq">{{ fechaLarga(p.fecha) }}</div>
      </div>
    </header>

    <section class="cliente">
      <div class="etiqueta">Cliente</div>
      <strong>{{ p.cliente.nombre || '—' }}</strong>
      <div class="sec peq">
        <span v-if="p.cliente.nif">NIF {{ p.cliente.nif }} · </span>{{ p.cliente.direccion }}
        <span v-if="p.cliente.telefono"> · {{ p.cliente.telefono }}</span>
      </div>
      <div v-if="p.obra" class="peq">Obra: {{ p.obra }}</div>
    </section>

    <table class="lineas">
      <thead>
        <tr><th></th><th>Descripción</th><th class="num">Medidas (mm)</th><th class="num">Uds</th>
          <th class="num">Precio ud</th><th class="num">Importe</th></tr>
      </thead>
      <tbody>
        <tr v-for="f in filas" :key="f.l.id">
          <td class="dib">
            <DibujoVentana :serie="f.serie" :tipologia="f.tip" :ancho="f.l.ancho" :alto="f.l.alto" :color="f.color?.hex" />
          </td>
          <td>
            <strong>{{ f.l.referencia || f.tip.nombre }}</strong>
            <div class="peq">{{ f.tip.nombre }} · {{ f.serie.nombre }}</div>
            <div class="sec peq">{{ f.vidrio?.nombre }} · {{ f.color?.nombre }}</div>
          </td>
          <td class="num">{{ numero(f.l.ancho, 0) }} × {{ numero(f.l.alto, 0) }}</td>
          <td class="num">{{ f.r.cantidad }}</td>
          <td class="num">{{ euros(f.r.tarifa / f.r.cantidad) }}</td>
          <td class="num">{{ euros(f.r.tarifa) }}</td>
        </tr>
      </tbody>
    </table>

    <dl class="totales">
      <template v-if="c.descuento > 0">
        <dt>Suma</dt><dd>{{ euros(c.tarifa) }}</dd>
        <dt>Descuento {{ numero(p.descuentoPct, 1) }} %</dt><dd>− {{ euros(c.descuento) }}</dd>
      </template>
      <dt>Base imponible</dt><dd>{{ euros(c.base) }}</dd>
      <dt>IVA {{ p.ivaPct }} %</dt><dd>{{ euros(c.iva) }}</dd>
      <dt class="total">TOTAL</dt><dd class="total">{{ euros(c.total) }}</dd>
    </dl>

    <section class="condiciones peq">
      <div class="etiqueta">Condiciones</div>
      <ul><li v-for="t in empresa.condiciones" :key="t">{{ t }}</li></ul>
      <div class="firmas">
        <div>Aceptado por el cliente<br /><span class="mudo">Fecha y firma</span></div>
      </div>
    </section>
  </article>
</template>

<style scoped>
.barra { margin-bottom: 16px; }
.documento { padding: 36px 40px; }
.cab { display: flex; justify-content: space-between; gap: 24px; padding-bottom: 18px; border-bottom: 2px solid var(--texto); }
.ident { text-align: right; }
.etiqueta { font-size: 0.75rem; letter-spacing: 0.08em; color: var(--texto-3); text-transform: uppercase; margin-bottom: 2px; }
.numero { font-size: 1.3rem; font-weight: 700; }
.cliente { margin: 20px 0; }
.lineas td { vertical-align: top; }
.dib { width: 90px; height: 90px; padding: 6px 4px; }
.dib :deep(svg) { width: 84px; height: 84px; }
.totales { display: grid; grid-template-columns: auto 140px; justify-content: end; gap: 6px 20px; margin: 18px 0 0; }
.totales dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums; }
.totales .total { font-size: 1.2rem; font-weight: 700; border-top: 2px solid var(--texto); padding-top: 6px; }
.condiciones { margin-top: 32px; }
.condiciones ul { margin: 4px 0; padding-left: 18px; color: var(--texto-2); }
.firmas { margin-top: 40px; display: flex; justify-content: flex-end; }
.firmas div { width: 240px; border-top: 1px solid var(--borde); padding-top: 6px; text-align: center; }
@media print {
  .documento { padding: 0; }
  .cab, .totales .total { border-color: #000; }
  .lineas thead { display: table-header-group; }
}
</style>
