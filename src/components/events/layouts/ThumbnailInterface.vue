<script setup>
import useAppInfo from '@/composables/useAppInfo'
import Edit from './Edit.vue'
import Admin from './Admin.vue'
const { isRest, layout } = useAppInfo()
defineProps({
  selectedEvent: {
    type: Object,
    required: true
  }
})
const emit = defineEmits(['thumb-action'])
</script>
<template>
  <v-card
    max-width="1000"
  >
    <v-card-text
      class="pb-0 font"
    >
      <v-icon
        class="ma-1 mr-3 mb-2"
        :color="selectedEvent?.backgroundColor"
        icon="mdi-calendar"
      /><span class="text-h6">{{ selectedEvent.title }}</span>
      <div class="my-1">
        <span class="font-key">Debut : </span>{{ selectedEvent.start.toLocaleString() }}
      </div>
      <div
        v-if="selectedEvent.end"
        class="my-1"
      >
        <span class="font-key">Fin : </span>{{ selectedEvent.end.toLocaleString() }}
      </div>
      <div
        v-for="(value,key) in selectedEvent.extendedProps"
        :key="key"
        class="my-1"
      >
        <template v-if="key !== 'description'">
          <span class="font-key">{{ key }} :</span> {{ value }}
        </template>
      </div>
      <div v-if="selectedEvent.extendedProps?.description">
        <span class="font-key">Description : </span><span
          v-html="selectedEvent.extendedProps?.description"
        />
      </div>
    </v-card-text>
    <v-card-actions
      class="px-2 py-1"
      :style="{
        minHeight : '30px'
      }"
    >
      <v-btn
        density="default"
        @click="emit('thumb-action','close')"
      >
        Fermer
      </v-btn>
      <v-spacer />
      <admin
        v-if="isRest && layout==='admin'"
        @thumb-action="(op)=>emit('thumb-action',op,selectedEvent.id)"
      />
      <edit
        v-if="layout==='edit'"
        @thumb-action="(op)=>emit('thumb-action',op)"
      />
    </v-card-actions>
  </v-card>
</template>
<style>
.font{
  font-size: 0.95em;
}
.font-key{
  font-size: 1.1em;
  font-weight: 500;
  color :rgb(92, 85, 85)
}
</style>
