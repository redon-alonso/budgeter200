// Estado compartido de la app: catálogo editable y presupuestos.
// Se guarda en localStorage. Para pasar a una base de datos real basta con
// sustituir cargar() y guardar() por llamadas a la API.
import { reactive, computed, watch } from 'vue'
import semilla from '../data/catalogo.json'

const CLAVE = 'pvc-presupuestos-v1'

const clonar = (o) => JSON.parse(JSON.stringify(o))
export const nuevoId = () => Math.random().toString(36).slice(2, 10)

export function nuevaLinea(base = {}) {
  return {
    id: nuevoId(), referencia: '', serieId: 's70', tipologiaId: 'oscilo1',
    ancho: 1200, alto: 1200, vidrioRef: 'V-4164-BE', colorId: 'blanco',
    cantidad: 1, beneficioPct: null, ...base,
  }
}

function presupuestoEjemplo(numero, id = nuevoId()) {
  return {
    id, numero, fecha: new Date().toISOString().slice(0, 10), estado: 'borrador',
    cliente: { nombre: 'Reformas Ejemplo S.L.', nif: 'B00000000', direccion: 'C/ Mayor 1, Madrid', telefono: '600 000 000', email: '' },
    obra: 'Vivienda unifamiliar',
    beneficioPct: 35, descuentoPct: 5, ivaPct: 21, margenMinimoPct: 15,
    lineas: [
      nuevaLinea({ referencia: 'Salón', tipologiaId: 'balcon2', ancho: 1600, alto: 2200, cantidad: 1, vidrioRef: 'V-4164-BEAR' }),
      nuevaLinea({ referencia: 'Dormitorios', tipologiaId: 'oscilo2', ancho: 1200, alto: 1200, cantidad: 3 }),
      nuevaLinea({ referencia: 'Baño', tipologiaId: 'oscilo1', ancho: 600, alto: 800, cantidad: 1, vidrioRef: 'V-33144-SEG' }),
      nuevaLinea({ referencia: 'Cocina', serieId: 'cor', tipologiaId: 'corred2', ancho: 1500, alto: 1100, cantidad: 1 }),
    ],
  }
}

function estadoInicial() {
  return {
    articulos: clonar(semilla.articulos),
    precioHora: semilla.manoObra.precioHora,
    presupuestos: [presupuestoEjemplo('P-2026-001', 'demo')],
  }
}

// Lee y valida lo guardado; si falta algo o está corrupto, vuelve a los datos de serie.
function cargar() {
  const ini = estadoInicial()
  try {
    const raw = localStorage.getItem(CLAVE)
    if (!raw) return ini
    const d = JSON.parse(raw)
    return {
      articulos: Array.isArray(d.articulos) && d.articulos.every((a) => a && a.ref && Number.isFinite(a.precio))
        ? d.articulos : ini.articulos,
      precioHora: Number.isFinite(d.precioHora) ? d.precioHora : ini.precioHora,
      presupuestos: Array.isArray(d.presupuestos) && d.presupuestos.every((p) => p && p.id && Array.isArray(p.lineas))
        ? d.presupuestos : ini.presupuestos,
    }
  } catch {
    return ini
  }
}

const estado = reactive(cargar())

watch(estado, (v) => {
  try { localStorage.setItem(CLAVE, JSON.stringify(v)) } catch { /* modo privado o cuota llena */ }
}, { deep: true })

// Catálogo completo para el motor: estructura fija + precios editables
const catalogo = computed(() => ({
  ...semilla,
  articulos: estado.articulos,
  manoObra: { ...semilla.manoObra, precioHora: estado.precioHora },
}))

export function useDatos() {
  function crearPresupuesto() {
    const año = new Date().getFullYear()
    const n = estado.presupuestos.length + 1
    const p = {
      ...presupuestoEjemplo(`P-${año}-${String(n).padStart(3, '0')}`),
      cliente: { nombre: '', nif: '', direccion: '', telefono: '', email: '' },
      obra: '', lineas: [nuevaLinea()],
    }
    estado.presupuestos.unshift(p)
    return p
  }
  function duplicarPresupuesto(id) {
    const o = estado.presupuestos.find((p) => p.id === id)
    if (!o) return null
    const c = clonar(o)
    c.id = nuevoId()
    c.numero = `${o.numero}-B`
    c.estado = 'borrador'
    c.lineas.forEach((l) => (l.id = nuevoId()))
    estado.presupuestos.unshift(c)
    return c
  }
  function borrarPresupuesto(id) {
    const i = estado.presupuestos.findIndex((p) => p.id === id)
    if (i >= 0) estado.presupuestos.splice(i, 1)
  }
  function restaurarCatalogo() {
    estado.articulos = clonar(semilla.articulos)
    estado.precioHora = semilla.manoObra.precioHora
  }
  function restaurarTodo() {
    Object.assign(estado, estadoInicial())
  }
  return { estado, catalogo, crearPresupuesto, duplicarPresupuesto, borrarPresupuesto, restaurarCatalogo, restaurarTodo }
}
