import { test } from 'node:test'
import assert from 'node:assert/strict'
import calcular from '../api/calcular.js'
import catalogo from '../api/catalogo.js'

function llamar(handler, req) {
  const res = { code: 0, body: null, headers: {},
    status(c) { this.code = c; return this }, json(b) { this.body = b; return this },
    setHeader(k, v) { this.headers[k] = v } }
  handler(req, res)
  return res
}
const linea = { serieId: 's70', tipologiaId: 'oscilo1', ancho: 1000, alto: 1200, vidrioRef: 'V-4164-BE', colorId: 'blanco' }

test('GET /api/catalogo devuelve el catálogo', () => {
  const r = llamar(catalogo, { method: 'GET' })
  assert.equal(r.code, 200)
  assert.ok(r.body.articulos.length > 10)
})
test('POST /api/calcular con una línea devuelve el despiece', () => {
  const r = llamar(calcular, { method: 'POST', body: { linea } })
  assert.equal(r.code, 200)
  assert.ok(r.body.coste > 0)
})
test('POST /api/calcular con un presupuesto devuelve totales', () => {
  const r = llamar(calcular, { method: 'POST', body: JSON.stringify({ presupuesto: { beneficioPct: 40, lineas: [{ ...linea, cantidad: 2 }] } }) })
  assert.equal(r.code, 200)
  assert.equal(r.body.unidades, 2)
})
test('errores de entrada', () => {
  assert.equal(llamar(calcular, { method: 'GET' }).code, 405)
  assert.equal(llamar(calcular, { method: 'POST', body: '{roto' }).code, 400)
  assert.equal(llamar(calcular, { method: 'POST', body: { linea: { ...linea, ancho: 10 } } }).code, 422)
})
