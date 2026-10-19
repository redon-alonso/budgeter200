<script setup>
// Borrado en dos pulsaciones (sin diálogos modales del navegador):
// el primer clic pide confirmación y se cancela solo a los 3 segundos.
import { ref, onBeforeUnmount } from 'vue'

defineProps({ mini: { type: Boolean, default: false }, texto: { type: String, default: 'Borrar' } })
const emit = defineEmits(['borrar'])
const confirmando = ref(false)
let temporizador

function pulsar() {
  if (confirmando.value) {
    clearTimeout(temporizador)
    confirmando.value = false
    emit('borrar')
    return
  }
  confirmando.value = true
  temporizador = setTimeout(() => (confirmando.value = false), 3000)
}
onBeforeUnmount(() => clearTimeout(temporizador))
</script>

<template>
  <button class="peligro" :class="{ mini, confirmar: confirmando }" @click="pulsar">
    {{ confirmando ? '¿Seguro?' : texto }}
  </button>
</template>
