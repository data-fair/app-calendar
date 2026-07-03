<script setup lang="ts">
import { errorMessage, displayError } from '@/messages'
</script>

<template>
  <v-snackbar
    v-model="displayError"
    variant="elevated"
    :timeout="'5000'"
    color="red"
  >
    <div>
      {{ errorMessage }}
    </div>
  </v-snackbar>
</template>
