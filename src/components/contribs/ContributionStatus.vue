<script setup>
defineProps({
  value: { type: String, required: true }
})

const labels = {
  submitted: 'Attente de validation',
  accepted: 'Acceptée',
  refused: 'Refusée'
}

const colors = {
  submitted: 'warning',
  accepted: 'success',
  refused: 'error'
}

</script>
<template>
  <v-chip
    density="compact"
    size="small"
    variant="flat"
    :color="colors[value]"
  >
    {{ labels[value] }}
  </v-chip>
</template>
