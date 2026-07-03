<script setup lang="ts">
import { ref, watch } from 'vue'
import { useUiNotif, type UiNotif } from '@data-fair/lib-vue/ui-notif.js'

const { notification } = useUiNotif()
const visible = ref(false)
const current = ref<UiNotif | null>(null)

watch(notification, (notif) => {
  if (!notif) return
  current.value = notif
  visible.value = true
})

const color = (notif: UiNotif | null) => {
  if (!notif) return 'error'
  if (notif.type === 'error') return notif.clientError ? 'warning' : 'error'
  return notif.type === 'default' ? undefined : notif.type
}
</script>

<template>
  <v-snackbar
    v-model="visible"
    variant="elevated"
    :timeout="5000"
    :color="color(current)"
  >
    <div>
      <div v-if="current?.msg">
        {{ current.msg }}
      </div>
      <div v-if="(current as any)?.errorMsg">
        {{ (current as any).errorMsg }}
      </div>
    </div>
  </v-snackbar>
</template>
