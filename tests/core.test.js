import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { calcularDespiece, geometria, seriesCompatibles } from '../src/core/despiece.js'
import { calcularPresupuesto, descuentoMaximo, beneficioNecesario } from '../src/core/precios.js'
import { parsearCSV, filasAArticulos, fusionarArticulos, aNumero, articulosACSV } from '../src/core/importar.js'

const catalogo = JSON.parse(readFileSync(new URL('../src/data/catalogo.json', import.meta.url)))
const ventana = { serieId: 's70', tipologiaId: 'pract1', ancho: 1200, alto: 1200, vidrioRef: 'V-4164-BE', colorId: 'blanco' }
const cerca = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`)

test('geometría de una practicable de 1 hoja serie 70', () => {
  const s = catalogo.series.find((x) => x.id === 's70')
  const t = catalogo.tipologias.find((x) => x.id === 'pract1')
  const g = geometria(s, t, 1200, 1200)
  assert.equal(g.luzAncho, 1104)              // 1200 − 2·48
  assert.equal(g.hojas[0].ancho, 1120)        // 1104 + 2·8 de solape
  assert.equal(g.vidrios[0].ancho, 958)       // 1120 − 2·76 − 2·5
})

test('despiece: marco con merma y totales coherentes', () => {
  const d = calcularDespiece(catalogo, ventana)
  const marco = d.partidas.find((p) => p.ref === 'P70-MARCO')
  cerca(marco.cantidadNeta, 4.8)              // perímetro 2·(1,2+1,2)
  cerca(marco.cantidad, 5.28)                 // +10 % merma
  cerca(marco.importe, 35.9)
  const suma = d.partidas.reduce((s, p) => s + p.importe, 0)
  cerca(d.coste, suma)
  cerca(Object.values(d.porFamilia).reduce((a, b) => a + b, 0), d.coste)
})

test('el color foliado solo encarece el perfil', () => {
  const blanco = calcularDespiece(catalogo, ventana)
  const roble = calcularDespiece(catalogo, { ...ventana, colorId: 'roble' })
  cerca(roble.porFamilia.perfil, blanco.porFamilia.perfil * 1.35, 0.05)
  assert.equal(roble.porFamilia.vidrio, blanco.porFamilia.vidrio)
  assert.equal(roble.porFamilia.refuerzo, blanco.porFamilia.refuerzo)
})

test('2 hojas llevan inversora y vidrio mínimo facturable', () => {
  const d = calcularDespiece(catalogo, { ...ventana, tipologiaId: 'pract2', ancho: 600, alto: 600 })
  assert.ok(d.partidas.some((p) => p.ref === 'P70-INVERSORA'))
  const vidrio = d.partidas.find((p) => p.familia === 'vidrio')
  cerca(vidrio.cantidadNeta, 1.0)             // 2 paños pequeños × 0,5 m² mínimo
})

test('corredera: las hojas se cruzan en el centro', () => {
  const s = catalogo.series.find((x) => x.id === 'cor')
  const t = catalogo.tipologias.find((x) => x.id === 'corred2')
  const g = geometria(s, t, 2000, 1200)
  assert.ok(g.hojas[0].ancho * 2 > g.luzAncho)
  assert.deepEqual(seriesCompatibles(catalogo, 'corred2').map((x) => x.id), ['cor'])
})

test('medidas imposibles lanzan un error claro', () => {
  assert.throws(() => calcularDespiece(catalogo, { ...ventana, ancho: 100 }), /ancho/)
  assert.throws(() => calcularDespiece(catalogo, { ...ventana, tipologiaId: 'pract2', ancho: 400 }), /pequeñas/)
})

test('cadena de precio: beneficio, rebaja, margen e IVA', () => {
  const p = { beneficioPct: 25, descuentoPct: 10, ivaPct: 21, margenMinimoPct: 10,
    lineas: [{ id: 'a', ...ventana, cantidad: 2 }] }
  const r = calcularPresupuesto(catalogo, p)
  const coste = calcularDespiece(catalogo, ventana).coste * 2
  cerca(r.coste, coste)
  cerca(r.tarifa, coste * 1.25)
  cerca(r.base, coste * 1.25 * 0.9)
  cerca(r.margenPct, ((1.125 - 1) / 1.125) * 100)  // 11,1 %
  cerca(r.total, r.base * 1.21)
})

test('una línea errónea no tumba el presupuesto', () => {
  const p = { beneficioPct: 30, descuentoPct: 0, ivaPct: 21, margenMinimoPct: 10,
    lineas: [{ id: 'a', ...ventana, cantidad: 1 }, { id: 'b', ...ventana, ancho: 50, cantidad: 1 }] }
  const r = calcularPresupuesto(catalogo, p)
  assert.equal(r.lineas[1].ok, false)
  assert.equal(r.unidades, 1)
})

test('rebaja máxima deja exactamente el margen mínimo', () => {
  const coste = 100, tarifa = 140
  const d = descuentoMaximo(coste, tarifa, 15)
  const base = tarifa * (1 - d / 100)
  cerca((base - coste) / base, 0.15, 1e-9)
  cerca(beneficioNecesario(20, 0), 25)       // 20 % margen = 25 % recargo
})

test('importación CSV en formato español', () => {
  const csv = '﻿Ref;Nombre;Familia;Unidad;Precio;Merma\nP70-MARCO;Marco;Perfil;ml;"7,25";10\nNUEVO;Manilla inox;herraje;ud;12,5;\nMALO;x;cosa;ml;1;0\n'
  const { articulos, errores } = filasAArticulos(parsearCSV(csv))
  assert.equal(articulos.length, 2)
  assert.equal(errores.length, 1)
  assert.match(errores[0], /Fila 4/)
  const f = fusionarArticulos(catalogo.articulos, articulos)
  assert.equal(f.actualizados, 1)
  assert.equal(f.anadidos, 1)
  assert.equal(f.articulos.find((a) => a.ref === 'P70-MARCO').precio, 7.25)
  assert.equal(aNumero('1.234,56'), 1234.56)
  // ida y vuelta: exportar y volver a importar da lo mismo
  const vuelta = filasAArticulos(parsearCSV(articulosACSV(catalogo.articulos)))
  assert.equal(vuelta.errores.length, 0)
  assert.equal(vuelta.articulos.length, catalogo.articulos.length)
})
