// Importación de artículos desde CSV o desde filas ya leídas de un Excel.
// Columnas reconocidas (en cualquier orden, sin importar mayúsculas ni tildes):
//   ref | nombre | familia | unidad | precio | merma | minimom2

const FAMILIAS_VALIDAS = ['perfil', 'refuerzo', 'vidrio', 'herraje', 'accesorio']
const UNIDADES_VALIDAS = ['ml', 'm2', 'ud']

const normalizar = (s) =>
  String(s ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// "1.234,56" → 1234.56 · "6,8" → 6.8 · "6.8" → 6.8
export function aNumero(valor) {
  if (typeof valor === 'number') return valor
  let s = String(valor ?? '').trim().replace(/[€\s]/g, '')
  if (s === '') return NaN
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  return Number(s)
}

// CSV sencillo con soporte de comillas. Detecta ";" (Excel en español) o ",".
export function parsearCSV(texto) {
  const limpio = texto.replace(/^﻿/, '')
  const primera = limpio.split(/\r?\n/, 1)[0]
  const sep = (primera.match(/;/g) || []).length >= (primera.match(/,/g) || []).length ? ';' : ','
  const filas = []
  let fila = [], campo = '', comillas = false
  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i]
    if (comillas) {
      if (c === '"' && limpio[i + 1] === '"') { campo += '"'; i++ }
      else if (c === '"') comillas = false
      else campo += c
    } else if (c === '"') comillas = true
    else if (c === sep) { fila.push(campo); campo = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && limpio[i + 1] === '\n') i++
      fila.push(campo); filas.push(fila); fila = []; campo = ''
    } else campo += c
  }
  if (campo !== '' || fila.length) { fila.push(campo); filas.push(fila) }
  return filas.filter((f) => f.some((v) => String(v).trim() !== ''))
}

// filas: array de arrays, la primera es la cabecera
export function filasAArticulos(filas) {
  const errores = []
  if (filas.length < 2) return { articulos: [], errores: ['El fichero no tiene filas de datos.'] }
  const cab = filas[0].map(normalizar)
  const col = (n) => cab.indexOf(n)
  for (const req of ['ref', 'nombre', 'familia', 'unidad', 'precio']) {
    if (col(req) === -1) errores.push(`Falta la columna obligatoria «${req}».`)
  }
  if (errores.length) return { articulos: [], errores }

  const articulos = []
  filas.slice(1).forEach((f, i) => {
    const n = i + 2 // número de fila tal como lo ve el usuario en Excel
    const ref = String(f[col('ref')] ?? '').trim()
    const familia = normalizar(f[col('familia')])
    const unidad = normalizar(f[col('unidad')]).replace('²', '2')
    const precio = aNumero(f[col('precio')])
    const merma = col('merma') >= 0 ? aNumero(f[col('merma')]) : 0
    const minimo = col('minimom2') >= 0 ? aNumero(f[col('minimom2')]) : NaN

    if (!ref) return errores.push(`Fila ${n}: falta la referencia.`)
    if (!FAMILIAS_VALIDAS.includes(familia)) return errores.push(`Fila ${n} (${ref}): familia «${familia}» no válida. Usa: ${FAMILIAS_VALIDAS.join(', ')}.`)
    if (!UNIDADES_VALIDAS.includes(unidad)) return errores.push(`Fila ${n} (${ref}): unidad «${unidad}» no válida. Usa: ${UNIDADES_VALIDAS.join(', ')}.`)
    if (!(precio >= 0)) return errores.push(`Fila ${n} (${ref}): precio no válido.`)

    const a = {
      ref, nombre: String(f[col('nombre')] ?? '').trim() || ref, familia, unidad,
      precio, merma: Number.isFinite(merma) ? merma : 0,
    }
    if (familia === 'vidrio') a.minimoM2 = Number.isFinite(minimo) ? minimo : 0.5
    articulos.push(a)
  })
  return { articulos, errores }
}

// Actualiza por referencia: las existentes cambian de precio y datos, las nuevas se añaden.
export function fusionarArticulos(actuales, nuevos) {
  const mapa = new Map(actuales.map((a) => [a.ref, a]))
  let actualizados = 0, anadidos = 0
  for (const n of nuevos) {
    if (mapa.has(n.ref)) { mapa.set(n.ref, { ...mapa.get(n.ref), ...n }); actualizados++ }
    else { mapa.set(n.ref, n); anadidos++ }
  }
  return { articulos: [...mapa.values()], actualizados, anadidos }
}

export function articulosACSV(articulos) {
  const esc = (v) => (/[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))
  const num = (v) => String(v ?? '').replace('.', ',')
  const lineas = ['ref;nombre;familia;unidad;precio;merma;minimom2']
  for (const a of articulos) {
    lineas.push([a.ref, a.nombre, a.familia, a.unidad, num(a.precio), num(a.merma ?? 0), num(a.minimoM2 ?? '')].map(esc).join(';'))
  }
  return '﻿' + lineas.join('\r\n')
}
