<script setup>
import { displayError, errorMessage } from '../context'
</script>

<template>
  <v-snackbar
    v-model="displayError"
    :timeout="'5000'"
    color="red"
  >
    <div>
      {{ errorMessage }}
    </div>
  </v-snackbar>
</template>
