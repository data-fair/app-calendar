<script setup>

</script>
<template>
  <v-btn
    v-tooltip="{
      text: 'Ajouter une contribution',
      location: 'left',
      openDelay:'500'
    }"
    density="default"
    class="elevation-5 bg-blue-darken-1 mt-2"
    :style="{
      position: 'absolute',
      right: '11em',
      fontSize:'20px'
    }"
    color="white"
    icon="mdi-calendar-plus"
    @click="addEventButton"
  />
</template>
