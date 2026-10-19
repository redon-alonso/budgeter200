# Presupuestos PVC — demo

Demo para presupuestar ventanas y puertas de PVC a partir del **despiece real**:
catálogo de artículos → configuración de la ventana → coste → beneficio, rebaja y margen → PDF para el cliente.

## Arrancar

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests del motor de cálculo y de la API
npm run build      # build de producción en dist/
```

Enlace directo al presupuesto de ejemplo: `#/presupuesto/demo`

## Publicar en Vercel

```bash
npm i -g vercel
vercel             # primera vez: vincula el proyecto
vercel --prod
```

O conecta el repositorio desde vercel.com: detecta Vite y las funciones de `api/` automáticamente.

## Estructura

| Ruta | Qué hace |
|---|---|
| `src/data/catalogo.json` | Catálogo precargado: artículos y precios de coste, series (geometría), tipologías, colores, datos de empresa |
| `src/core/despiece.js` | Motor de despiece: metros de perfil y refuerzo, m² de vidrio, herrajes, juntas, mano de obra |
| `src/core/precios.js` | Coste → tarifa (recargo) → rebaja → base → margen, rebaja máxima, simulaciones |
| `src/core/importar.js` | Importación/exportación CSV (formato español) y filas de Excel |
| `src/composables/useDatos.js` | Estado compartido y guardado en `localStorage` |
| `src/components/` | Vistas: lista, editor, configurador, panel de rentabilidad, catálogo, impresión |
| `api/` | Funciones serverless de Node: `GET /api/catalogo`, `POST /api/calcular` (mismo motor) |

## Modelo de cálculo

Para una ventana de ancho `A` × alto `H` (mm) y una serie con marco `m`, solape `s`, vista de hoja `v`:

- **Marco** y su refuerzo: perímetro `2·(A+H)`
- **Hoja** (practicable): `(A − 2m)/n + 2s` × `(H − 2m) + 2s` · corredera: suma además el cruce central
- **Vidrio**: hoja − 2·vista − 2·holgura, con mínimo facturable por paño
- **Merma** por artículo (desperdicio de corte), **suplemento de color** solo sobre el perfil
- **Mano de obra**: horas fijas por tipología + horas por m²

Precio: `tarifa = coste × (1 + recargo)` · `base = tarifa × (1 − rebaja)` · `margen = (base − coste) / base`

> El recargo se aplica sobre el coste; el margen se mide sobre la venta. Un 25 % de recargo es un 20 % de margen.

## Datos

Los cambios (precios, presupuestos) se guardan en el navegador de cada usuario. Para compartir datos
entre usuarios, sustituye `cargar()`/`guardar()` de `useDatos.js` por llamadas a una API con base de
datos (por ejemplo Vercel Postgres o Neon).
