<script setup>
import { computed } from 'vue'
import { useRuta } from './composables/useRuta.js'
import { useDatos } from './composables/useDatos.js'
import VistaCatalogo from './components/VistaCatalogo.vue'
import VistaPresupuestos from './components/VistaPresupuestos.vue'
import EditorPresupuesto from './components/EditorPresupuesto.vue'
import VistaImpresion from './components/VistaImpresion.vue'

const { ruta, ir } = useRuta()
const { estado } = useDatos()

const presupuesto = computed(() => estado.presupuestos.find((p) => p.id === ruta.value.id) ?? null)
const enPresupuestos = computed(() => ['presupuestos', 'presupuesto'].includes(ruta.value.vista))
</script>

<template>
  <header class="cabecera no-imprimir">
    <div class="marca">
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="1.5" fill="none" stroke="currentColor" stroke-width="2" />
        <path d="M12 3v18M3 12h18" stroke="currentColor" stroke-width="1.5" />
      </svg>
      <strong>Presupuestos PVC</strong>
      <span class="chip">demo</span>
    </div>
    <nav>
      <a href="#/presupuestos" :class="{ activo: enPresupuestos }">Presupuestos</a>
      <a href="#/catalogo" :class="{ activo: ruta.vista === 'catalogo' }">Catálogo</a>
    </nav>
  </header>

  <main :class="{ impresion: ruta.sub === 'imprimir' }">
    <VistaCatalogo v-if="ruta.vista === 'catalogo'" />
    <template v-else-if="ruta.vista === 'presupuesto'">
      <template v-if="presupuesto">
        <VistaImpresion v-if="ruta.sub === 'imprimir'" :presupuesto="presupuesto" />
        <EditorPresupuesto v-else :presupuesto="presupuesto" />
      </template>
      <div v-else class="tarjeta">
        <p>Este presupuesto no existe o se ha borrado.</p>
        <button @click="ir('presupuestos')">Volver a la lista</button>
      </div>
    </template>
    <VistaPresupuestos v-else />
  </main>
</template>

<style scoped>
.cabecera {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; gap: 24px; flex-wrap: wrap;
  padding: 10px max(16px, calc((100% - 1280px) / 2));
  background: var(--superficie); border-bottom: 1px solid var(--borde);
}
.marca { display: flex; align-items: center; gap: 8px; color: var(--acento); }
.marca strong { color: var(--texto); }
nav { display: flex; gap: 4px; }
nav a {
  padding: 6px 12px; border-radius: 6px; text-decoration: none; color: var(--texto-2);
}
nav a:hover { background: var(--superficie-2); }
nav a.activo { background: var(--acento-suave); color: var(--acento); font-weight: 600; }
main { max-width: 1280px; margin: 0 auto; padding: 20px 16px 48px; }
main.impresion { max-width: 900px; }
@media print { main { padding: 0; max-width: none; } }
</style>
