import useAppInfo from '@/composables/useAppInfo'
const { mainDataset, config } = useAppInfo()

export async function getSchema () {
  const url = `${mainDataset.href}/safe-schema?calculated=false&mimeType=application%2Fschema%2Bjson`
  const request = await fetch(url)
  const reponse = await request.json()
  const schema = { // vjsf form schema
    type: 'object',
    required: [],
    properties: {}
  }
  config.editionFields.forEach(field => {
    if (reponse.properties[field].title === '') reponse.properties[field].title = reponse.properties[field].key
    schema.properties[field] = reponse.properties[field]
  })
  return { schema }
}

export const formatDate = date => `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}` // get format like YYYY-MM-DD
export const formatHours = date => date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0') // get format like 'HH:MM'
