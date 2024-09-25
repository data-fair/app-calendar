<script setup>
import { errorMessage, displayError } from '@/messages'
import { ofetch } from 'ofetch'
import body from '../assets/contribs.json'

const mainDataset = window.APPLICATION?.configuration?.datasets?.[0]

if (mainDataset) {
  body.title = 'Contributions - ' + mainDataset.title
  body.attachmentsAsImage = mainDataset.attachmentsAsImage
}

const createContribsDataset = async () => {
  const params = { method: 'POST', body, headers: { 'x-organizationId': 'user' } }
  if (window.APPLICATION.owner.type === 'organization') {
    params.headers = { 'x-organizationId': window.APPLICATION.owner.id }
  }

  try {
    const d = await ofetch(window.APPLICATION.apiUrl + '/datasets', params)
    await ofetch(window.APPLICATION.apiUrl + '/datasets/' + d.id + '/permissions', {
      method: 'PUT',
      body: [{ type: window.APPLICATION.owner.type, id: window.APPLICATION.owner.id, name: window.APPLICATION.owner.name, department: '-', roles: ['contrib'], classes: ['write'], operations: ['delete'] },
        { type: window.APPLICATION.owner.type, id: window.APPLICATION.owner.id, name: window.APPLICATION.owner.name, department: '-', roles: ['contrib'], classes: ['list', 'read', 'readAdvanced'], operations: [] },
        { type: 'user', operations: ['sendUserNotification', 'readSafeSchema', 'downloadAttachment'], classes: ['manageOwnLines'], id: '*', name: '*', roles: [] }],
      headers: params.headers
    })
    if (window.parent) {
      window.parent.postMessage({
        type: 'set-config',
        content: { field: 'contribsDataset', value: { title: d.title, href: d.href, schema: d.schema, userPermissions: d.userPermissions } }
      }, '*')
    }
  } catch (e) {
    errorMessage.value = e.status + ' - ' + e._data
    displayError.value = true
  }
}
</script>

<template>
  <v-row
    justify="center"
    style="height:60%"
  >
    <v-col
      align-self="center"
      :cols="12"
      :sm="8"
      :md="6"
    >
      <v-card
        style="background-color: white;"
        variant="elevated"
        :elevation="8"
        class="pa-3"
      >
        <v-alert
          :model-value="true"
          type="info"
        >
          Voulez vous créer le jeu de données récupérant les contributions maintenant ?
          <br><br>
          <v-btn
            color="success"
            variant="outlined"
            @click="createContribsDataset"
          >
            Créeer le jeu de données des contributions
          </v-btn>
        </v-alert>
      </v-card>
    </v-col>
  </v-row>
</template>
